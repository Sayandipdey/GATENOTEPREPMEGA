import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { jsonOk, jsonError } from "@/lib/helpers";
import { MEGA_URL_PREFIX, NOTE_TYPES } from "@notes/shared";
import type { NoteFileType } from "@notes/shared";

interface ImportRowInput {
  subject: string;
  category?: string;
  folderPath?: string;
  title: string;
  kind?: "file" | "image";
  type?: string;
  link: string;
  caption?: string;
  isPublished?: boolean;
}

interface ImportRowResult {
  row: number;
  title: string;
  subject: string;
  folderPath: string;
  kind: string;
  status: "ok" | "warning" | "error";
  message?: string;
}

function inferType(title: string, rawType?: string): NoteFileType {
  if (rawType && NOTE_TYPES.includes(rawType.toLowerCase() as any)) {
    return rawType.toLowerCase() as NoteFileType;
  }
  const lower = title.toLowerCase();
  if (lower.endsWith(".pdf") || lower.includes("pdf")) return "pdf";
  if (lower.endsWith(".ppt") || lower.endsWith(".pptx") || lower.includes("ppt") || lower.includes("slide")) return "ppt";
  if (lower.endsWith(".doc") || lower.endsWith(".docx") || lower.includes("doc")) return "doc";
  return "pdf";
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") {
      return jsonError("Unauthorized", 401);
    }

    const body = await req.json();
    const rows: ImportRowInput[] = body?.rows;
    const dryRun: boolean = Boolean(body?.dryRun);
    const skipDuplicates: boolean = Boolean(body?.skipDuplicates ?? true);

    if (!Array.isArray(rows) || rows.length === 0) {
      return jsonError("rows array is required and must not be empty", 400);
    }

    if (rows.length > 5000) {
      return jsonError("Maximum 5000 rows allowed per import session", 400);
    }

    // Load existing subjects and folders
    const existingSubjects = await db.subjects.list(false);
    const subjectMap = new Map<string, string>(); // lowercase name -> id
    existingSubjects.forEach((s) => subjectMap.set(s.name.trim().toLowerCase(), s.id));

    // Cache existing folders: subjectId + path -> folderId
    const folderCache = new Map<string, string>();

    // Pre-populate folders
    for (const sub of existingSubjects) {
      const folders = await db.folders.listBySubject(sub.id);
      const folderMap = new Map(folders.map((f) => [f.id, f]));
      folders.forEach((f) => {
        // Build path
        let curr = f;
        const parts = [curr.name.trim().toLowerCase()];
        while (curr.parentId && folderMap.has(curr.parentId)) {
          curr = folderMap.get(curr.parentId)!;
          parts.unshift(curr.name.trim().toLowerCase());
        }
        folderCache.set(`${sub.id}:${parts.join("/")}`, f.id);
      });
    }

    // Check existing item titles to detect duplicates
    const existingItemKeys = new Set<string>();
    for (const sub of existingSubjects) {
      const items = await db.items.listBySubject(sub.id, false);
      items.forEach((it) => {
        existingItemKeys.add(`${sub.id}:${it.title.trim().toLowerCase()}`);
      });
    }

    const results: ImportRowResult[] = [];
    let createdSubjects = 0;
    let createdFolders = 0;
    let createdItems = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (let i = 0; i < rows.length; i++) {
      const rowNum = i + 1;
      const r = rows[i];

      const rawSubject = (r.subject || "").trim();
      const rawTitle = (r.title || "").trim();
      const rawLink = (r.link || "").trim();
      const kind = r.kind === "image" ? "image" : "file";
      const folderPath = (r.folderPath || "").trim();
      const category = (r.category || "Core").trim();

      if (!rawSubject || !rawTitle || !rawLink) {
        errorCount++;
        results.push({
          row: rowNum,
          title: rawTitle || "Untitled",
          subject: rawSubject || "Missing",
          folderPath,
          kind,
          status: "error",
          message: "Subject, Title, and Link are required",
        });
        continue;
      }

      // Validate link format
      if (kind === "file") {
        if (!rawLink.startsWith(MEGA_URL_PREFIX)) {
          errorCount++;
          results.push({
            row: rowNum,
            title: rawTitle,
            subject: rawSubject,
            folderPath,
            kind,
            status: "error",
            message: `MEGA link must start with ${MEGA_URL_PREFIX}`,
          });
          continue;
        }
      } else {
        if (!rawLink.startsWith("http://") && !rawLink.startsWith("https://") && !rawLink.startsWith("/")) {
          errorCount++;
          results.push({
            row: rowNum,
            title: rawTitle,
            subject: rawSubject,
            folderPath,
            kind,
            status: "error",
            message: "Image link must be a valid URL",
          });
          continue;
        }
      }

      // Check duplicate
      const subKey = rawSubject.toLowerCase();
      let subjectId = subjectMap.get(subKey);

      if (subjectId && skipDuplicates && existingItemKeys.has(`${subjectId}:${rawTitle.toLowerCase()}`)) {
        skippedCount++;
        results.push({
          row: rowNum,
          title: rawTitle,
          subject: rawSubject,
          folderPath,
          kind,
          status: "warning",
          message: "Duplicate note title in subject (skipped)",
        });
        continue;
      }

      if (!dryRun) {
        // 1. Auto-create subject if not present
        if (!subjectId) {
          const newSub = await db.subjects.create({
            name: rawSubject,
            category: category || "Core",
            description: `GATE exam preparation materials for ${rawSubject}`,
            order: existingSubjects.length + createdSubjects,
            isPublished: true,
          });
          subjectId = newSub.id;
          subjectMap.set(subKey, subjectId);
          createdSubjects++;
        }

        // 2. Resolve or auto-create nested folder path (e.g. "Unit 1/Fourier Series")
        let currentFolderId: string | null = null;
        if (folderPath) {
          const segments = folderPath.split("/").map((s) => s.trim()).filter(Boolean);
          let accumulatedPath = "";

          for (let segIdx = 0; segIdx < segments.length; segIdx++) {
            const seg = segments[segIdx];
            accumulatedPath = accumulatedPath ? `${accumulatedPath}/${seg.toLowerCase()}` : seg.toLowerCase();
            const cacheKey = `${subjectId}:${accumulatedPath}`;

            if (folderCache.has(cacheKey)) {
              currentFolderId = folderCache.get(cacheKey)!;
            } else {
              const newFolder = await db.folders.create({
                subjectId,
                parentId: currentFolderId,
                name: seg,
                order: segIdx,
              });
              currentFolderId = newFolder.id;
              folderCache.set(cacheKey, newFolder.id);
              createdFolders++;
            }
          }
        }

        // 3. Create Item
        await db.items.create({
          subjectId,
          folderId: currentFolderId,
          kind,
          title: rawTitle,
          type: kind === "file" ? inferType(rawTitle, r.type) : undefined,
          megaFileLink: kind === "file" ? rawLink : undefined,
          imageUrl: kind === "image" ? rawLink : undefined,
          caption: r.caption || "",
          order: createdItems,
          isPublished: r.isPublished ?? true,
        });

        existingItemKeys.add(`${subjectId}:${rawTitle.toLowerCase()}`);
        createdItems++;
      } else {
        createdItems++;
      }

      results.push({
        row: rowNum,
        title: rawTitle,
        subject: rawSubject,
        folderPath,
        kind,
        status: "ok",
        message: dryRun ? "Ready to import" : "Imported successfully",
      });
    }

    return jsonOk({
      dryRun,
      summary: {
        totalRows: rows.length,
        createdItems,
        createdSubjects,
        createdFolders,
        skippedCount,
        errorCount,
      },
      results,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to execute bulk import";
    return jsonError(message, 500);
  }
}

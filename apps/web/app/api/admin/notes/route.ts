import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, jsonOk, jsonError } from "@/lib/helpers";
import { NoteCreateSchema } from "@notes/shared";

/**
 * POST /api/admin/notes
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    requireAdmin(req);

    const body = await req.json();
    const parsed = NoteCreateSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "Invalid note data", 400);
    }

    const data = parsed.data;

    // Check subject exists
    const subject = await db.subjects.get(data.subjectId);
    if (!subject) {
      return jsonError("Subject does not exist", 404);
    }

    const note = await db.notes.create(data);
    return jsonOk(note, 201);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create note";
    const status = (err as { status?: number }).status ?? 500;
    return jsonError(message, status);
  }
}

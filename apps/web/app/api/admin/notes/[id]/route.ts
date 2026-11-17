import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin, jsonOk, jsonError } from "@/lib/helpers";
import { NOTE_TYPES } from "@notes/shared";

// Manual partial schema to avoid .partial() on ZodEffects (superRefine)
const NoteUpdateSchema = z.object({
  subjectId: z.string().optional(),
  folderId: z.string().nullable().optional(),
  kind: z.enum(["file", "image"]).optional(),
  title: z.string().optional(),
  type: z.enum(NOTE_TYPES).optional(),
  megaFileLink: z.string().optional(),
  imageUrl: z.string().optional(),
  description: z.string().optional(),
  isPublished: z.boolean().optional(),
});

/**
 * GET /api/admin/notes/[id]
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    requireAdmin(req);
    const { id } = params;

    const note = await db.notes.get(id);
    if (!note) {
      return jsonError("Note not found", 404);
    }

    return jsonOk(note);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch note";
    const status = (err as { status?: number }).status ?? 500;
    return jsonError(message, status);
  }
}

/**
 * PUT /api/admin/notes/[id]
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    requireAdmin(req);
    const { id } = params;

    const body = await req.json();
    const parsed = NoteUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "Invalid update data", 400);
    }

    const updated = await db.notes.update(id, parsed.data);
    if (!updated) {
      return jsonError("Note not found", 404);
    }

    return jsonOk(updated);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update note";
    const status = (err as { status?: number }).status ?? 500;
    return jsonError(message, status);
  }
}

/**
 * DELETE /api/admin/notes/[id]
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    requireAdmin(req);
    const { id } = params;

    const deleted = await db.notes.delete(id);
    if (!deleted) {
      return jsonError("Note not found", 404);
    }

    return jsonOk({ deleted: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete note";
    const status = (err as { status?: number }).status ?? 500;
    return jsonError(message, status);
  }
}

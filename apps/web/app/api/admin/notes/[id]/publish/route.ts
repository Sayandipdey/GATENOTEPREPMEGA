import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, jsonOk, jsonError } from "@/lib/helpers";

/**
 * POST /api/admin/notes/[id]/publish
 */
export async function POST(
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

    const nextPublished = !note.isPublished;
    await db.notes.update(id, { isPublished: nextPublished });

    return jsonOk({ id, isPublished: nextPublished });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to toggle publish status";
    const status = (err as { status?: number }).status ?? 500;
    return jsonError(message, status);
  }
}

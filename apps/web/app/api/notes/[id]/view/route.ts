import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserIdFromRequest, jsonOk, jsonError } from "@/lib/helpers";

/**
 * POST /api/notes/[id]/view
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const userId = getUserIdFromRequest(req);
    const { id: noteId } = params;

    await db.notes.incrementView(noteId, userId);

    return jsonOk({ viewed: true, timestamp: new Date().toISOString() });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to record view";
    return jsonError(message, 500);
  }
}

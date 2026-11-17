import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserIdFromRequest, jsonOk, jsonError } from "@/lib/helpers";

/**
 * GET /api/subjects/[id]
 * Returns subject details, its nested folders, and items in one roundtrip.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    getUserIdFromRequest(req);
    const { id } = params;

    const subject = await db.subjects.get(id);
    if (!subject || !subject.isPublished) {
      return jsonError("Subject not found", 404);
    }

    const folders = await db.folders.listBySubject(id);
    const items = await db.items.listBySubject(id, true);

    return jsonOk({
      ...subject,
      folders,
      items,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch subject";
    return jsonError(message, 500);
  }
}

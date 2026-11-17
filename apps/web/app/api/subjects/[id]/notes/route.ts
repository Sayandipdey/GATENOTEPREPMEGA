import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserIdFromRequest, jsonOk, jsonError } from "@/lib/helpers";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/subjects/[id]/notes
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    getUserIdFromRequest(req);
    const { id } = params;

    const notes = await db.notes.listBySubject(id, true);
    return jsonOk(notes);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch notes";
    return jsonError(message, 500);
  }
}

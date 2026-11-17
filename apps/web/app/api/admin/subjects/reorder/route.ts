import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, jsonOk, jsonError, revalidateAllNotes } from "@/lib/helpers";

/**
 * POST /api/admin/subjects/reorder
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    requireAdmin(req);

    const body = await req.json();
    const ids = body?.ids;

    if (!Array.isArray(ids)) {
      return jsonError("ids must be an array of subject IDs", 400);
    }

    await db.subjects.reorder(ids);
    revalidateAllNotes();
    return jsonOk({ reordered: true, count: ids.length });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to reorder subjects";
    const status = (err as { status?: number }).status ?? 500;
    return jsonError(message, status);
  }
}

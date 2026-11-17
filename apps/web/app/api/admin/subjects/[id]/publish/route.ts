import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, jsonOk, jsonError } from "@/lib/helpers";

/**
 * POST /api/admin/subjects/[id]/publish
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    requireAdmin(req);
    const { id } = params;

    const subject = await db.subjects.get(id);
    if (!subject) {
      return jsonError("Subject not found", 404);
    }

    const nextPublished = !subject.isPublished;
    await db.subjects.update(id, { isPublished: nextPublished });

    return jsonOk({ id, isPublished: nextPublished });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to toggle publish status";
    const status = (err as { status?: number }).status ?? 500;
    return jsonError(message, status);
  }
}

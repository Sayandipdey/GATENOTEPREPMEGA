import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, jsonOk, jsonError, revalidateAllNotes } from "@/lib/helpers";
import { SubjectCreateSchema } from "@notes/shared";

/**
 * GET /api/admin/subjects/[id]
 */
export async function GET(
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

    return jsonOk(subject);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch subject";
    const status = (err as { status?: number }).status ?? 500;
    return jsonError(message, status);
  }
}

/**
 * PUT /api/admin/subjects/[id]
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    requireAdmin(req);
    const { id } = params;

    const body = await req.json();
    const parsed = SubjectCreateSchema.partial().safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "Invalid update data", 400);
    }

    const updated = await db.subjects.update(id, parsed.data);
    if (!updated) {
      return jsonError("Subject not found", 404);
    }

    revalidateAllNotes(id);
    return jsonOk(updated);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update subject";
    const status = (err as { status?: number }).status ?? 500;
    return jsonError(message, status);
  }
}

/**
 * DELETE /api/admin/subjects/[id]
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    requireAdmin(req);
    const { id } = params;

    const deleted = await db.subjects.delete(id);
    if (!deleted) {
      return jsonError("Subject not found", 404);
    }

    revalidateAllNotes(id);
    return jsonOk({ deleted: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete subject";
    const status = (err as { status?: number }).status ?? 500;
    return jsonError(message, status);
  }
}

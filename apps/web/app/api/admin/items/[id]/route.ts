import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { jsonOk, jsonError, revalidateAllNotes } from "@/lib/helpers";

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") {
      return jsonError("Unauthorized", 401);
    }

    const { id } = params;
    const body = await req.json();
    const updated = await db.items.update(id, body);
    if (!updated) {
      return jsonError("Item not found", 404);
    }
    revalidateAllNotes(updated.subjectId);
    return jsonOk(updated);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update item";
    return jsonError(message, 500);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") {
      return jsonError("Unauthorized", 401);
    }

    const { id } = params;
    const existing = await db.items.get(id);
    const deleted = await db.items.delete(id);
    if (!deleted) {
      return jsonError("Item not found", 404);
    }
    revalidateAllNotes(existing?.subjectId);
    return jsonOk({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete item";
    return jsonError(message, 500);
  }
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { jsonOk, jsonError, revalidateAllNotes } from "@/lib/helpers";

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") {
      return jsonError("Unauthorized", 401);
    }

    const { ids, folderId } = await req.json();
    if (!Array.isArray(ids)) {
      return jsonError("ids array is required", 400);
    }

    // If folderId is passed, also move them to this folder
    if (folderId !== undefined) {
      for (const id of ids) {
        await db.items.update(id, { folderId: folderId || null });
      }
    }

    await db.items.reorder(ids);
    revalidateAllNotes();
    return jsonOk({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to reorder items";
    return jsonError(message, 500);
  }
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { jsonOk, jsonError } from "@/lib/helpers";

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") {
      return jsonError("Unauthorized", 401);
    }

    const { ids } = await req.json();
    if (!Array.isArray(ids)) {
      return jsonError("ids array is required", 400);
    }

    await db.folders.reorder(ids);
    return jsonOk({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to reorder folders";
    return jsonError(message, 500);
  }
}

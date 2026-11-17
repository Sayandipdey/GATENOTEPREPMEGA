import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { FolderCreateSchema } from "@notes/shared";
import { getCurrentUser } from "@/lib/current-user";
import { jsonOk, jsonError } from "@/lib/helpers";

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") {
      return jsonError("Unauthorized", 401);
    }

    const body = await req.json();
    const parsed = FolderCreateSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.errors[0]?.message || "Invalid folder input", 400);
    }

    const folder = await db.folders.create(parsed.data);
    return jsonOk(folder, 201);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create folder";
    return jsonError(message, 500);
  }
}

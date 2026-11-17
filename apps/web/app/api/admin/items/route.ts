import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ItemCreateSchema } from "@notes/shared";
import { getCurrentUser } from "@/lib/current-user";
import { jsonOk, jsonError } from "@/lib/helpers";

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") {
      return jsonError("Unauthorized", 401);
    }

    const body = await req.json();
    const parsed = ItemCreateSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.errors[0]?.message || "Invalid item input", 400);
    }

    const item = await db.items.create(parsed.data as any);
    return jsonOk(item, 201);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create item";
    return jsonError(message, 500);
  }
}

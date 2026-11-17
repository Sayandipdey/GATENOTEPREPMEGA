import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserIdFromRequest, jsonOk, jsonError } from "@/lib/helpers";

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const userId = getUserIdFromRequest(req);
    const recentItems = await db.recent.list(userId);
    return jsonOk(recentItems);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch recent items";
    return jsonError(message, 500);
  }
}

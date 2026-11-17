import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserIdFromRequest, jsonOk, jsonError } from "@/lib/helpers";

/**
 * GET /api/recent
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const userId = getUserIdFromRequest(req);
    const notes = await db.recent.list(userId, 20);
    return jsonOk(notes);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch recent notes";
    return jsonError(message, 500);
  }
}

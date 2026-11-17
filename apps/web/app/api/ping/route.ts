import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserIdFromRequest, jsonOk, jsonError } from "@/lib/helpers";

/**
 * POST /api/ping
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const userId = getUserIdFromRequest(req);
    const now = new Date().toISOString();
    await db.users.update(userId, { lastSeen: now });
    return jsonOk({ timestamp: now });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update presence.";
    return jsonError(message, 500);
  }
}

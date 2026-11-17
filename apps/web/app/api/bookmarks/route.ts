import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserIdFromRequest, jsonOk, jsonError } from "@/lib/helpers";

/**
 * GET /api/bookmarks
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const userId = getUserIdFromRequest(req);
    const items = await db.bookmarks.list(userId);
    return jsonOk(items);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch bookmarks";
    return jsonError(message, 500);
  }
}

/**
 * POST /api/bookmarks
 * Body: { itemId?: string, noteId?: string, action?: "add" | "remove" }
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const userId = getUserIdFromRequest(req);
    const body = await req.json();
    const id = body.itemId || body.noteId;
    const action = body.action;

    if (!id) {
      return jsonError("itemId or noteId is required", 400);
    }

    const bookmarked = await db.bookmarks.toggle(userId, id, action);
    return jsonOk({ bookmarked });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update bookmark";
    return jsonError(message, 500);
  }
}

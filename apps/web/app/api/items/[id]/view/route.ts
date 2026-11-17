import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserIdFromRequest, jsonOk, jsonError } from "@/lib/helpers";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    let userId: string | undefined;
    try {
      userId = getUserIdFromRequest(req);
    } catch {
      // unauthenticated view is fine
    }

    const { id } = params;
    await db.items.incrementView(id, userId);
    return jsonOk({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to increment view";
    return jsonError(message, 500);
  }
}

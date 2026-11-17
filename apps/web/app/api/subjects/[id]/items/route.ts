import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserIdFromRequest, jsonOk, jsonError } from "@/lib/helpers";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    getUserIdFromRequest(req);
    const { id } = params;
    const items = await db.items.listBySubject(id, true);
    return jsonOk(items);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch items";
    return jsonError(message, 500);
  }
}

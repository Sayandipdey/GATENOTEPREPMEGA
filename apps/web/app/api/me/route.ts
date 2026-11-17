import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserIdFromRequest, jsonOk, jsonError } from "@/lib/helpers";

/**
 * GET /api/me
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  let userId: string;
  try {
    userId = getUserIdFromRequest(req);
  } catch {
    return jsonError("Unauthorized.", 401);
  }

  const user = await db.users.get(userId);
  if (!user) {
    return jsonError("User not found.", 404);
  }

  return jsonOk({
    id: user.id,
    name: user.name,
    role: user.role,
    email: user.email,
    phone: user.phone,
    createdAt: user.createdAt,
    lastSeen: user.lastSeen,
  });
}

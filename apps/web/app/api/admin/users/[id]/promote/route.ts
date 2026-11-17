import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, jsonOk, jsonError } from "@/lib/helpers";

/**
 * POST /api/admin/users/[id]/promote
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    requireAdmin(req);
    const { id } = params;

    const updated = await db.users.update(id, { role: "admin" });
    if (!updated) {
      return jsonError("User not found", 404);
    }

    return jsonOk({ id, role: "admin" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to promote user";
    const status = (err as { status?: number }).status ?? 500;
    return jsonError(message, status);
  }
}

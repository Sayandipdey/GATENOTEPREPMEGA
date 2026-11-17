import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, jsonOk, jsonError } from "@/lib/helpers";

/**
 * POST /api/admin/users/[id]/disable
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    requireAdmin(req);
    const { id } = params;

    const body = await req.json();
    const disable = Boolean(body?.disable);

    const updated = await db.users.update(id, { isDisabled: disable });
    if (!updated) {
      return jsonError("User not found", 404);
    }

    return jsonOk({ id, isDisabled: disable });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to toggle user status";
    const status = (err as { status?: number }).status ?? 500;
    return jsonError(message, status);
  }
}

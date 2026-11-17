import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, jsonOk, jsonError } from "@/lib/helpers";
import type { User } from "@notes/shared";

/**
 * GET /api/admin/users
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    requireAdmin(req);

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.toLowerCase().trim();

    let users = await db.users.list();

    if (search) {
      users = users.filter((u) => {
        const nameMatch = u.name.toLowerCase().includes(search);
        const emailMatch = u.email?.toLowerCase().includes(search);
        const phoneMatch = u.phone?.toLowerCase().includes(search);
        return nameMatch || emailMatch || phoneMatch;
      });
    }

    return jsonOk(users);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch users";
    const status = (err as { status?: number }).status ?? 500;
    return jsonError(message, status);
  }
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { jsonOk, jsonError } from "@/lib/helpers";

/**
 * GET /api/admin/allowed-users
 */
export async function GET(): Promise<NextResponse> {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") {
      return jsonError("Unauthorized", 401);
    }

    const list = await db.allowedUsers.list();
    return jsonOk(list);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch allowed users";
    return jsonError(message, 500);
  }
}

/**
 * POST /api/admin/allowed-users
 * Accepts:
 *  { identifier: string, notes?: string } for single add
 *  OR { identifiers: string[] } for bulk/CSV paste
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") {
      return jsonError("Unauthorized", 401);
    }

    const body = await req.json();

    if (Array.isArray(body?.identifiers)) {
      const result = await db.allowedUsers.addBulk(body.identifiers, user.identifier || "admin");
      return jsonOk(result);
    }

    if (!body?.identifier) {
      return jsonError("Identifier (email or phone) is required.", 400);
    }

    const record = await db.allowedUsers.add(
      body.identifier,
      user.identifier || "admin",
      body.notes || ""
    );
    return jsonOk(record, 201);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to add allowed user";
    return jsonError(message, 500);
  }
}

/**
 * DELETE /api/admin/allowed-users
 * Accepts { identifier: string }
 */
export async function DELETE(req: NextRequest): Promise<NextResponse> {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") {
      return jsonError("Unauthorized", 401);
    }

    const { searchParams } = new URL(req.url);
    const identifier = searchParams.get("identifier");

    if (!identifier) {
      return jsonError("Identifier is required", 400);
    }

    const deleted = await db.allowedUsers.remove(identifier);
    if (!deleted) {
      return jsonError("Identifier not found in allowlist", 404);
    }

    return jsonOk({ deleted: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to remove allowed user";
    return jsonError(message, 500);
  }
}

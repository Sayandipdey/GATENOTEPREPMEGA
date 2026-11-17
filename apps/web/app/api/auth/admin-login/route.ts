import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { signSession, setSessionCookie } from "@/lib/session";
import { jsonOk, jsonError } from "@/lib/helpers";

/**
 * POST /api/auth/admin-login
 * Direct credential-based authentication for platform administrators.
 * Credentials requested by user:
 * Admin: note@admin
 * Password: Sayandip@123
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    const { identifier, password } = body as { identifier?: string; password?: string };

    if (!identifier || !password) {
      return jsonError("Identifier and password are required.", 400);
    }

    const cleanIdentifier = identifier.trim().toLowerCase();
    const expectedUser = (process.env.ADMIN_USERNAME ?? "note@admin").toLowerCase().trim();
    const expectedPassword = process.env.ADMIN_PASSWORD ?? "Sayandip@123";

    const isMatch =
      (cleanIdentifier === expectedUser || cleanIdentifier === "note@admin") &&
      password === expectedPassword;

    if (!isMatch) {
      return jsonError("Invalid admin credentials. Please try again.", 401);
    }

    // Ensure admin user exists in DB
    const adminId = "admin_master";
    let user = await db.users.get(adminId);
    const now = new Date().toISOString();

    if (!user) {
      user = {
        id: adminId,
        name: "Platform Administrator",
        email: "note@admin",
        role: "admin",
        createdAt: now,
        lastSeen: now,
        isDisabled: false,
      };
      await db.users.set(adminId, user);
    } else {
      await db.users.update(adminId, { lastSeen: now, role: "admin", isDisabled: false });
    }

    // Sign admin session token
    const token = await signSession({
      userId: adminId,
      role: "admin",
      identifier: "note@admin",
    });

    const response = NextResponse.json(
      {
        success: true,
        token,
        user: {
          id: adminId,
          name: user.name,
          role: "admin",
          identifier: "note@admin",
        },
      },
      { status: 200 }
    );

    setSessionCookie(response, token);
    return response;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Authentication error.";
    return jsonError(msg, 500);
  }
}

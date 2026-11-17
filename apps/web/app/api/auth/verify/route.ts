/**
 * @file app/api/auth/verify/route.ts
 * @description Verifies user authentication.
 * Supports:
 *  1. Phone.email user_json_url (Sign in with Email or Phone) with swappable AuthProvider
 *  2. Brevo transactional email OTP code verification
 *  3. Direct mobile/email input (for local development fallback)
 *  4. Private-use mode (SIGNUP_MODE=allowlist) checking allowedUsers
 *  5. Daily OTP usage counter
 *
 * Upserts the user in the database, signs a JWT session (30-day lifetime),
 * and issues an httpOnly cookie + returns the mobile token.
 */

import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { db } from "@/lib/db";
import { getAuthProvider, BrevoEmailOtpProvider } from "@/lib/auth-provider";
import { signSession, setSessionCookie } from "@/lib/session";
import { rateLimitAuth } from "@/lib/rate-limit";
import { jsonError } from "@/lib/helpers";
import { UserJsonUrlSchema } from "@notes/shared";
import type { User, SessionPayload } from "@notes/shared";

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "127.0.0.1"
  );
}

function hashIdentifier(identifier: string): string {
  return createHash("sha256").update(identifier.toLowerCase().trim()).digest("hex");
}

function isAdminIdentifier(identifier: string): boolean {
  const raw = process.env.ADMIN_IDENTIFIERS ?? "";
  const list = raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(identifier.toLowerCase().trim());
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  // 1. Parse and validate body
  let body: any;
  try {
    body = await req.json();
  } catch {
    return jsonError("Request body must be valid JSON.", 400);
  }

  // Rate limit auth attempts per IP
  const ip = getClientIp(req);
  const rl = await rateLimitAuth(ip);
  if (!rl.success) {
    return jsonError("Too many authentication requests. Please wait before retrying.", 429);
  }

  let identifier = "";
  let name = "";
  let email: string | undefined;
  let phone: string | undefined;
  let verificationMethod: "email" | "phone" | "brevo" = "phone";

  const userJsonUrl = body?.user_json_url ?? body?.userJsonUrl;
  const method = (body?.method === "email" ? "email" : "phone") as "email" | "phone";

  // Case A: Phone.email verification URL provided
  if (userJsonUrl) {
    const parsedUrl = UserJsonUrlSchema.safeParse(userJsonUrl);
    if (!parsedUrl.success) {
      return jsonError(
        `Invalid user_json_url: ${parsedUrl.error.issues[0]?.message ?? "Expected https://user.phone.email/..."}`,
        400
      );
    }

    try {
      const provider = getAuthProvider();
      const verifiedProfile = await provider.verifyPhoneEmail(parsedUrl.data, method);
      identifier = verifiedProfile.identifier;
      name = verifiedProfile.name;
      email = verifiedProfile.email;
      phone = verifiedProfile.phone;
      verificationMethod = verifiedProfile.mode;
    } catch (err: unknown) {
      return jsonError(
        `Phone.email verification failed: ${err instanceof Error ? err.message : "Unknown error"}`,
        400
      );
    }
  }
  // Case B: Email OTP code verification (email + 6-digit code)
  // Always uses BrevoEmailOtpProvider which works in dev (console) and prod (Brevo API)
  else if (body?.code && body?.email) {
    const emailOtpProvider = new BrevoEmailOtpProvider();
    const verifyResult = await emailOtpProvider.verifyEmailOtp(body.email, body.code);
    if (!verifyResult.success || !verifyResult.profile) {
      return jsonError(verifyResult.error || "Invalid verification code.", 400);
    }

    identifier = verifyResult.profile.identifier;
    name = verifyResult.profile.name;
    email = verifyResult.profile.email;
    verificationMethod = "brevo";
  }
  // Case C: Direct Mobile Number input (fallback / local testing)
  else if (body?.phone) {
    let cleanPhone = String(body.phone).trim().replace(/[\s-]/g, "");
    if (!cleanPhone.startsWith("+")) {
      cleanPhone = cleanPhone.length === 10 ? `+91${cleanPhone}` : `+${cleanPhone}`;
    }
    if (cleanPhone.length < 9) {
      return jsonError("Please enter a valid mobile phone number with country code.", 400);
    }

    identifier = cleanPhone;
    phone = cleanPhone;
    name = body?.name || `User ${cleanPhone.slice(-4)}`;
    verificationMethod = "phone";
  }
  // Case D: Direct Email input (fallback / local testing)
  else if (body?.email) {
    const cleanEmail = String(body.email).trim().toLowerCase();
    if (!cleanEmail.includes("@") || !cleanEmail.includes(".")) {
      return jsonError("Please enter a valid email address.", 400);
    }

    identifier = cleanEmail;
    email = cleanEmail;
    name = body?.name || cleanEmail.split("@")[0];
    verificationMethod = "email";
  } else {
    return jsonError(
      "Missing login credential. Please provide a user_json_url, mobile number, or email.",
      400
    );
  }

  // 2. Private-use mode check (SIGNUP_MODE=open|allowlist, default: allowlist)
  const signupMode = (process.env.SIGNUP_MODE || "allowlist").trim().toLowerCase();
  const isAdmin = isAdminIdentifier(identifier);

  if (signupMode === "allowlist" && !isAdmin) {
    const isAllowed = await db.allowedUsers.isAllowed(identifier);
    if (!isAllowed) {
      return jsonError("Ask the admin for access", 403);
    }
  }

  // 3. Record OTP verification count for daily usage stats
  await db.otpUsage.record(verificationMethod);

  // 4. Derive stable user ID from identifier
  const userId = hashIdentifier(identifier);
  const now = new Date().toISOString();

  // 5. Upsert User in database
  let user = await db.users.get(userId);

  if (!user) {
    const role = isAdmin ? "admin" : "user";
    user = {
      id: userId,
      name: name || identifier,
      email,
      phone,
      role,
      createdAt: now,
      lastSeen: now,
      isDisabled: false,
    };
    await db.users.set(userId, user);
  } else {
    if (user.isDisabled) {
      return jsonError("Your account has been disabled. Please contact an administrator.", 403);
    }

    const updates: Partial<User> = {
      lastSeen: now,
      name: name || user.name,
      ...(email ? { email } : {}),
      ...(phone ? { phone } : {}),
    };

    if (isAdmin && user.role !== "admin") {
      updates.role = "admin";
    }

    user = (await db.users.update(userId, updates)) || user;
  }

  if (user.isDisabled) {
    return jsonError("Your account has been disabled.", 403);
  }

  // 6. Sign JWT session
  const sessionPayload: SessionPayload = {
    userId: user.id,
    role: user.role,
    identifier,
  };
  const token = await signSession(sessionPayload);

  // 7. Return response with session cookie and mobile token
  const response = NextResponse.json(
    {
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        identifier,
      },
    },
    { status: 200 }
  );

  setSessionCookie(response, token);
  return response;
}

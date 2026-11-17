/**
 * @file session.ts
 * @description Server-only JWT session helpers using the `jose` library.
 *
 * Sessions are stored as signed JWTs in an HTTP-only cookie.  The same token
 * is also returned in the API response body so mobile clients can store it
 * in secure storage without needing cookie access.
 *
 * IMPORTANT: Never import this module in client components.
 */

import { SignJWT, jwtVerify } from "jose";
import { type NextRequest, type NextResponse } from "next/server";
import { COOKIE_NAME, SESSION_DURATION_SECONDS } from "@notes/shared";
import type { SessionPayload } from "@notes/shared";

// ---------------------------------------------------------------------------
// Key helpers
// ---------------------------------------------------------------------------

/**
 * Returns the HMAC secret derived from the JWT_SECRET environment variable.
 *
 * @throws {Error} if JWT_SECRET is not set or is too short (< 32 chars).
 */
function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "JWT_SECRET environment variable is missing or shorter than 32 characters."
    );
  }
  return new TextEncoder().encode(secret);
}

// ---------------------------------------------------------------------------
// Sign / Verify
// ---------------------------------------------------------------------------

/**
 * Signs a session payload as an HS256 JWT that expires in 30 days.
 *
 * @param payload - The {@link SessionPayload} to embed in the token.
 * @returns The compact serialised JWT string.
 */
export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(getSecret());
}

/**
 * Verifies a JWT and returns the decoded {@link SessionPayload}, or `null` if
 * the token is missing, expired, or has an invalid signature.
 *
 * @param token - The compact serialised JWT to verify.
 */
export async function verifySession(
  token: string
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      algorithms: ["HS256"],
    });

    // Validate required fields are present and have the right shape.
    const { userId, role, identifier } = payload as Record<string, unknown>;
    if (
      typeof userId !== "string" ||
      typeof role !== "string" ||
      typeof identifier !== "string"
    ) {
      return null;
    }
    if (role !== "user" && role !== "admin") {
      return null;
    }

    return { userId, role, identifier } satisfies SessionPayload;
  } catch {
    // Any verification error (expired, bad signature, malformed) → null.
    return null;
  }
}

// ---------------------------------------------------------------------------
// Cookie helpers
// ---------------------------------------------------------------------------

/**
 * Attaches the session JWT as an HTTP-only cookie to the given `NextResponse`.
 *
 * Cookie attributes:
 * - `HttpOnly` — not accessible via `document.cookie`
 * - `Secure` — sent only over HTTPS
 * - `SameSite=Lax` — protects against most CSRF while allowing top-level nav
 * - `Path=/` — available for all routes
 * - `Max-Age` — matches the JWT expiry (30 days)
 *
 * @param response - The `NextResponse` to attach the cookie to.
 * @param token    - The signed JWT string.
 */
export function setSessionCookie(response: NextResponse, token: string): void {
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });
}

/**
 * Clears the session cookie by setting it to an empty value with `Max-Age=0`.
 *
 * @param response - The `NextResponse` to clear the cookie on.
 */
export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

/**
 * Reads the session cookie from an incoming `NextRequest` and verifies it.
 *
 * @param request - The incoming `NextRequest`.
 * @returns The decoded {@link SessionPayload}, or `null` if absent / invalid.
 */
export async function getSessionFromRequest(
  request: NextRequest
): Promise<SessionPayload | null> {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySession(token);
}

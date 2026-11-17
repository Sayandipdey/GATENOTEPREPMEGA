import { cookies, headers } from "next/headers";
import { COOKIE_NAME } from "@notes/shared";
import { verifySession } from "./session";
import type { SessionPayload } from "@notes/shared";

/**
 * Server-side helper: reads the session cookie or Authorization Bearer header,
 * and returns the payload, or null if unauthenticated.
 */
export async function getCurrentUser(): Promise<SessionPayload | null> {
  try {
    const headerList = await headers();
    const xUserId = headerList.get("x-user-id");
    const xRole = headerList.get("x-user-role");
    const xIdentifier = headerList.get("x-user-identifier");
    if (xUserId && xRole && xIdentifier) {
      return {
        userId: xUserId,
        role: xRole as "user" | "admin",
        identifier: xIdentifier,
      };
    }

    const cookieStore = await cookies();
    let token = cookieStore.get(COOKIE_NAME)?.value;

    if (!token) {
      const authHeader = headerList.get("authorization") || headerList.get("Authorization");
      if (authHeader?.startsWith("Bearer ")) {
        token = authHeader.substring(7).trim();
      }
    }

    if (!token) return null;
    return await verifySession(token);
  } catch {
    return null;
  }
}

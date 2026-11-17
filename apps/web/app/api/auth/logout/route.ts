/**
 * @file app/api/auth/logout/route.ts
 * @description Clears the session cookie, effectively logging the user out.
 *
 * POST /api/auth/logout
 * No request body required.  Returns `{ success: true }`.
 */

import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/session";

/** POST /api/auth/logout */
export async function POST(): Promise<NextResponse> {
  const response = NextResponse.json({ success: true }, { status: 200 });
  clearSessionCookie(response);
  return response;
}

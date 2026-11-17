/**
 * @file helpers.ts
 * @description Utility functions shared across Route Handlers in apps/web.
 *
 * These helpers read the headers that the Edge middleware attaches to every
 * forwarded request (`x-user-id`, `x-user-role`), so individual Route
 * Handlers do not need to re-verify the JWT themselves.
 */

import { NextResponse, type NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Header readers
// ---------------------------------------------------------------------------

/**
 * Returns the authenticated user's ID from the `x-user-id` header set by
 * the Edge middleware.
 *
 * @param req - The incoming `NextRequest` or standard `Request`.
 * @throws {Error} with HTTP 401 semantics if the header is absent.
 */
export function getUserIdFromRequest(req: NextRequest | Request): string {
  const userId = req.headers.get("x-user-id");
  if (!userId) {
    throw Object.assign(new Error("Unauthorized: missing x-user-id header."), {
      status: 401,
    });
  }
  return userId;
}

/**
 * Returns the authenticated user's role from the `x-user-role` header set by
 * the Edge middleware.
 *
 * @param req - The incoming `NextRequest` or standard `Request`.
 * @throws {Error} with HTTP 401 semantics if the header is absent.
 */
export function getRoleFromRequest(req: NextRequest | Request): string {
  const role = req.headers.get("x-user-role");
  if (!role) {
    throw Object.assign(new Error("Unauthorized: missing x-user-role header."), {
      status: 401,
    });
  }
  return role;
}

// ---------------------------------------------------------------------------
// Response factories
// ---------------------------------------------------------------------------

/**
 * Creates a JSON success response with the shape `{ success: true, data: T }`.
 *
 * @param data   - The payload to include under the `data` key.
 * @param status - HTTP status code (default: 200).
 */
export function jsonOk<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ success: true, data }, { status });
}

/**
 * Creates a JSON error response with the shape `{ success: false, error: string }`.
 *
 * @param message - Human-readable error description.
 * @param status  - HTTP status code (default: 400).
 */
export function jsonError(message: string, status = 400): NextResponse {
  return NextResponse.json({ success: false, error: message }, { status });
}

// ---------------------------------------------------------------------------
// Auth guards
// ---------------------------------------------------------------------------

/**
 * Throws a 403 error if the request's role is not `"admin"`.
 *
 * This is a defence-in-depth check: the Edge middleware already blocks
 * non-admins from reaching `/api/admin/*` routes, but individual Route
 * Handlers can call this for extra safety.
 *
 * @param req - The incoming `Request`.
 * @throws {Error} with `status: 403` if the caller is not an admin.
 */
export function requireAdmin(req: Request): void {
  const role = req.headers.get("x-user-role");
  if (role !== "admin") {
    throw Object.assign(
      new Error("Forbidden: admin role required."),
      { status: 403 }
    );
  }
}

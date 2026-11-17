import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { jsonOk, jsonError } from "@/lib/helpers";

/**
 * GET /api/admin/otp-logs
 * Returns recent OTP requests with plain codes for manual administrator dispatch.
 */
export async function GET(): Promise<NextResponse> {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") {
      return jsonError("Unauthorized", 401);
    }

    const logs = await db.otpLogs.list(100);
    return jsonOk(logs);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch OTP logs";
    return jsonError(message, 500);
  }
}

/**
 * DELETE /api/admin/otp-logs
 * Clears old OTP logs
 */
export async function DELETE(): Promise<NextResponse> {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") {
      return jsonError("Unauthorized", 401);
    }

    await db.otpLogs.clear();
    return jsonOk({ message: "OTP logs cleared successfully" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to clear OTP logs";
    return jsonError(message, 500);
  }
}

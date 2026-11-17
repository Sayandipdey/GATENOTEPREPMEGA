/**
 * POST /api/auth/otp/send
 * Sends a 6-digit email OTP.
 * Works in dev mode (no Brevo key) by printing the code to the server console.
 * In production, requires BREVO_API_KEY and AUTH_PROVIDER=email-otp-brevo.
 */
import { NextRequest, NextResponse } from "next/server";
import { BrevoEmailOtpProvider } from "@/lib/auth-provider";
import { rateLimitAuth } from "@/lib/rate-limit";
import { jsonOk, jsonError } from "@/lib/helpers";

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "127.0.0.1"
  );
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const ip = getClientIp(req);
    const rl = await rateLimitAuth(ip);
    if (!rl.success) {
      return jsonError("Too many requests. Please wait before retrying.", 429);
    }

    const body = await req.json();
    const email = body?.email ? String(body.email).trim().toLowerCase() : "";

    if (!email || !email.includes("@") || !email.includes(".")) {
      return jsonError("Please provide a valid email address.", 400);
    }

    // Always use BrevoEmailOtpProvider for OTP send — works in dev (console log)
    // and in prod (Brevo transactional email) when BREVO_API_KEY is set.
    const provider = new BrevoEmailOtpProvider();
    const result = await provider.sendEmailOtp(email);

    if (!result.success) {
      return jsonError(result.message || "Failed to send verification code.", 429);
    }

    return jsonOk({ message: result.message || "Passcode sent successfully." });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to send OTP";
    return jsonError(message, 500);
  }
}

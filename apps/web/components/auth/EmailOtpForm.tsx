/**
 * EmailOtpForm — Self-contained Email OTP sign-in flow
 * =====================================================
 * Step 1: User enters email → POST /api/auth/otp/send
 * Step 2: User enters 6-digit code → POST /api/auth/verify (email + code)
 *
 * Works without any external client ID. Needs AUTH_PROVIDER=email-otp-brevo
 * on the server (or dev-mode fallback with code printed to server console).
 */
"use client";

import { useState, useRef } from "react";
import { Spinner } from "@/components/ui/Spinner";

interface EmailOtpFormProps {
  /** Called with the verified session data after successful auth */
  onVerified: (auth?: { token?: string; user?: any }) => void;
  onError: (msg: string) => void;
}

export function EmailOtpForm({ onVerified, onError }: EmailOtpFormProps) {
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startCooldown = () => {
    setResendCooldown(60);
    cooldownRef.current = setInterval(() => {
      setResendCooldown((s) => {
        if (s <= 1) {
          clearInterval(cooldownRef.current!);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  };

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    const trimmed = email.trim().toLowerCase();
    if (!trimmed.includes("@") || !trimmed.includes(".")) {
      setLocalError("Please enter a valid email address.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error ?? "Failed to send code.");
      }
      setInfoMessage(data.data?.message || data.message || null);
      setStep("code");
      startCooldown();
    } catch (err: unknown) {
      setLocalError(err instanceof Error ? err.message : "Failed to send code.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    if (code.trim().length !== 6) {
      setLocalError("Enter the 6-digit code from your email.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), code: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error ?? "Verification failed.");
      }
      onVerified({ token: data.token, user: data.user });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Verification failed.";
      setLocalError(msg);
      onError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setLocalError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error ?? "Failed to resend code.");
      }
      setCode("");
      startCooldown();
    } catch (err: unknown) {
      setLocalError(err instanceof Error ? err.message : "Failed to resend.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Local error */}
      {localError && (
        <div className="w-full px-3 py-2.5 bg-red-950/60 border border-red-800 rounded-lg text-xs font-mono text-red-300 text-center">
          {localError}
        </div>
      )}

      {/* ── Step 1: Enter email ─────────────────────────── */}
      {step === "email" && (
        <form onSubmit={handleSendCode} className="w-full space-y-3 font-mono text-xs">
          <div>
            <label className="block text-gray-400 mb-1 font-semibold uppercase text-[10px]">
              Your Email Address
            </label>
            <input
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-3.5 py-2.5 bg-gray-950 border border-gray-700 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-xs"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Spinner size={16} /> Sending code...
              </>
            ) : (
              "Send 6-digit code →"
            )}
          </button>
          <p className="text-[10px] text-gray-500 text-center">
            One-time passcode is issued and logged directly in the Admin Console.
          </p>
        </form>
      )}

      {/* ── Step 2: Enter code ──────────────────────────── */}
      {step === "code" && (
        <form onSubmit={handleVerify} className="w-full space-y-3 font-mono text-xs">
          {/* Info banner */}
          <div className="p-3 bg-indigo-950/40 border border-indigo-800/80 rounded-lg">
            <p className="text-indigo-200 text-[11px] text-center font-medium">
              Passcode requested for <strong>{email}</strong>
            </p>
            <p className="text-indigo-400/90 text-[10px] text-center mt-1 leading-normal">
              {infoMessage || "Valid for 10 minutes. The administrator can view your 6-digit code in the Admin Panel."}
            </p>
          </div>

          {/* Code input */}
          <div>
            <label className="block text-gray-400 mb-1 font-semibold uppercase text-[10px]">
              6-Digit Passcode
            </label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="000000"
              className="w-full px-3.5 py-3 bg-gray-950 border border-indigo-500 rounded-lg text-white text-center tracking-[0.4em] text-xl font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Verify button */}
          <button
            type="submit"
            disabled={loading || code.length < 6}
            className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Spinner size={16} /> Verifying...
              </>
            ) : (
              "Verify & Sign In →"
            )}
          </button>

          {/* Back + Resend row */}
          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={() => {
                setStep("email");
                setCode("");
                setLocalError(null);
              }}
              className="text-[10px] text-gray-500 hover:text-gray-300 transition-colors"
            >
              ← Change email
            </button>
            <button
              type="button"
              onClick={handleResend}
              disabled={resendCooldown > 0 || loading}
              className="text-[10px] text-indigo-400 hover:text-indigo-300 disabled:text-gray-600 transition-colors"
            >
              {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

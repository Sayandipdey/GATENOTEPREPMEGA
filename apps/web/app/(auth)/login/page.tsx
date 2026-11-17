"use client";

import { useState, useCallback } from "react";
import { PhoneEmailButton } from "@/components/auth/PhoneEmailButton";
import { EmailOtpForm } from "@/components/auth/EmailOtpForm";
import { Spinner } from "@/components/ui/Spinner";
import { Card, CardBody } from "@/components/ui/Card";
import { useRouter } from "next/navigation";

type AuthMode = "email" | "phone" | "admin";

export default function LoginPage() {
  const router = useRouter();

  // Top-level mode: student (email/phone tabs) vs admin
  const [authMode, setAuthMode] = useState<AuthMode>("phone");

  // Per-method loading / error state
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Admin credential state
  const [adminUser, setAdminUser] = useState("note@admin");
  const [adminPass, setAdminPass] = useState("");
  const [adminLoading, setAdminLoading] = useState(false);

  // Client IDs from env — only needed for the Phone tab (Phone.email widget)
  const phoneClientId =
    process.env.NEXT_PUBLIC_PHONE_EMAIL_PHONE_CLIENT_ID ?? "";

  // Called by PhoneEmailButton after the widget returns a user_json_url
  const handleVerify = useCallback(
    async (userJsonUrl: string, method: "email" | "phone") => {
      setVerifying(true);
      setError(null);
      try {
        const res = await fetch("/api/auth/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_json_url: userJsonUrl, method }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error ?? "Verification failed.");
        }
        router.push("/");
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Verification failed.");
        setVerifying(false);
      }
    },
    [router]
  );

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: adminUser.trim(),
          password: adminPass,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error ?? "Invalid admin credentials.");
      }
      router.push("/admin");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed.");
      setAdminLoading(false);
    }
  };

  const isStudentMode = authMode === "email" || authMode === "phone";

  return (
    <main className="min-h-screen bg-gray-950 flex items-center justify-center px-4 py-8">
      <Card className="w-full max-w-md border-gray-800 bg-gray-900/90 shadow-2xl">
        <CardBody className="flex flex-col items-center gap-6 py-8 px-6">
          {/* Logo */}
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/30">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-7 w-7"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
          </div>

          {/* Title */}
          <div className="text-center">
            <h1 className="text-xl font-bold tracking-tight text-gray-100">
              GATE Notes Platform
            </h1>
            <p className="mt-1 text-xs text-gray-400">
              Access curated GATE exam notes — sign in to continue
            </p>
          </div>

          {/* Top-level tab switcher: Student vs Admin */}
          <div className="flex p-1 bg-gray-950 border border-gray-800 rounded-xl w-full text-xs font-mono">
            <button
              type="button"
              onClick={() => {
                setAuthMode("phone");
                setError(null);
              }}
              className={`flex-1 py-2 rounded-lg font-medium transition-all ${
                isStudentMode
                  ? "bg-indigo-600 text-white shadow"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Student Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode("admin");
                setError(null);
              }}
              className={`flex-1 py-2 rounded-lg font-medium transition-all ${
                authMode === "admin"
                  ? "bg-purple-600 text-white shadow"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Admin Portal
            </button>
          </div>

          {/* Error banner */}
          {error && (
            <div className="w-full px-4 py-2.5 bg-red-950/60 border border-red-800 rounded-lg text-xs font-mono text-red-300 text-center">
              {error}
            </div>
          )}

          {/* ── STUDENT SIGN IN ───────────────────────────────────────── */}
          {isStudentMode && (
            <div className="w-full flex flex-col gap-4">
              {/* Email / Phone sub-tabs */}
              <div className="flex p-1 bg-gray-950 border border-gray-800 rounded-xl w-full text-xs font-mono">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("email");
                    setError(null);
                  }}
                  className={`flex-1 py-1.5 rounded-lg font-medium transition-all ${
                    authMode === "email"
                      ? "bg-gray-700 text-white"
                      : "text-gray-500 hover:text-gray-200"
                  }`}
                >
                  ✉ Email OTP
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("phone");
                    setError(null);
                  }}
                  className={`flex-1 py-1.5 rounded-lg font-medium transition-all ${
                    authMode === "phone"
                      ? "bg-gray-700 text-white"
                      : "text-gray-500 hover:text-gray-200"
                  }`}
                >
                  📱 Phone OTP
                </button>
              </div>

              {authMode === "email" && (
                <EmailOtpForm
                  onVerified={() => router.push("/")}
                  onError={(msg) => setError(msg)}
                />
              )}

              {authMode === "phone" && (
                <>
                  {verifying ? (
                    <div className="flex flex-col items-center gap-3 py-6">
                      <Spinner size={32} className="text-indigo-500" />
                      <p className="text-xs text-gray-400 font-mono">
                        Verifying with server...
                      </p>
                    </div>
                  ) : (
                    <PhoneEmailButton
                      mode="phone"
                      clientId={phoneClientId}
                      onVerify={(url) => handleVerify(url, "phone")}
                    />
                  )}
                </>
              )}

              <p className="text-[10px] text-gray-600 text-center font-mono">
                By signing in you agree to our terms of service.
                {process.env.NEXT_PUBLIC_SIGNUP_MODE === "allowlist" && (
                  <span className="block mt-0.5 text-amber-500/80">
                    This platform is invite-only. Contact the admin for access.
                  </span>
                )}
              </p>
            </div>
          )}

          {/* ── ADMIN PORTAL ─────────────────────────────────────────── */}
          {authMode === "admin" && (
            <form
              onSubmit={handleAdminLogin}
              className="w-full space-y-4 font-mono text-xs"
            >
              <div>
                <label className="block text-gray-400 mb-1 font-semibold uppercase text-[10px]">
                  Admin Identifier
                </label>
                <input
                  type="text"
                  required
                  value={adminUser}
                  onChange={(e) => setAdminUser(e.target.value)}
                  placeholder="note@admin"
                  className="w-full px-3.5 py-2.5 bg-gray-950 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-purple-500 font-mono text-xs"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-gray-400 font-semibold uppercase text-[10px]">
                    Admin Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setAdminUser("note@admin");
                      setAdminPass("Sayandip@123");
                    }}
                    className="text-[10px] text-purple-400 hover:text-purple-300 underline"
                  >
                    Use Demo credentials
                  </button>
                </div>
                <input
                  type="password"
                  required
                  value={adminPass}
                  onChange={(e) => setAdminPass(e.target.value)}
                  placeholder="Enter admin password"
                  className="w-full px-3.5 py-2.5 bg-gray-950 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-purple-500 font-mono text-xs"
                />
              </div>

              <button
                type="submit"
                disabled={adminLoading}
                className="w-full py-2.5 px-4 bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg shadow-purple-600/20 disabled:opacity-50"
              >
                {adminLoading ? (
                  <>
                    <Spinner size={16} /> Authenticating...
                  </>
                ) : (
                  "Sign In to Admin Panel →"
                )}
              </button>

              <p className="text-[10px] text-gray-500 text-center pt-1">
                Authorized administrators only. Activity is logged.
              </p>
            </form>
          )}

          <p className="text-[11px] text-gray-600 text-center font-mono pt-2">
            GATE Notes Platform • Secured by phone.email
          </p>
        </CardBody>
      </Card>
    </main>
  );
}

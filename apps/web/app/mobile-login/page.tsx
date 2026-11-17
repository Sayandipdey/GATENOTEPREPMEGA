"use client";

import { useState } from "react";
import { PhoneEmailButton } from "@/components/auth/PhoneEmailButton";
import { EmailOtpForm } from "@/components/auth/EmailOtpForm";
import { Spinner } from "@/components/ui/Spinner";

declare global {
  interface Window {
    ReactNativeWebView?: {
      postMessage: (message: string) => void;
    };
  }
}

export default function MobileLoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"phone" | "email">("phone");

  const phoneClientId =
    process.env.NEXT_PUBLIC_PHONE_EMAIL_PHONE_CLIENT_ID ?? "";

  const handleLoginSuccess = (token?: string, user?: unknown) => {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(
        JSON.stringify({ type: "AUTH_SUCCESS", token, user })
      );
    } else {
      window.location.href = "/";
    }
  };

  const handleVerify = async (userJsonUrl: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_json_url: userJsonUrl, method: "phone" }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error ?? "Verification failed.");
      }
      handleLoginSuccess(data.token, data.user);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Authentication error");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-2xl flex flex-col items-center text-center">
        <div className="w-12 h-12 bg-indigo-600/20 text-indigo-400 rounded-xl flex items-center justify-center font-bold text-xl mb-3">
          NP
        </div>
        <h1 className="text-xl font-semibold tracking-tight text-white mb-1">
          GATE Notes Platform
        </h1>
        <p className="text-xs text-gray-400 mb-5">
          Sign in to sync your study notes across devices
        </p>

        {/* Email / Phone sub-tabs */}
        <div className="flex p-1 bg-gray-950 border border-gray-800 rounded-xl w-full text-xs font-mono mb-4">
          <button
            type="button"
            onClick={() => {
              setMode("phone");
              setError(null);
            }}
            className={`flex-1 py-1.5 rounded-lg font-medium transition-all ${
              mode === "phone"
                ? "bg-indigo-600 text-white"
                : "text-gray-500 hover:text-gray-200"
            }`}
          >
            📱 Phone
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("email");
              setError(null);
            }}
            className={`flex-1 py-1.5 rounded-lg font-medium transition-all ${
              mode === "email"
                ? "bg-indigo-600 text-white"
                : "text-gray-500 hover:text-gray-200"
            }`}
          >
            ✉ Email
          </button>
        </div>

        {error && (
          <div className="w-full p-2.5 mb-4 bg-red-950/60 border border-red-800 rounded-lg text-xs font-mono text-red-300">
            {error}
          </div>
        )}

        {mode === "email" ? (
          <div className="w-full text-left">
            <EmailOtpForm
              onVerified={(auth) => handleLoginSuccess(auth?.token, auth?.user)}
              onError={(msg) => setError(msg)}
            />
          </div>
        ) : loading ? (
          <div className="py-8 flex flex-col items-center gap-3">
            <Spinner className="w-8 h-8 text-indigo-500" />
            <p className="text-xs text-gray-400 font-mono">
              Authenticating session...
            </p>
          </div>
        ) : (
          <div className="w-full">
            <PhoneEmailButton
              mode="phone"
              clientId={phoneClientId}
              onVerify={handleVerify}
            />
          </div>
        )}

        <p className="text-[10px] text-gray-500 mt-5 font-mono">
          Secure Authentication • MEGA Cloud Integration
        </p>
      </div>
    </div>
  );
}

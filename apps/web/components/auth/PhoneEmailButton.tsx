/**
 * PhoneEmailButton — Official Phone.email widget wrapper
 * =========================================================
 * Props:
 *   mode       "email" | "phone"   — which Phone.email widget to mount
 *   clientId   string              — the NEXT_PUBLIC_PHONE_EMAIL_*_CLIENT_ID
 *   onVerify   (url) => void       — called with user_json_url on success
 */
"use client";

import { useEffect, useRef } from "react";

interface PhoneEmailButtonProps {
  mode: "email" | "phone";
  clientId: string;
  onVerify: (userJsonUrl: string) => void;
}

declare global {
  interface Window {
    phoneEmailReceiver?: (userJsonUrl: string) => void;
    phoneEmailListener?: (userObj: { user_json_url: string }) => void;
  }
}

export function PhoneEmailButton({
  mode,
  clientId,
  onVerify,
}: PhoneEmailButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scriptMounted = useRef(false);

  useEffect(() => {
    // Register the correct global callback for each mode
    if (mode === "email") {
      window.phoneEmailReceiver = (userJsonUrl: string) => {
        onVerify(userJsonUrl);
      };
    } else {
      window.phoneEmailListener = (userObj: { user_json_url: string }) => {
        onVerify(userObj.user_json_url);
      };
    }

    // Inject the widget div into our container
    if (containerRef.current && clientId) {
      containerRef.current.innerHTML = "";
      const widgetDiv = document.createElement("div");
      widgetDiv.className = "pe_signin_button";
      widgetDiv.setAttribute("data-client-id", clientId);
      containerRef.current.appendChild(widgetDiv);
    }

    // Load the Phone.email script once globally
    if (!scriptMounted.current && clientId) {
      scriptMounted.current = true;
      const scriptId = "pe-script-v1";
      if (!document.getElementById(scriptId)) {
        const script = document.createElement("script");
        script.id = scriptId;
        script.src = "https://www.phone.email/sign_in_button_v1.js";
        script.async = true;
        document.body.appendChild(script);
      }
    }

    return () => {
      if (mode === "email") delete window.phoneEmailReceiver;
      else delete window.phoneEmailListener;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, clientId]);

  if (!clientId) {
    return (
      <div className="w-full px-4 py-3 bg-yellow-950/40 border border-yellow-800/60 rounded-lg text-yellow-300 text-xs font-mono text-center">
        ⚠ No client ID configured for {mode} sign-in.
        <br />
        <span className="text-yellow-400/70">
          Set{" "}
          {mode === "email"
            ? "NEXT_PUBLIC_PHONE_EMAIL_EMAIL_CLIENT_ID"
            : "NEXT_PUBLIC_PHONE_EMAIL_PHONE_CLIENT_ID"}{" "}
          in your .env.local
        </span>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col items-center gap-3">
      {/* Phone.email widget mounts here */}
      <div ref={containerRef} className="flex items-center justify-center" />
      <p className="text-[10px] text-gray-500 font-mono text-center">
        Powered by{" "}
        <a
          href="https://www.phone.email"
          target="_blank"
          rel="noreferrer"
          className="text-indigo-400 hover:underline"
        >
          phone.email
        </a>{" "}
        — secure OTP verification
      </p>
    </div>
  );
}

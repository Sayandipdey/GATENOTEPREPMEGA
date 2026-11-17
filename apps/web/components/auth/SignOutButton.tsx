"use client";

import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { useState } from "react";

export function SignOutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await apiClient.post("/api/auth/logout");
    } catch {
      // Ignore errors — clear session anyway
    }
    router.push("/login");
  };

  return (
    <button
      onClick={handleSignOut}
      disabled={loading}
      className="px-3 py-1.5 text-sm rounded-md border border-gray-700 text-gray-400 hover:text-gray-100 hover:bg-gray-800 transition-colors disabled:opacity-50"
    >
      {loading ? "Signing out…" : "Sign out"}
    </button>
  );
}

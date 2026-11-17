"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";

interface MegaLinkCheckerProps {
  url: string;
}

export function MegaLinkChecker({ url }: MegaLinkCheckerProps) {
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<{
    valid: boolean;
    message: string;
    linkType?: string;
  } | null>(null);

  const handleCheck = async () => {
    if (!url.trim()) return;
    setChecking(true);
    setResult(null);

    try {
      const res = await fetch(`/api/admin/link-check?url=${encodeURIComponent(url.trim())}`);
      const data = await res.json();
      if (data.success && data.data) {
        setResult(data.data);
      } else {
        setResult({
          valid: false,
          message: data.error || "Failed to check link",
        });
      }
    } catch {
      setResult({
        valid: false,
        message: "Network error checking link",
      });
    } finally {
      setChecking(false);
    }
  };

  if (!url.trim()) return null;

  return (
    <div className="flex flex-col gap-2 mt-2">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          onClick={handleCheck}
          variant="secondary"
          size="sm"
          disabled={checking}
        >
          {checking ? (
            <span className="flex items-center gap-1.5">
              <Spinner className="w-3.5 h-3.5" /> Checking...
            </span>
          ) : (
            "Check MEGA Link"
          )}
        </Button>

        {result && (
          <span
            className={`text-xs px-2.5 py-1 rounded-full font-medium ${
              result.valid
                ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                : "bg-red-950 text-red-300 border border-red-800"
            }`}
          >
            {result.valid ? `✓ Valid ${result.linkType ?? ""} link` : "✕ Invalid link"}
          </span>
        )}
      </div>

      {result && !result.valid && (
        <p className="text-xs text-red-400">{result.message}</p>
      )}
    </div>
  );
}

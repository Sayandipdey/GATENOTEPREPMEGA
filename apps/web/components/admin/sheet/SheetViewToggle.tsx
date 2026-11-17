"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

interface SheetViewToggleProps {
  subjectId: string;
}

export function SheetViewToggle({ subjectId }: SheetViewToggleProps) {
  const router = useRouter();
  const pathname = usePathname();
  const isSheet = pathname.endsWith("/sheet");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Remember current view
    localStorage.setItem("admin_subject_view_mode", isSheet ? "sheet" : "explorer");
  }, [isSheet]);

  const handleToggle = (targetMode: "explorer" | "sheet") => {
    localStorage.setItem("admin_subject_view_mode", targetMode);
    if (targetMode === "sheet") {
      router.push(`/admin/subjects/${subjectId}/sheet`);
    } else {
      router.push(`/admin/subjects/${subjectId}`);
    }
  };

  if (!mounted) return null;

  return (
    <div className="inline-flex items-center p-1 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono">
      <button
        type="button"
        onClick={() => handleToggle("explorer")}
        className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
          !isSheet
            ? "bg-indigo-600 text-white shadow-sm"
            : "text-slate-400 hover:text-slate-200"
        }`}
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
        Explorer
      </button>
      <button
        type="button"
        onClick={() => handleToggle("sheet")}
        className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
          isSheet
            ? "bg-indigo-600 text-white shadow-sm"
            : "text-slate-400 hover:text-slate-200"
        }`}
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
        </svg>
        Sheet Grid
      </button>
    </div>
  );
}

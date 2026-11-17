"use client";

import { useEffect } from "react";

interface KeyboardShortcutsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function KeyboardShortcutsDialog({
  isOpen,
  onClose,
}: KeyboardShortcutsDialogProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const shortcuts = [
    { key: "Enter", desc: "Commit cell edit & move to cell below" },
    { key: "Tab / Shift+Tab", desc: "Move right / left between cells" },
    { key: "Esc", desc: "Cancel cell edit / close popovers" },
    { key: "Ctrl / Cmd + S", desc: "Save all pending changes to server" },
    { key: "Ctrl / Cmd + Z", desc: "Undo last edit" },
    { key: "Ctrl / Cmd + Shift + Z", desc: "Redo last undone edit" },
    { key: "Ctrl / Cmd + D", desc: "Fill down (copy cell above into selection)" },
    { key: "Ctrl / Cmd + C", desc: "Copy selected rows/cells as tab-separated text" },
    { key: "Ctrl / Cmd + V", desc: "Paste Excel / Google Sheets rows into grid" },
    { key: "Alt + Up / Down", desc: "Move focused row up / down in sequence" },
    { key: "?", desc: "Open this keyboard shortcuts dialog" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 font-sans">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-mono font-bold text-sm">
              âŒ˜
            </div>
            <div>
              <h3 className="font-semibold text-base text-white">Keyboard Shortcuts</h3>
              <p className="text-xs text-slate-400">Excel-style spreadsheet navigation</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 max-h-[60vh] overflow-y-auto space-y-2.5 pr-1">
          {shortcuts.map((sc, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-2 rounded-lg bg-slate-950/50 border border-slate-800/80 text-xs"
            >
              <span className="text-slate-300">{sc.desc}</span>
              <kbd className="px-2 py-1 rounded bg-slate-800 text-indigo-300 font-mono font-medium border border-slate-700/60 shadow-sm">
                {sc.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold font-mono transition-colors"
          >
            Got it (Esc)
          </button>
        </div>
      </div>
    </div>
  );
}

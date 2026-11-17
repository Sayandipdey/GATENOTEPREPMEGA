"use client";

import type { SheetConflict } from "@notes/shared";

interface ConflictModalProps {
  conflicts: SheetConflict[];
  onResolve: (resolutions: Record<string, "mine" | "theirs">) => void;
  onCancel: () => void;
}

export function ConflictModal({
  conflicts,
  onResolve,
  onCancel,
}: ConflictModalProps) {
  if (conflicts.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-slate-900 border border-amber-500/40 rounded-2xl shadow-2xl p-6 font-sans">
        <div className="flex items-start gap-3 pb-4 border-b border-slate-800">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold shrink-0">
            âš 
          </div>
          <div>
            <h3 className="font-semibold text-lg text-white">
              Concurrent Updates Detected ({conflicts.length})
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Another session updated these items while you were editing. Choose which version to keep.
            </p>
          </div>
        </div>

        <div className="mt-4 max-h-[50vh] overflow-y-auto space-y-4 pr-1">
          {conflicts.map((conf) => (
            <div
              key={conf.id}
              className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm text-slate-200">
                  {conf.title || conf.id}
                </span>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                  {conf.entityType}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                {/* Your Version */}
                <div className="p-3 rounded-lg border border-indigo-500/30 bg-indigo-950/20 space-y-1">
                  <p className="text-[11px] font-bold text-indigo-400 uppercase">Your Changes</p>
                  <p className="text-slate-300 truncate">Title: {conf.clientData.title || "(unchanged)"}</p>
                  {conf.clientData.megaFileLink && (
                    <p className="text-slate-400 truncate">Link: {conf.clientData.megaFileLink}</p>
                  )}
                </div>

                {/* Server Version */}
                <div className="p-3 rounded-lg border border-slate-700 bg-slate-800/40 space-y-1">
                  <p className="text-[11px] font-bold text-slate-400 uppercase">Server Version</p>
                  <p className="text-slate-300 truncate">Title: {conf.serverData.title || "(unchanged)"}</p>
                  {conf.serverData.megaFileLink && (
                    <p className="text-slate-400 truncate">Link: {conf.serverData.megaFileLink}</p>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => onResolve({ [conf.id]: "theirs" })}
                  className="px-3 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-xs text-slate-300 transition-colors"
                >
                  Take Theirs
                </button>
                <button
                  type="button"
                  onClick={() => onResolve({ [conf.id]: "mine" })}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-colors"
                >
                  Keep Mine
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t border-slate-800 flex justify-between items-center">
          <button
            onClick={onCancel}
            className="text-xs text-slate-400 hover:text-white"
          >
            Review Later (Keep Editing)
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => {
                const res: Record<string, "theirs"> = {};
                conflicts.forEach((c) => (res[c.id] = "theirs"));
                onResolve(res);
              }}
              className="px-3.5 py-2 border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-mono rounded-lg transition-colors"
            >
              Take All Server
            </button>
            <button
              onClick={() => {
                const res: Record<string, "mine"> = {};
                conflicts.forEach((c) => (res[c.id] = "mine"));
                onResolve(res);
              }}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-mono font-semibold rounded-lg transition-colors"
            >
              Keep All Mine
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

interface SheetFooterProps {
  totalRows: number;
  selectedCount: number;
  unsavedCount: number;
  autosave: boolean;
  onToggleAutosave: () => void;
  saving: boolean;
  onSave: () => void;
  onDiscard: () => void;
}

export function SheetFooter({
  totalRows,
  selectedCount,
  unsavedCount,
  autosave,
  onToggleAutosave,
  saving,
  onSave,
  onDiscard,
}: SheetFooterProps) {
  return (
    <footer className="sticky bottom-0 z-30 w-full bg-slate-950/95 border-t border-slate-800/90 backdrop-blur-md px-4 py-2.5 flex items-center justify-between text-xs font-mono text-slate-400">
      {/* Left side: Row statistics */}
      <div className="flex items-center gap-4">
        <span>
          Total: <strong className="text-slate-200">{totalRows}</strong> rows
        </span>
        {selectedCount > 0 && (
          <span className="text-indigo-400">
            Selected: <strong>{selectedCount}</strong>
          </span>
        )}
        <div className="h-3 w-px bg-slate-800" />
        <span
          className={`flex items-center gap-1.5 ${
            unsavedCount > 0 ? "text-amber-400 font-semibold" : "text-slate-500"
          }`}
        >
          {unsavedCount > 0 ? (
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          ) : (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          )}
          {unsavedCount === 0
            ? "All changes saved"
            : `${unsavedCount} unsaved change${unsavedCount > 1 ? "s" : ""}`}
        </span>
      </div>

      {/* Right side: Autosave toggle + Action buttons */}
      <div className="flex items-center gap-3">
        {/* Autosave 30s toggle */}
        <label className="flex items-center gap-2 cursor-pointer select-none text-slate-400 hover:text-slate-200">
          <input
            type="checkbox"
            checked={autosave}
            onChange={onToggleAutosave}
            className="w-3.5 h-3.5 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-0"
          />
          <span className="text-[11px]">Autosave (30s)</span>
        </label>

        <div className="h-4 w-px bg-slate-800" />

        {/* Discard button */}
        <button
          type="button"
          disabled={unsavedCount === 0 || saving}
          onClick={onDiscard}
          className="px-3 py-1.5 rounded-lg border border-slate-700/80 hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none text-slate-300 transition-colors"
        >
          Discard
        </button>

        {/* Save button */}
        <button
          type="button"
          disabled={unsavedCount === 0 || saving}
          onClick={onSave}
          className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:pointer-events-none text-white font-semibold transition-colors flex items-center gap-1.5 shadow-sm shadow-indigo-600/30"
        >
          {saving && (
            <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          )}
          <span>{saving ? "Saving..." : "Save (Ctrl+S)"}</span>
        </button>
      </div>
    </footer>
  );
}

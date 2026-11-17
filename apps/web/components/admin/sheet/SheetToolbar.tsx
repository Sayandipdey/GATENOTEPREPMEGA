"use client";

import { useState } from "react";
import { SheetViewToggle } from "./SheetViewToggle";

interface SheetToolbarProps {
  subjectId: string;
  search: string;
  onSearchChange: (val: string) => void;
  density: "compact" | "comfortable";
  onDensityToggle: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onAddRow: () => void;
  onAddFolder: () => void;
  onQuickAddLinks: (links: string[]) => void;
  onExport: (format: "xlsx" | "csv") => void;
  onOpenHelp: () => void;
  onCheckAllLinks: () => void;
  checkingLinks: boolean;
}

export function SheetToolbar({
  subjectId,
  search,
  onSearchChange,
  density,
  onDensityToggle,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onAddRow,
  onAddFolder,
  onQuickAddLinks,
  onExport,
  onOpenHelp,
  onCheckAllLinks,
  checkingLinks,
}: SheetToolbarProps) {
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAddText, setQuickAddText] = useState("");
  const [showExportMenu, setShowExportMenu] = useState(false);

  const handleApplyQuickAdd = () => {
    const lines = quickAddText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length > 0) {
      onQuickAddLinks(lines);
      setQuickAddText("");
      setShowQuickAdd(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 pb-3 border-b border-slate-800">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left side: View Mode Toggle & Primary Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <SheetViewToggle subjectId={subjectId} />

          <div className="h-4 w-px bg-slate-800 mx-1 hidden sm:block" />

          {/* + Row Button */}
          <button
            type="button"
            onClick={onAddRow}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-mono font-medium transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <span>+ Row</span>
          </button>

          {/* + Folder Button */}
          <button
            type="button"
            onClick={onAddFolder}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 rounded-lg text-xs font-mono font-medium transition-colors flex items-center gap-1.5"
          >
            <span>📁 + Folder</span>
          </button>

          {/* Quick Paste Links Popover */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowQuickAdd(!showQuickAdd)}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-lg text-xs font-mono transition-colors flex items-center gap-1"
            >
              <span>⚡ Quick Add Links</span>
            </button>

            {showQuickAdd && (
              <div className="absolute top-full mt-2 left-0 w-80 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-4 z-50 font-sans space-y-3 animate-fade-in">
                <div className="flex items-center justify-between">
                  <h5 className="font-semibold text-xs text-white">Paste Multiple MEGA Links</h5>
                  <button
                    onClick={() => setShowQuickAdd(false)}
                    className="text-slate-400 hover:text-white text-xs"
                  >
                    ✕
                  </button>
                </div>
                <p className="text-[11px] text-slate-400">
                  Paste MEGA links below (one per line). File rows will be generated automatically.
                </p>
                <textarea
                  rows={5}
                  value={quickAddText}
                  onChange={(e) => setQuickAddText(e.target.value)}
                  placeholder={`https://mega.nz/file/abc#key1\nhttps://mega.nz/file/xyz#key2`}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowQuickAdd(false)}
                    className="px-2.5 py-1 text-xs text-slate-400 hover:text-slate-200 font-mono"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyQuickAdd}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-mono font-semibold"
                  >
                    Generate Rows
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Undo / Redo */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5">
            <button
              type="button"
              disabled={!canUndo}
              onClick={onUndo}
              title="Undo (Ctrl+Z)"
              className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 rounded hover:bg-slate-800 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a5 5 0 015 5v2M3 10l6-6m-6 6l6 6" />
              </svg>
            </button>
            <button
              type="button"
              disabled={!canRedo}
              onClick={onRedo}
              title="Redo (Ctrl+Shift+Z)"
              className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 rounded hover:bg-slate-800 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10H11a5 5 0 00-5 5v2m15-7l-6-6m6 6l-6 6" />
              </svg>
            </button>
          </div>
        </div>

        {/* Right side: Search, Density, Export & Help */}
        <div className="flex items-center gap-2">
          {/* Search filter */}
          <div className="relative w-48 sm:w-60">
            <svg
              className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Filter grid rows..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Density toggle */}
          <button
            type="button"
            onClick={onDensityToggle}
            title={`Switch to ${density === "compact" ? "Comfortable" : "Compact"} density`}
            className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-300 text-xs font-mono"
          >
            {density === "compact" ? "â˜° Compact" : "â˜° Comfortable"}
          </button>

          {/* Check all links */}
          <button
            type="button"
            disabled={checkingLinks}
            onClick={onCheckAllLinks}
            className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-indigo-400 text-xs font-mono flex items-center gap-1"
            title="Batch check all MEGA links"
          >
            {checkingLinks ? (
              <span className="w-3.5 h-3.5 border border-indigo-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            <span className="hidden sm:inline">Check Links</span>
          </button>

          {/* Export dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-300 text-xs font-mono flex items-center gap-1"
              title="Export as Excel or CSV"
            >
              <span>â¬‡ Export</span>
            </button>
            {showExportMenu && (
              <div className="absolute top-full mt-1.5 right-0 w-36 bg-slate-900 border border-slate-800 rounded-xl shadow-xl p-1 z-50 font-mono text-xs">
                <button
                  type="button"
                  onClick={() => {
                    onExport("xlsx");
                    setShowExportMenu(false);
                  }}
                  className="w-full text-left px-3 py-1.5 rounded hover:bg-indigo-600/20 hover:text-indigo-300 text-slate-300"
                >
                  Excel (.xlsx)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onExport("csv");
                    setShowExportMenu(false);
                  }}
                  className="w-full text-left px-3 py-1.5 rounded hover:bg-indigo-600/20 hover:text-indigo-300 text-slate-300"
                >
                  CSV (.csv)
                </button>
              </div>
            )}
          </div>

          {/* Help button */}
          <button
            type="button"
            onClick={onOpenHelp}
            className="w-7 h-7 flex items-center justify-center bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-400 hover:text-white font-mono text-xs font-bold"
            title="Keyboard shortcuts (?)"
          >
            ?
          </button>
        </div>
      </div>
    </div>
  );
}

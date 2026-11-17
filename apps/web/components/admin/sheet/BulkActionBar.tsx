"use client";

import { useState } from "react";
import type { Folder, NoteFileType } from "@notes/shared";

interface BulkActionBarProps {
  selectedCount: number;
  availableFolders: Folder[];
  onPublish: (publish: boolean) => void;
  onChangeType: (type: NoteFileType) => void;
  onMoveToFolder: (folderId: string | null) => void;
  onCheckLinks: () => void;
  onDelete: () => void;
  onClearSelection: () => void;
}

export function BulkActionBar({
  selectedCount,
  availableFolders,
  onPublish,
  onChangeType,
  onMoveToFolder,
  onCheckLinks,
  onDelete,
  onClearSelection,
}: BulkActionBarProps) {
  const [showMoveMenu, setShowMoveMenu] = useState(false);
  const [showTypeMenu, setShowTypeMenu] = useState(false);

  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-14 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 border border-indigo-500/40 rounded-2xl shadow-2xl backdrop-blur-md px-4 py-2.5 flex items-center gap-3 font-mono text-xs text-slate-200 animate-slide-up">
      <div className="flex items-center gap-2 border-r border-slate-700/80 pr-3">
        <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
        <span className="font-bold text-white">{selectedCount}</span>
        <span className="text-slate-400">selected</span>
      </div>

      <div className="flex items-center gap-1.5">
        {/* Publish / Unpublish */}
        <button
          type="button"
          onClick={() => onPublish(true)}
          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
        >
          Publish
        </button>
        <button
          type="button"
          onClick={() => onPublish(false)}
          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
        >
          Unpublish
        </button>

        {/* Change Type dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowTypeMenu(!showTypeMenu);
              setShowMoveMenu(false);
            }}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors flex items-center gap-1"
          >
            Type â–¾
          </button>
          {showTypeMenu && (
            <div className="absolute bottom-full mb-2 left-0 w-28 bg-slate-900 border border-slate-800 rounded-xl shadow-xl p-1 z-50">
              {(["pdf", "ppt", "doc", "other"] as NoteFileType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    onChangeType(t);
                    setShowTypeMenu(false);
                  }}
                  className="w-full text-left px-2.5 py-1 text-xs rounded uppercase hover:bg-indigo-600/20 hover:text-indigo-300"
                >
                  {t}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Move to Folder dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowMoveMenu(!showMoveMenu);
              setShowTypeMenu(false);
            }}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors flex items-center gap-1"
          >
            Move â–¾
          </button>
          {showMoveMenu && (
            <div className="absolute bottom-full mb-2 left-0 w-48 bg-slate-900 border border-slate-800 rounded-xl shadow-xl p-1 max-h-48 overflow-y-auto z-50">
              <button
                type="button"
                onClick={() => {
                  onMoveToFolder(null);
                  setShowMoveMenu(false);
                }}
                className="w-full text-left px-2.5 py-1 text-xs rounded hover:bg-indigo-600/20 hover:text-indigo-300 text-slate-300"
              >
                📁 [Root Level]
              </button>
              {availableFolders.map((fld) => (
                <button
                  key={fld.id}
                  type="button"
                  onClick={() => {
                    onMoveToFolder(fld.id);
                    setShowMoveMenu(false);
                  }}
                  className="w-full text-left px-2.5 py-1 text-xs rounded hover:bg-indigo-600/20 hover:text-indigo-300 text-slate-300 truncate"
                >
                  📁 {fld.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Check links */}
        <button
          type="button"
          onClick={onCheckLinks}
          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-300 transition-colors"
          title="Verify MEGA links"
        >
          Check Links
        </button>

        {/* Delete */}
        <button
          type="button"
          onClick={onDelete}
          className="px-2.5 py-1.5 rounded-lg bg-red-950/60 border border-red-800/80 hover:bg-red-900 text-red-300 transition-colors"
        >
          Delete
        </button>
      </div>

      <div className="border-l border-slate-700/80 pl-2">
        <button
          type="button"
          onClick={onClearSelection}
          className="text-slate-400 hover:text-white px-1.5 py-1"
          title="Clear Selection"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

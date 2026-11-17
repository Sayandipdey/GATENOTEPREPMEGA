"use client";

import React, { useRef, useMemo, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { MEGA_URL_PREFIX, type Folder, type NoteFileType, type SheetRowData } from "@notes/shared";
import { ImageUploadPopover } from "./ImageUploadPopover";

interface VirtualSheetGridProps {
  rows: SheetRowData[];
  folders: Folder[];
  density: "compact" | "comfortable";
  selectedRowIds: Set<string>;
  onSelectRow: (id: string, isShift: boolean, isCtrl: boolean) => void;
  onSelectAll: (select: boolean) => void;
  onUpdateRow: (id: string, updates: Partial<SheetRowData>) => void;
  onToggleExpand: (folderId: string) => void;
  onInsertRow: (targetIndex: number, kind: "file" | "folder") => void;
  onDuplicateRow: (id: string) => void;
  onDeleteRow: (id: string) => void;
  onMoveRow: (dragIndex: number, hoverIndex: number) => void;
  onMoveRowToFolder: (id: string, folderId: string | null) => void;
  onCheckSingleLink: (id: string, url: string) => void;
}

export function VirtualSheetGrid({
  rows,
  folders,
  density,
  selectedRowIds,
  onSelectRow,
  onSelectAll,
  onUpdateRow,
  onToggleExpand,
  onInsertRow,
  onDuplicateRow,
  onDeleteRow,
  onMoveRow,
  onMoveRowToFolder,
  onCheckSingleLink,
}: VirtualSheetGridProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const rowHeight = density === "compact" ? 36 : 48;

  // Active inline editing cell: { rowId, field }
  const [editingCell, setEditingCell] = useState<{ rowId: string; field: string } | null>(null);
  const [activeImagePopoverRowId, setActiveImagePopoverRowId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; row: SheetRowData } | null>(null);

  // Drag state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Folder lookup
  const folderMap = useMemo(() => new Map(folders.map((f) => [f.id, f])), [folders]);

  // Virtualizer setup
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan: 10,
  });

  // Track duplicate MEGA links for warning
  const duplicateLinks = useMemo(() => {
    const counts = new Map<string, number>();
    rows.forEach((r) => {
      if (r.kind === "file" && r.megaFileLink) {
        counts.set(r.megaFileLink, (counts.get(r.megaFileLink) || 0) + 1);
      }
    });
    const dupes = new Set<string>();
    counts.forEach((cnt, link) => {
      if (cnt > 1) dupes.add(link);
    });
    return dupes;
  }, [rows]);

  const allSelected = rows.length > 0 && selectedRowIds.size === rows.length;

  // Keyboard navigation & fill down
  const handleKeyDown = (e: React.KeyboardEvent, row: SheetRowData, rowIndex: number, field: string) => {
    if (e.key === "Enter") {
      e.preventDefault();
      setEditingCell(null);
      // Move to cell below if available
      if (rowIndex < rows.length - 1) {
        setEditingCell({ rowId: rows[rowIndex + 1].id, field });
      }
    } else if (e.key === "Tab") {
      e.preventDefault();
      setEditingCell(null);
      // Move horizontally
      if (e.shiftKey) {
        if (field === "megaFileLink") setEditingCell({ rowId: row.id, field: "title" });
      } else {
        if (field === "title" && row.kind === "file") setEditingCell({ rowId: row.id, field: "megaFileLink" });
      }
    } else if (e.key === "Escape") {
      setEditingCell(null);
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d") {
      // Fill Down: copy from above
      e.preventDefault();
      if (rowIndex > 0) {
        const aboveRow = rows[rowIndex - 1];
        if (field === "title") onUpdateRow(row.id, { title: aboveRow.title });
        if (field === "megaFileLink" && aboveRow.megaFileLink) onUpdateRow(row.id, { megaFileLink: aboveRow.megaFileLink });
        if (field === "type" && aboveRow.type) onUpdateRow(row.id, { type: aboveRow.type });
      }
    }
  };

  return (
    <div
      ref={parentRef}
      className="relative flex-1 overflow-auto border border-slate-800 rounded-xl bg-slate-950 font-mono text-xs select-none max-h-[calc(100vh-210px)]"
      onContextMenu={(e) => e.preventDefault()}
      onClick={() => setContextMenu(null)}
    >
      {/* Frozen Header Row */}
      <div className="sticky top-0 z-20 flex bg-slate-900 border-b border-slate-800 text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
        {/* Col 1: Frozen Row Handle & Checkbox */}
        <div className="sticky left-0 z-30 w-16 px-2 py-2 flex items-center justify-between bg-slate-900 border-r border-slate-800 shrink-0">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={(e) => onSelectAll(e.target.checked)}
            className="w-3.5 h-3.5 rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-0"
          />
          <span className="text-[10px] text-slate-500 font-mono">#</span>
        </div>

        {/* Col 2: Frozen Kind */}
        <div className="sticky left-16 z-30 w-20 px-2 py-2 bg-slate-900 border-r border-slate-800 shrink-0 text-center">
          Kind
        </div>

        {/* Col 3: Title */}
        <div className="w-80 px-3 py-2 border-r border-slate-800 shrink-0">Title</div>

        {/* Col 4: MEGA Link */}
        <div className="w-72 px-3 py-2 border-r border-slate-800 shrink-0">MEGA Link / URL</div>

        {/* Col 5: File Type */}
        <div className="w-24 px-3 py-2 border-r border-slate-800 shrink-0 text-center">Type</div>

        {/* Col 6: Image / Thumbnail */}
        <div className="w-24 px-3 py-2 border-r border-slate-800 shrink-0 text-center">Image</div>

        {/* Col 7: Folder Path */}
        <div className="w-48 px-3 py-2 border-r border-slate-800 shrink-0">Folder Path</div>

        {/* Col 8: Order */}
        <div className="w-20 px-2 py-2 border-r border-slate-800 shrink-0 text-right">Order</div>

        {/* Col 9: Published */}
        <div className="w-20 px-2 py-2 border-r border-slate-800 shrink-0 text-center">Pub</div>

        {/* Col 10: Link Status */}
        <div className="w-28 px-3 py-2 border-r border-slate-800 shrink-0 text-center">Link Check</div>

        {/* Col 11: Views */}
        <div className="w-20 px-3 py-2 border-r border-slate-800 shrink-0 text-right">Views</div>

        {/* Col 12: Actions Menu */}
        <div className="w-12 px-2 py-2 shrink-0 text-center">â‹¯</div>
      </div>

      {/* Virtualized Body Rows */}
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          position: "relative",
          width: "100%",
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const rowIndex = virtualRow.index;
          const row = rows[rowIndex];
          const isSelected = selectedRowIds.has(row.id);
          const isFolder = row.kind === "folder";
          const isImage = row.kind === "image";
          const depth = row.depth || 0;
          const isOver = dragOverIndex === rowIndex;

          const hasInvalidLink =
            row.kind === "file" &&
            (!row.megaFileLink || (!row.megaFileLink.startsWith("http://") && !row.megaFileLink.startsWith("https://")));

          const isDuplicateLink =
            row.kind === "file" && Boolean(row.megaFileLink && duplicateLinks.has(row.megaFileLink));

          return (
            <div
              key={row.id}
              data-index={rowIndex}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
              draggable
              onDragStart={(e) => {
                setDraggedIndex(rowIndex);
                e.dataTransfer.setData("text/plain", row.id);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverIndex(rowIndex);
              }}
              onDragLeave={() => setDragOverIndex(null)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOverIndex(null);
                if (draggedIndex !== null && draggedIndex !== rowIndex) {
                  onMoveRow(draggedIndex, rowIndex);
                }
                setDraggedIndex(null);
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                setContextMenu({ x: e.clientX, y: e.clientY, row });
              }}
              className={`flex items-center border-b border-slate-850 transition-colors ${
                isSelected
                  ? "bg-indigo-950/40 text-slate-100"
                  : isFolder
                  ? "bg-slate-900/50 hover:bg-slate-900/80 font-medium"
                  : rowIndex % 2 === 0
                  ? "bg-slate-950 hover:bg-slate-900/40"
                  : "bg-slate-900/20 hover:bg-slate-900/40"
              } ${isOver ? "border-t-2 border-indigo-500" : ""}`}
            >
              {/* Col 1: Frozen Row Number & Handle */}
              <div
                className={`sticky left-0 z-10 w-16 px-2 h-full flex items-center justify-between border-r border-slate-800 shrink-0 ${
                  isSelected ? "bg-slate-900" : isFolder ? "bg-slate-900/90" : "bg-slate-950"
                }`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={(e) =>
                    onSelectRow(row.id, (e.nativeEvent as any).shiftKey, (e.nativeEvent as any).ctrlKey)
                  }
                  className="w-3.5 h-3.5 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-0"
                />
                <span className="cursor-grab text-slate-500 hover:text-slate-300 text-[10px]">
                  {rowIndex + 1}
                </span>
              </div>

              {/* Col 2: Frozen Kind */}
              <div
                className={`sticky left-16 z-10 w-20 px-2 h-full flex items-center justify-center border-r border-slate-800 shrink-0 ${
                  isSelected ? "bg-slate-900" : isFolder ? "bg-slate-900/90" : "bg-slate-950"
                }`}
              >
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${
                    isFolder
                      ? "bg-amber-950/70 border border-amber-800/80 text-amber-300"
                      : isImage
                      ? "bg-purple-950/70 border border-purple-800/80 text-purple-300"
                      : "bg-indigo-950/70 border border-indigo-800/80 text-indigo-300"
                  }`}
                >
                  {isFolder ? "📁 Folder" : isImage ? "🖼️ Image" : "📄 File"}
                </span>
              </div>

              {/* Col 3: Title (Indented Tree + Inline Edit) */}
              <div
                className="w-80 px-3 h-full flex items-center border-r border-slate-800 shrink-0 truncate"
                style={{ paddingLeft: `${Math.max(12, depth * 20 + 8)}px` }}
                onDoubleClick={() => setEditingCell({ rowId: row.id, field: "title" })}
              >
                {isFolder && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleExpand(row.id);
                    }}
                    className="mr-1.5 p-0.5 text-slate-400 hover:text-white"
                  >
                    {row.isExpanded ? "â–¼" : "â–¶"}
                  </button>
                )}

                {editingCell?.rowId === row.id && editingCell?.field === "title" ? (
                  <input
                    autoFocus
                    type="text"
                    defaultValue={row.title}
                    onBlur={(e) => {
                      onUpdateRow(row.id, { title: e.target.value.trim() || row.title });
                      setEditingCell(null);
                    }}
                    onKeyDown={(e) => handleKeyDown(e, row, rowIndex, "title")}
                    className="w-full bg-slate-900 border border-indigo-500 rounded px-1.5 py-0.5 text-white font-mono text-xs focus:outline-none"
                  />
                ) : (
                  <span className={`truncate ${isFolder ? "font-semibold text-white" : "text-slate-200"}`}>
                    {row.title}
                  </span>
                )}
              </div>

              {/* Col 4: MEGA Link / URL */}
              <div
                className={`w-72 px-3 h-full flex items-center justify-between border-r border-slate-800 shrink-0 truncate ${
                  hasInvalidLink
                    ? "border-b border-red-500/50 bg-red-950/20"
                    : isDuplicateLink
                    ? "border-b border-amber-500/50 bg-amber-950/20"
                    : ""
                }`}
                onDoubleClick={() => {
                  if (row.kind === "file") {
                    setEditingCell({ rowId: row.id, field: "megaFileLink" });
                  }
                }}
              >
                {isFolder ? (
                  <span className="text-slate-600 italic text-[11px]">— folder container —</span>
                ) : editingCell?.rowId === row.id && editingCell?.field === "megaFileLink" ? (
                  <input
                    autoFocus
                    type="url"
                    defaultValue={row.megaFileLink || ""}
                    onBlur={(e) => {
                      onUpdateRow(row.id, { megaFileLink: e.target.value.trim() });
                      setEditingCell(null);
                    }}
                    onKeyDown={(e) => handleKeyDown(e, row, rowIndex, "megaFileLink")}
                    className="w-full bg-slate-900 border border-indigo-500 rounded px-1.5 py-0.5 text-indigo-300 font-mono text-xs focus:outline-none"
                  />
                ) : (
                  <div className="flex items-center justify-between w-full truncate">
                    <span
                      className={`truncate font-mono text-[11px] ${
                        hasInvalidLink
                          ? "text-red-400"
                          : isDuplicateLink
                          ? "text-amber-300"
                          : "text-slate-400"
                      }`}
                      title={row.megaFileLink || "Click to add link"}
                    >
                      {row.megaFileLink || "(empty link)"}
                    </span>
                    {row.megaFileLink && (
                      <div className="flex items-center gap-1 ml-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => navigator.clipboard.writeText(row.megaFileLink!)}
                          className="text-slate-500 hover:text-slate-300 p-0.5"
                          title="Copy link"
                        >
                          📋
                        </button>
                        <a
                          href={row.megaFileLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-400 hover:text-indigo-300 p-0.5"
                          title="Open MEGA link in new tab"
                        >
                          ↗
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Col 5: File Type Dropdown */}
              <div className="w-24 px-2 h-full flex items-center justify-center border-r border-slate-800 shrink-0">
                {row.kind === "file" ? (
                  <select
                    value={row.type || "pdf"}
                    onChange={(e) =>
                      onUpdateRow(row.id, { type: e.target.value as NoteFileType })
                    }
                    className="bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-[10px] font-mono text-slate-200 uppercase focus:outline-none"
                  >
                    <option value="pdf">PDF</option>
                    <option value="ppt">PPT</option>
                    <option value="doc">DOC</option>
                    <option value="other">OTHER</option>
                  </select>
                ) : (
                  <span className="text-slate-600">—</span>
                )}
              </div>

              {/* Col 6: Image / Thumbnail */}
              <div className="w-24 px-2 h-full flex items-center justify-center border-r border-slate-800 shrink-0">
                {row.kind === "image" ? (
                  <button
                    type="button"
                    onClick={() => setActiveImagePopoverRowId(row.id)}
                    className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-200"
                  >
                    {row.imageUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={row.imageUrl}
                        alt="thumb"
                        className="w-4 h-4 rounded object-cover border border-slate-600"
                      />
                    ) : (
                      <span>+ Attach</span>
                    )}
                  </button>
                ) : (
                  <span className="text-slate-600">—</span>
                )}
              </div>

              {/* Col 7: Folder Path / Breadcrumb & Move Dropdown */}
              <div className="w-48 px-3 h-full flex items-center border-r border-slate-800 shrink-0 truncate">
                <select
                  value={row.folderId || ""}
                  onChange={(e) => {
                    const val = e.target.value === "" ? null : e.target.value;
                    onMoveRowToFolder(row.id, val);
                  }}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5 text-[11px] font-mono text-slate-300 truncate focus:outline-none"
                >
                  <option value="">[Root Level]</option>
                  {folders
                    .filter((f) => f.id !== row.id) // Cannot move folder into itself
                    .map((f) => (
                      <option key={f.id} value={f.id}>
                        📁 {f.name}
                      </option>
                    ))}
                </select>
              </div>

              {/* Col 8: Order */}
              <div className="w-20 px-2 h-full flex items-center justify-end border-r border-slate-800 shrink-0 text-slate-400 font-mono text-[11px]">
                {Math.round(row.order)}
              </div>

              {/* Col 9: Published Checkbox */}
              <div className="w-20 px-2 h-full flex items-center justify-center border-r border-slate-800 shrink-0">
                {!isFolder && (
                  <input
                    type="checkbox"
                    checked={row.isPublished}
                    onChange={(e) => onUpdateRow(row.id, { isPublished: e.target.checked })}
                    className="w-3.5 h-3.5 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-0"
                  />
                )}
              </div>

              {/* Col 10: Link Status */}
              <div className="w-28 px-2 h-full flex items-center justify-center border-r border-slate-800 shrink-0">
                {row.kind === "file" && row.megaFileLink ? (
                  <button
                    type="button"
                    onClick={() => onCheckSingleLink(row.id, row.megaFileLink!)}
                    title="Click to re-verify link"
                    className={`px-2 py-0.5 rounded text-[10px] font-mono flex items-center gap-1 ${
                      row.linkStatus === "ok"
                        ? "bg-emerald-950/80 text-emerald-300 border border-emerald-800"
                        : row.linkStatus === "possibly_broken"
                        ? "bg-amber-950/80 text-amber-300 border border-amber-800"
                        : row.linkStatus === "invalid"
                        ? "bg-red-950/80 text-red-300 border border-red-800"
                        : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    <span>{row.linkStatus === "ok" ? "✓ OK" : row.linkStatus === "possibly_broken" ? "⚠ Dead?" : row.linkStatus === "invalid" ? "✕ Invalid" : "? Check"}</span>
                  </button>
                ) : (
                  <span className="text-slate-600">—</span>
                )}
              </div>

              {/* Col 11: Views */}
              <div className="w-20 px-3 h-full flex items-center justify-end border-r border-slate-800 shrink-0 text-slate-400 font-mono">
                {row.viewCount || 0}
              </div>

              {/* Col 12: Action Menu Trigger */}
              <div className="w-12 px-2 h-full flex items-center justify-center shrink-0">
                <button
                  type="button"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setContextMenu({ x: rect.left, y: rect.bottom, row });
                  }}
                  className="text-slate-500 hover:text-slate-300 p-1"
                >
                  â‹¯
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Image Upload Popover Modal */}
      {activeImagePopoverRowId && (
        <ImageUploadPopover
          currentUrl={rows.find((r) => r.id === activeImagePopoverRowId)?.imageUrl}
          onSelect={(url) => {
            onUpdateRow(activeImagePopoverRowId, { imageUrl: url });
            setActiveImagePopoverRowId(null);
          }}
          onClose={() => setActiveImagePopoverRowId(null)}
        />
      )}

      {/* Right-Click / Context Menu */}
      {contextMenu && (
        <div
          style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
          className="fixed z-50 w-44 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-1 font-mono text-xs space-y-0.5 animate-fade-in"
        >
          <button
            type="button"
            onClick={() => {
              const idx = rows.findIndex((r) => r.id === contextMenu.row.id);
              onInsertRow(idx + 1, "file");
              setContextMenu(null);
            }}
            className="w-full text-left px-3 py-1.5 rounded hover:bg-slate-800 text-slate-200"
          >
            + Insert Row Below
          </button>
          <button
            type="button"
            onClick={() => {
              const idx = rows.findIndex((r) => r.id === contextMenu.row.id);
              onInsertRow(idx + 1, "folder");
              setContextMenu(null);
            }}
            className="w-full text-left px-3 py-1.5 rounded hover:bg-slate-800 text-slate-200"
          >
            📁 + Insert Folder Below
          </button>
          <button
            type="button"
            onClick={() => {
              onDuplicateRow(contextMenu.row.id);
              setContextMenu(null);
            }}
            className="w-full text-left px-3 py-1.5 rounded hover:bg-slate-800 text-slate-200"
          >
            Duplicate Row
          </button>
          {contextMenu.row.megaFileLink && (
            <button
              type="button"
              onClick={() => {
                onCheckSingleLink(contextMenu.row.id, contextMenu.row.megaFileLink!);
                setContextMenu(null);
              }}
              className="w-full text-left px-3 py-1.5 rounded hover:bg-slate-800 text-indigo-300"
            >
              Verify Link
            </button>
          )}
          <div className="h-px bg-slate-800 my-1" />
          <button
            type="button"
            onClick={() => {
              onDeleteRow(contextMenu.row.id);
              setContextMenu(null);
            }}
            className="w-full text-left px-3 py-1.5 rounded hover:bg-red-950/60 text-red-400"
          >
            Delete Row
          </button>
        </div>
      )}
    </div>
  );
}

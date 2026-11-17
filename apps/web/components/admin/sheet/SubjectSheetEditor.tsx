"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import { SheetToolbar } from "./SheetToolbar";
import { VirtualSheetGrid } from "./VirtualSheetGrid";
import { BulkActionBar } from "./BulkActionBar";
import { SheetFooter } from "./SheetFooter";
import { ConflictModal } from "./ConflictModal";
import { KeyboardShortcutsDialog } from "./KeyboardShortcutsDialog";
import { flattenTreeForSheet, getFractionalBetween } from "@/lib/fractional-order";
import type {
  Subject,
  Folder,
  Item,
  SheetRowData,
  SheetCommitOperation,
  SheetConflict,
  NoteFileType,
  LinkCheckResultItem,
} from "@notes/shared";

interface SubjectSheetEditorProps {
  subject: Subject;
  initialFolders: Folder[];
  initialItems: Item[];
}

export function SubjectSheetEditor({
  subject,
  initialFolders,
  initialItems,
}: SubjectSheetEditorProps) {
  const [folders, setFolders] = useState<Folder[]>(initialFolders);
  const [items, setItems] = useState<Item[]>(initialItems);

  // Pending operations to send to /commit
  const [pendingOps, setPendingOps] = useState<SheetCommitOperation[]>([]);

  // Undo / Redo history stacks (max 50)
  const [undoStack, setUndoStack] = useState<
    Array<{ folders: Folder[]; items: Item[]; pendingOps: SheetCommitOperation[] }>
  >([]);
  const [redoStack, setRedoStack] = useState<
    Array<{ folders: Folder[]; items: Item[]; pendingOps: SheetCommitOperation[] }>
  >([]);

  // Selection & UI state
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
  const [collapsedFolderIds, setCollapsedFolderIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [density, setDensity] = useState<"compact" | "comfortable">("compact");
  const [autosave, setAutosave] = useState(false);
  const [saving, setSaving] = useState(false);
  const [checkingLinks, setCheckingLinks] = useState(false);

  // Dialogs
  const [conflicts, setConflicts] = useState<SheetConflict[]>([]);
  const [helpOpen, setHelpOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Push current state to undo stack before mutative actions
  const pushUndoSnapshot = useCallback(() => {
    setUndoStack((prev) => [
      ...prev.slice(-49),
      { folders: [...folders], items: [...items], pendingOps: [...pendingOps] },
    ]);
    setRedoStack([]);
  }, [folders, items, pendingOps]);

  // Derived flattened sheet rows
  const allRows = useMemo(() => {
    return flattenTreeForSheet(folders, items, collapsedFolderIds);
  }, [folders, items, collapsedFolderIds]);

  // Filtered rows based on search
  const visibleRows = useMemo(() => {
    if (!search.trim()) return allRows;
    const term = search.toLowerCase().trim();
    return allRows.filter(
      (r) =>
        r.title.toLowerCase().includes(term) ||
        (r.megaFileLink && r.megaFileLink.toLowerCase().includes(term)) ||
        (r.folderPath && r.folderPath.toLowerCase().includes(term))
    );
  }, [allRows, search]);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (pendingOps.length > 0) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [pendingOps]);

  // Autosave interval (30s) if enabled
  useEffect(() => {
    if (!autosave || pendingOps.length === 0 || saving) return;
    const timer = setTimeout(() => {
      handleSave();
    }, 30000);
    return () => clearTimeout(timer);
  }, [autosave, pendingOps, saving]);

  // Show auto-dismissing toast
  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Row selection handler
  const handleSelectRow = (id: string, isShift: boolean, isCtrl: boolean) => {
    setSelectedRowIds((prev) => {
      const next = new Set(isCtrl ? prev : []);
      if (isCtrl && next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = (select: boolean) => {
    if (select) {
      setSelectedRowIds(new Set(visibleRows.map((r) => r.id)));
    } else {
      setSelectedRowIds(new Set());
    }
  };

  // Update a single row's fields
  const handleUpdateRow = (id: string, updates: Partial<SheetRowData>) => {
    pushUndoSnapshot();

    // Check if it's a folder or an item
    const isFolder = folders.some((f) => f.id === id);

    if (isFolder) {
      setFolders((prev) =>
        prev.map((f) => {
          if (f.id !== id) return f;
          return {
            ...f,
            name: updates.title !== undefined ? updates.title : f.name,
            order: updates.order !== undefined ? updates.order : f.order,
            parentId: updates.folderId !== undefined ? updates.folderId : f.parentId,
            updatedAt: new Date().toISOString(),
          };
        })
      );
    } else {
      setItems((prev) =>
        prev.map((it) => {
          if (it.id !== id) return it;
          return {
            ...it,
            title: updates.title !== undefined ? updates.title : it.title,
            kind: updates.kind === "image" ? "image" : updates.kind === "file" ? "file" : it.kind,
            megaFileLink: updates.megaFileLink !== undefined ? updates.megaFileLink : it.megaFileLink,
            type: updates.type !== undefined ? updates.type : it.type,
            imageUrl: updates.imageUrl !== undefined ? updates.imageUrl : it.imageUrl,
            caption: updates.caption !== undefined ? updates.caption : it.caption,
            isPublished: updates.isPublished !== undefined ? updates.isPublished : it.isPublished,
            order: updates.order !== undefined ? updates.order : it.order,
            folderId: updates.folderId !== undefined ? updates.folderId : it.folderId,
            linkStatus: updates.linkStatus !== undefined ? updates.linkStatus : it.linkStatus,
            lastCheckedAt: updates.lastCheckedAt !== undefined ? updates.lastCheckedAt : it.lastCheckedAt,
            updatedAt: new Date().toISOString(),
          };
        })
      );
    }

    setPendingOps((prev) => [
      ...prev,
      {
        op: "update",
        entityType: isFolder ? "folder" : "item",
        id,
        data: updates,
        clientUpdatedAt: new Date().toISOString(),
      },
    ]);
  };

  // Add new file row
  const handleAddRow = () => {
    pushUndoSnapshot();
    const tempId = "new_item_" + Math.random().toString(36).substring(2, 9);
    const lastRow = visibleRows[visibleRows.length - 1];
    const newOrder = lastRow ? lastRow.order + 1000 : 1000;

    const newItem: Item = {
      id: tempId,
      subjectId: subject.id,
      folderId: null,
      kind: "file",
      title: "New Study Note",
      type: "pdf",
      megaFileLink: "",
      order: newOrder,
      isPublished: true,
      viewCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setItems((prev) => [...prev, newItem]);
    setPendingOps((prev) => [
      ...prev,
      {
        op: "create",
        entityType: "item",
        id: tempId,
        data: {
          title: newItem.title,
          kind: "file",
          type: "pdf",
          megaFileLink: "",
          order: newOrder,
          isPublished: true,
          folderId: null,
        },
      },
    ]);
  };

  // Add new folder
  const handleAddFolder = () => {
    pushUndoSnapshot();
    const tempId = "new_fld_" + Math.random().toString(36).substring(2, 9);
    const newOrder = folders.length > 0 ? folders[folders.length - 1].order + 1000 : 1000;

    const newFolder: Folder = {
      id: tempId,
      subjectId: subject.id,
      parentId: null,
      name: "New Folder",
      order: newOrder,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setFolders((prev) => [...prev, newFolder]);
    setPendingOps((prev) => [
      ...prev,
      {
        op: "create",
        entityType: "folder",
        id: tempId,
        data: {
          title: newFolder.name,
          order: newOrder,
          folderId: null,
        },
      },
    ]);
  };

  // Quick add multiple MEGA links
  const handleQuickAddLinks = (links: string[]) => {
    pushUndoSnapshot();
    const newItems: Item[] = [];
    const newOps: SheetCommitOperation[] = [];
    let currentOrder = items.length > 0 ? items[items.length - 1].order : 0;

    links.forEach((link, idx) => {
      const tempId = "new_item_" + Math.random().toString(36).substring(2, 9);
      currentOrder += 1000;

      // Extract a plausible title from link or generic
      const title = `Link ${items.length + idx + 1}`;
      const item: Item = {
        id: tempId,
        subjectId: subject.id,
        folderId: null,
        kind: "file",
        title,
        type: "pdf",
        megaFileLink: link,
        order: currentOrder,
        isPublished: true,
        viewCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      newItems.push(item);
      newOps.push({
        op: "create",
        entityType: "item",
        id: tempId,
        data: {
          title,
          kind: "file",
          type: "pdf",
          megaFileLink: link,
          order: currentOrder,
          isPublished: true,
          folderId: null,
        },
      });
    });

    setItems((prev) => [...prev, ...newItems]);
    setPendingOps((prev) => [...prev, ...newOps]);
    showToast(`Generated ${links.length} rows from pasted links!`);
  };

  // Move row via drag-and-drop
  const handleMoveRow = (dragIndex: number, hoverIndex: number) => {
    if (dragIndex === hoverIndex) return;
    pushUndoSnapshot();

    const dragRow = visibleRows[dragIndex];
    const prevRow = hoverIndex > 0 ? visibleRows[hoverIndex - 1] : undefined;
    const nextRow = hoverIndex < visibleRows.length - 1 ? visibleRows[hoverIndex + 1] : undefined;
    const newOrder = getFractionalBetween(prevRow?.order, nextRow?.order);

    handleUpdateRow(dragRow.id, { order: newOrder });
  };

  // Move row to different folder
  const handleMoveRowToFolder = (id: string, folderId: string | null) => {
    pushUndoSnapshot();
    const isFolder = folders.some((f) => f.id === id);

    if (isFolder) {
      setFolders((prev) =>
        prev.map((f) => (f.id === id ? { ...f, parentId: folderId } : f))
      );
    } else {
      setItems((prev) =>
        prev.map((it) => (it.id === id ? { ...it, folderId } : it))
      );
    }

    setPendingOps((prev) => [
      ...prev,
      {
        op: "move",
        entityType: isFolder ? "folder" : "item",
        id,
        data: { folderId },
      },
    ]);
  };

  // Delete row
  const handleDeleteRow = (id: string) => {
    pushUndoSnapshot();
    const isFolder = folders.some((f) => f.id === id);

    if (isFolder) {
      setFolders((prev) => prev.filter((f) => f.id !== id));
      // Delete child items
      setItems((prev) => prev.filter((it) => it.folderId !== id));
    } else {
      setItems((prev) => prev.filter((it) => it.id !== id));
    }

    setSelectedRowIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });

    setPendingOps((prev) => [
      ...prev,
      {
        op: "delete",
        entityType: isFolder ? "folder" : "item",
        id,
      },
    ]);
  };

  // Duplicate row
  const handleDuplicateRow = (id: string) => {
    const row = allRows.find((r) => r.id === id);
    if (!row || row.kind === "folder") return;

    pushUndoSnapshot();
    const tempId = "new_item_" + Math.random().toString(36).substring(2, 9);
    const newOrder = row.order + 0.5;

    const dupItem: Item = {
      id: tempId,
      subjectId: subject.id,
      folderId: row.folderId,
      kind: row.kind,
      title: `${row.title} (Copy)`,
      type: row.type,
      megaFileLink: row.megaFileLink,
      imageUrl: row.imageUrl,
      caption: row.caption,
      order: newOrder,
      isPublished: row.isPublished,
      viewCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setItems((prev) => [...prev, dupItem]);
    setPendingOps((prev) => [
      ...prev,
      {
        op: "create",
        entityType: "item",
        id: tempId,
        data: {
          title: dupItem.title,
          kind: dupItem.kind,
          type: dupItem.type,
          megaFileLink: dupItem.megaFileLink,
          imageUrl: dupItem.imageUrl,
          order: newOrder,
          isPublished: dupItem.isPublished,
          folderId: dupItem.folderId,
        },
      },
    ]);
  };

  // Undo / Redo
  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    setRedoStack((prev) => [
      ...prev,
      { folders: [...folders], items: [...items], pendingOps: [...pendingOps] },
    ]);
    setFolders(previous.folders);
    setItems(previous.items);
    setPendingOps(previous.pendingOps);
    setUndoStack((prev) => prev.slice(0, -1));
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setUndoStack((prev) => [
      ...prev,
      { folders: [...folders], items: [...items], pendingOps: [...pendingOps] },
    ]);
    setFolders(next.folders);
    setItems(next.items);
    setPendingOps(next.pendingOps);
    setRedoStack((prev) => prev.slice(0, -1));
  };

  // Batch Link Verification
  const handleCheckLinks = async (targetIds?: string[]) => {
    const idsToCheck = targetIds || Array.from(selectedRowIds);
    const itemsToCheck = items
      .filter((it) => (idsToCheck.length > 0 ? idsToCheck.includes(it.id) : true))
      .filter((it) => it.kind === "file" && Boolean(it.megaFileLink))
      .map((it) => ({ id: it.id, url: it.megaFileLink! }));

    if (itemsToCheck.length === 0) {
      showToast("No MEGA links found to verify.", "error");
      return;
    }

    try {
      setCheckingLinks(true);
      const res = await fetch("/api/admin/links/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: itemsToCheck }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to check links");
      }

      const resultsMap = new Map<string, LinkCheckResultItem>(
        data.data.results.map((r: LinkCheckResultItem) => [r.id, r])
      );

      setItems((prev) =>
        prev.map((it) => {
          const resItem = resultsMap.get(it.id);
          if (!resItem) return it;
          return {
            ...it,
            linkStatus: resItem.status,
            lastCheckedAt: resItem.checkedAt,
          };
        })
      );

      showToast(`Verified ${itemsToCheck.length} link(s)!`);
    } catch (err: any) {
      showToast(err.message || "Link check failed", "error");
    } finally {
      setCheckingLinks(false);
    }
  };

  // Save changes to server
  const handleSave = async () => {
    if (pendingOps.length === 0) return;

    try {
      setSaving(true);
      const res = await fetch(`/api/admin/subjects/${subject.id}/sheet/commit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operations: pendingOps }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to save sheet changes");
      }

      const { conflicts: returnedConflicts, updatedFolders, updatedItems } = data.data;

      if (returnedConflicts && returnedConflicts.length > 0) {
        setConflicts(returnedConflicts);
        showToast(`Saved partially, but ${returnedConflicts.length} conflict(s) require review.`, "error");
      } else {
        setPendingOps([]);
        setFolders(updatedFolders);
        setItems(updatedItems);
        showToast("All changes saved successfully!");
      }
    } catch (err: any) {
      showToast(err.message || "Failed to save changes", "error");
    } finally {
      setSaving(false);
    }
  };

  // Discard pending changes
  const handleDiscard = () => {
    if (confirm("Discard all unsaved changes and reload from server?")) {
      window.location.reload();
    }
  };

  // Export to Excel / CSV
  const handleExport = (format: "xlsx" | "csv") => {
    const exportData = allRows.map((r) => ({
      Subject: subject.name,
      Category: subject.category || "Core",
      Kind: r.kind,
      Folder: r.folderPath || "",
      Title: r.title,
      MegaLink: r.megaFileLink || "",
      Type: r.type || "",
      ImageUrl: r.imageUrl || "",
      Caption: r.caption || "",
      Published: r.isPublished ? "Yes" : "No",
      Views: r.viewCount || 0,
    }));

    if (format === "csv") {
      const csv = Papa.unparse(exportData);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${subject.name.replace(/[^a-zA-Z0-9]/g, "_")}_notes.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "GATE Notes");
      XLSX.writeFile(wb, `${subject.name.replace(/[^a-zA-Z0-9]/g, "_")}_notes.xlsx`);
    }

    showToast(`Exported ${exportData.length} rows as .${format}!`);
  };

  // Global Keyboard Shortcuts (Ctrl+S, Ctrl+Z, Ctrl+Y, ?)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        handleSave();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        handleRedo();
      } else if (e.key === "?" && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        setHelpOpen(true);
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [handleSave, handleUndo, handleRedo]);

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] select-none font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-5 right-5 z-50 px-4 py-2.5 rounded-xl font-mono text-xs shadow-2xl flex items-center gap-2 animate-slide-down ${
            toastMessage.type === "success"
              ? "bg-emerald-950 border border-emerald-700 text-emerald-200"
              : "bg-red-950 border border-red-700 text-red-200"
          }`}
        >
          <span>{toastMessage.type === "success" ? "✓" : "⚠"}</span>
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Sheet Toolbar */}
      <SheetToolbar
        subjectId={subject.id}
        search={search}
        onSearchChange={setSearch}
        density={density}
        onDensityToggle={() =>
          setDensity((prev) => (prev === "compact" ? "comfortable" : "compact"))
        }
        canUndo={undoStack.length > 0}
        canRedo={redoStack.length > 0}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onAddRow={handleAddRow}
        onAddFolder={handleAddFolder}
        onQuickAddLinks={handleQuickAddLinks}
        onExport={handleExport}
        onOpenHelp={() => setHelpOpen(true)}
        onCheckAllLinks={() => handleCheckLinks()}
        checkingLinks={checkingLinks}
      />

      {/* Virtualized Grid */}
      <VirtualSheetGrid
        rows={visibleRows}
        folders={folders}
        density={density}
        selectedRowIds={selectedRowIds}
        onSelectRow={handleSelectRow}
        onSelectAll={handleSelectAll}
        onUpdateRow={handleUpdateRow}
        onToggleExpand={(folderId) =>
          setCollapsedFolderIds((prev) => {
            const next = new Set(prev);
            if (next.has(folderId)) next.delete(folderId);
            else next.add(folderId);
            return next;
          })
        }
        onInsertRow={(targetIndex, kind) => {
          if (kind === "folder") handleAddFolder();
          else handleAddRow();
        }}
        onDuplicateRow={handleDuplicateRow}
        onDeleteRow={handleDeleteRow}
        onMoveRow={handleMoveRow}
        onMoveRowToFolder={handleMoveRowToFolder}
        onCheckSingleLink={(id, url) => handleCheckLinks([id])}
      />

      {/* Floating Multi-Row Selection Action Bar */}
      <BulkActionBar
        selectedCount={selectedRowIds.size}
        availableFolders={folders}
        onPublish={(pub) => {
          selectedRowIds.forEach((id) => handleUpdateRow(id, { isPublished: pub }));
        }}
        onChangeType={(t) => {
          selectedRowIds.forEach((id) => handleUpdateRow(id, { type: t }));
        }}
        onMoveToFolder={(fId) => {
          selectedRowIds.forEach((id) => handleMoveRowToFolder(id, fId));
        }}
        onCheckLinks={() => handleCheckLinks()}
        onDelete={() => {
          if (confirm(`Delete ${selectedRowIds.size} selected row(s)?`)) {
            selectedRowIds.forEach((id) => handleDeleteRow(id));
            setSelectedRowIds(new Set());
          }
        }}
        onClearSelection={() => setSelectedRowIds(new Set())}
      />

      {/* Sticky Sheet Footer */}
      <SheetFooter
        totalRows={visibleRows.length}
        selectedCount={selectedRowIds.size}
        unsavedCount={pendingOps.length}
        autosave={autosave}
        onToggleAutosave={() => setAutosave(!autosave)}
        saving={saving}
        onSave={handleSave}
        onDiscard={handleDiscard}
      />

      {/* Dialogs */}
      <KeyboardShortcutsDialog isOpen={helpOpen} onClose={() => setHelpOpen(false)} />
      {conflicts.length > 0 && (
        <ConflictModal
          conflicts={conflicts}
          onResolve={(resolutions) => {
            setConflicts([]);
            showToast("Conflicts resolved!");
          }}
          onCancel={() => setConflicts([])}
        />
      )}
    </div>
  );
}

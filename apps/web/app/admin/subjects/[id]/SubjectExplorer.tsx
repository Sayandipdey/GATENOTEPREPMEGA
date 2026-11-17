"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { FolderModal } from "@/components/admin/FolderModal";
import { ItemModal } from "@/components/admin/ItemModal";
import { ImageLightbox } from "@/components/gallery/ImageLightbox";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { SheetViewToggle } from "@/components/admin/sheet/SheetViewToggle";
import type { Subject, Folder, Item, ItemKind } from "@notes/shared";

interface SubjectExplorerProps {
  subject: Subject;
  initialFolders: Folder[];
  initialItems: Item[];
}

export function SubjectExplorer({
  subject,
  initialFolders,
  initialItems,
}: SubjectExplorerProps) {
  const [folders, setFolders] = useState<Folder[]>(initialFolders);
  const [items, setItems] = useState<Item[]>(initialItems);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  // Expanded folders in the tree
  const [expandedFolderIds, setExpandedFolderIds] = useState<Set<string>>(
    new Set(initialFolders.map((f) => f.id))
  );

  // Modals state
  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);

  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [itemModalKind, setItemModalKind] = useState<ItemKind>("file");
  const [editingItem, setEditingItem] = useState<Item | null>(null);

  const [lightboxItem, setLightboxItem] = useState<Item | null>(null);

  // Drag and drop state
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);

  // Folder lookup
  const folderMap = useMemo(() => new Map(folders.map((f) => [f.id, f])), [folders]);

  // Current folder breadcrumbs
  const breadcrumbs = useMemo(() => {
    const crumbs: { id: string | null; name: string }[] = [
      { id: null, name: "Root" },
    ];
    if (!selectedFolderId) return crumbs;

    const path: Folder[] = [];
    let curr: Folder | undefined = folderMap.get(selectedFolderId);
    while (curr) {
      path.unshift(curr);
      curr = curr.parentId ? folderMap.get(curr.parentId) : undefined;
    }
    path.forEach((f) => crumbs.push({ id: f.id, name: f.name }));
    return crumbs;
  }, [selectedFolderId, folderMap]);

  // Subfolders in currently selected folder
  const currentSubfolders = useMemo(() => {
    return folders
      .filter((f) => (f.parentId || null) === selectedFolderId)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [folders, selectedFolderId]);

  // Items in currently selected folder
  const currentItems = useMemo(() => {
    return items
      .filter((i) => (i.folderId || null) === selectedFolderId)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [items, selectedFolderId]);

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedFolderIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Folder operations
  const handleDeleteFolder = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure? This will delete the folder and ALL nested subfolders and items!")) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/folders/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setFolders((prev) => prev.filter((f) => f.id !== id && f.parentId !== id));
        setItems((prev) => prev.filter((it) => it.folderId !== id));
        if (selectedFolderId === id) {
          setSelectedFolderId(null);
        }
      }
    } catch (err) {
      console.error("Error deleting folder:", err);
    }
  };

  // Item operations
  const handleDeleteItem = async (id: string) => {
    if (!window.confirm("Delete this item?")) return;
    try {
      const res = await fetch(`/api/admin/items/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setItems((prev) => prev.filter((i) => i.id !== id));
      }
    } catch (err) {
      console.error("Error deleting item:", err);
    }
  };

  const handleTogglePublishItem = async (id: string, current: boolean) => {
    try {
      const res = await fetch(`/api/admin/items/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished: !current }),
      });
      const data = await res.json();
      if (data.success) {
        setItems((prev) =>
          prev.map((i) => (i.id === id ? { ...i, isPublished: !current } : i))
        );
      }
    } catch (err) {
      console.error("Error updating publish status:", err);
    }
  };

  const moveItemRow = async (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= currentItems.length) return;

    const reorderedSubset = [...currentItems];
    const temp = reorderedSubset[index];
    reorderedSubset[index] = reorderedSubset[targetIndex];
    reorderedSubset[targetIndex] = temp;

    // Update local state
    const ids = reorderedSubset.map((it) => it.id);
    setItems((prev) => {
      const otherItems = prev.filter((i) => (i.folderId || null) !== selectedFolderId);
      return [...otherItems, ...reorderedSubset];
    });

    // Save on server
    try {
      await fetch("/api/admin/items/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
    } catch (err) {
      console.error("Failed to save item reorder:", err);
    }
  };

  // Drag and drop to move item into folder
  const handleItemDragStart = (itemId: string) => {
    setDraggedItemId(itemId);
  };

  const handleFolderDrop = async (targetFolderId: string | null) => {
    if (!draggedItemId) return;
    const itemToMove = items.find((i) => i.id === draggedItemId);
    if (!itemToMove) return;

    // Optimistic update
    setItems((prev) =>
      prev.map((i) => (i.id === draggedItemId ? { ...i, folderId: targetFolderId } : i))
    );
    setDraggedItemId(null);
    setDragOverFolderId(null);

    try {
      await fetch(`/api/admin/items/${draggedItemId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderId: targetFolderId }),
      });
    } catch (err) {
      console.error("Error moving item into folder:", err);
    }
  };

  // Render a folder branch recursively in the left pane tree
  const renderFolderTreeNode = (folder: Folder, depth = 1) => {
    const isExpanded = expandedFolderIds.has(folder.id);
    const isSelected = selectedFolderId === folder.id;
    const isDragOver = dragOverFolderId === folder.id;
    const subchildren = folders.filter((f) => f.parentId === folder.id);
    const directItemsCount = items.filter((i) => i.folderId === folder.id).length;

    return (
      <div key={folder.id} className="flex flex-col">
        <div
          onClick={() => setSelectedFolderId(folder.id)}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOverFolderId(folder.id);
          }}
          onDragLeave={() => setDragOverFolderId(null)}
          onDrop={(e) => {
            e.preventDefault();
            handleFolderDrop(folder.id);
          }}
          style={{ paddingLeft: `${depth * 14}px` }}
          className={`group flex items-center justify-between py-1.5 pr-2 rounded-lg text-xs cursor-pointer select-none transition-colors ${
            isSelected
              ? "bg-indigo-600/20 text-indigo-300 font-semibold border-l-2 border-indigo-500"
              : isDragOver
              ? "bg-amber-500/20 text-amber-300 border border-amber-500/50"
              : "text-slate-400 hover:text-white hover:bg-slate-900"
          }`}
        >
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            {subchildren.length > 0 ? (
              <button
                type="button"
                onClick={(e) => toggleExpand(folder.id, e)}
                className="p-0.5 text-slate-500 hover:text-slate-200"
              >
                {isExpanded ? "▾" : "▸"}
              </button>
            ) : (
              <span className="w-3 text-center text-slate-600">•</span>
            )}
            <svg className={`w-3.5 h-3.5 ${isSelected ? "text-indigo-400" : "text-amber-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            <span className="truncate">{folder.name}</span>
          </div>

          <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="font-mono text-[10px] text-slate-500">
              {directItemsCount}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setEditingFolder(folder);
                setFolderModalOpen(true);
              }}
              className="text-slate-400 hover:text-white p-0.5"
              title="Rename"
            >
              ✎
            </button>
            <button
              type="button"
              onClick={(e) => handleDeleteFolder(folder.id, e)}
              className="text-red-400 hover:text-red-300 p-0.5"
              title="Delete"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Children folders */}
        {isExpanded && subchildren.length > 0 && (
          <div className="flex flex-col">
            {subchildren.map((child) => renderFolderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const rootFolders = folders.filter((f) => !f.parentId);
  const rootItemsCount = items.filter((i) => !i.folderId).length;

  return (
    <div className="flex flex-col gap-5 max-w-7xl mx-auto font-sans">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/subjects"
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors text-xs"
            title="Back to Subjects"
          >
            ←
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white">
                {subject.name}
              </h1>
              <Badge variant="indigo" size="sm">
                {subject.category || "Core"}
              </Badge>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Subject Explorer • {folders.length} folders • {items.length} notes & diagrams
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <SheetViewToggle subjectId={subject.id} />
          <Link
            href={`/subjects/${subject.id}`}
            target="_blank"
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors flex items-center gap-1.5"
          >
            <span>Preview Student View</span>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </Link>
        </div>
      </div>

      {/* Dual-Pane File-Explorer Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-[620px] rounded-2xl border border-slate-800 bg-slate-950/60 overflow-hidden shadow-xl">
        {/* LEFT PANE: Folder Tree (4 cols) */}
        <div className="lg:col-span-4 border-r border-slate-800 bg-slate-900/30 p-4 flex flex-col justify-between">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
              <span className="text-xs font-mono font-semibold uppercase text-slate-400 tracking-wider">
                Folder Tree
              </span>
              <button
                type="button"
                onClick={() => {
                  setEditingFolder(null);
                  setFolderModalOpen(true);
                }}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
              >
                + New Folder
              </button>
            </div>

            {/* Root folder item */}
            <div
              onClick={() => setSelectedFolderId(null)}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverFolderId("root");
              }}
              onDragLeave={() => setDragOverFolderId(null)}
              onDrop={(e) => {
                e.preventDefault();
                handleFolderDrop(null);
              }}
              className={`flex items-center justify-between py-1.5 px-2 rounded-lg text-xs cursor-pointer select-none transition-colors ${
                selectedFolderId === null
                  ? "bg-indigo-600/20 text-indigo-300 font-semibold border-l-2 border-indigo-500"
                  : dragOverFolderId === "root"
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500"
                  : "text-slate-300 hover:bg-slate-900"
              }`}
            >
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                <span>[Root] {subject.name}</span>
              </div>
              <span className="font-mono text-[10px] text-slate-500">{rootItemsCount}</span>
            </div>

            {/* Folders hierarchy */}
            <div className="flex flex-col gap-0.5 mt-1 overflow-y-auto max-h-[500px]">
              {rootFolders.map((rf) => renderFolderTreeNode(rf, 1))}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-500">
            Tip: Drag any item onto a folder in the tree to move it.
          </div>
        </div>

        {/* RIGHT PANE: Subfolders & Items in Active Selection (8 cols) */}
        <div className="lg:col-span-8 p-5 flex flex-col gap-5">
          {/* Action Bar & Breadcrumbs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-1.5 text-xs text-slate-400">
              {breadcrumbs.map((crumb, idx) => (
                <span key={crumb.id || idx} className="flex items-center gap-1.5">
                  {idx > 0 && <span className="text-slate-600">/</span>}
                  <button
                    type="button"
                    onClick={() => setSelectedFolderId(crumb.id)}
                    className={`hover:text-indigo-400 transition-colors ${
                      crumb.id === selectedFolderId ? "text-white font-semibold" : ""
                    }`}
                  >
                    {crumb.name}
                  </button>
                </span>
              ))}
            </nav>

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setEditingFolder(null);
                  setFolderModalOpen(true);
                }}
              >
                + Folder
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setEditingItem(null);
                  setItemModalKind("image");
                  setItemModalOpen(true);
                }}
              >
                + Add Image
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setEditingItem(null);
                  setItemModalKind("file");
                  setItemModalOpen(true);
                }}
              >
                + Add File Link
              </Button>
            </div>
          </div>

          {/* Subfolders in this level */}
          {currentSubfolders.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-[11px] font-mono font-semibold uppercase text-slate-400">
                Subfolders ({currentSubfolders.length})
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {currentSubfolders.map((fld) => (
                  <div
                    key={fld.id}
                    onClick={() => setSelectedFolderId(fld.id)}
                    className="group flex items-center justify-between p-3 rounded-xl border border-slate-800 bg-slate-900/40 hover:bg-slate-850 hover:border-amber-500/40 cursor-pointer transition-all"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <svg className="w-4 h-4 text-amber-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                      </svg>
                      <span className="text-xs font-medium text-slate-200 group-hover:text-amber-300 truncate">
                        {fld.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingFolder(fld);
                          setFolderModalOpen(true);
                        }}
                        className="p-1 text-slate-400 hover:text-white"
                        title="Rename folder"
                      >
                        ✎
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteFolder(fld.id, e)}
                        className="p-1 text-red-400 hover:text-red-300"
                        title="Delete folder"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Items in this level */}
          <div className="flex flex-col gap-2.5 flex-1">
            <span className="text-[11px] font-mono font-semibold uppercase text-slate-400">
              Items in this folder ({currentItems.length})
            </span>

            {currentItems.length === 0 ? (
              <EmptyState
                title="This folder is empty"
                description="Add study notes with MEGA links or upload high-resolution formula diagrams."
                action={{
                  label: "+ Add File Link",
                  onClick: () => {
                    setEditingItem(null);
                    setItemModalKind("file");
                    setItemModalOpen(true);
                  },
                }}
              />
            ) : (
              <div className="flex flex-col gap-2">
                {currentItems.map((item, index) => {
                  const isImage = item.kind === "image";
                  return (
                    <div
                      key={item.id}
                      draggable
                      onDragStart={() => handleItemDragStart(item.id)}
                      className="group flex items-center justify-between p-3 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-850 hover:border-slate-700 transition-all gap-3 cursor-grab active:cursor-grabbing"
                    >
                      {/* Left: Drag grip + Icon + Title */}
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {/* Drag Handle & Up/Down */}
                        <div className="flex items-center gap-1 text-slate-500">
                          <button
                            type="button"
                            disabled={index === 0}
                            onClick={() => moveItemRow(index, "up")}
                            className="hover:text-white disabled:opacity-20 text-[10px]"
                            title="Move up"
                          >
                            ▲
                          </button>
                          <button
                            type="button"
                            disabled={index === currentItems.length - 1}
                            onClick={() => moveItemRow(index, "down")}
                            className="hover:text-white disabled:opacity-20 text-[10px]"
                            title="Move down"
                          >
                            ▼
                          </button>
                        </div>

                        {/* Thumbnail or Kind icon */}
                        {isImage ? (
                          <div
                            onClick={() => setLightboxItem(item)}
                            className="w-10 h-10 rounded-lg overflow-hidden border border-slate-700 bg-slate-950 shrink-0 cursor-pointer"
                          >
                            {item.imageUrl ? (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-indigo-400 text-xs">IMG</div>
                            )}
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700/60 flex items-center justify-center font-mono text-[9px] uppercase font-bold text-slate-300 shrink-0">
                            {item.type || "FILE"}
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-slate-100 group-hover:text-indigo-400 transition-colors truncate">
                              {item.title}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400 mt-0.5">
                            <span>{item.viewCount ?? 0} views</span>
                            {item.caption && (
                              <>
                                <span>•</span>
                                <span className="font-sans truncate max-w-xs">{item.caption}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        {/* Publish Status Toggle */}
                        <button
                          type="button"
                          onClick={() => handleTogglePublishItem(item.id, item.isPublished)}
                          className={`px-2 py-0.5 rounded text-[11px] font-medium border transition-colors ${
                            item.isPublished
                              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                              : "bg-slate-800 border-slate-700 text-slate-400"
                          }`}
                        >
                          {item.isPublished ? "Public" : "Draft"}
                        </button>

                        {/* Open/Test Link */}
                        {isImage ? (
                          <button
                            type="button"
                            onClick={() => setLightboxItem(item)}
                            className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
                            title="Preview image"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                        ) : (
                          <a
                            href={item.megaFileLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
                            title="Open MEGA link in new tab"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        )}

                        {/* Edit Item */}
                        <button
                          type="button"
                          onClick={() => {
                            setEditingItem(item);
                            setItemModalKind(item.kind);
                            setItemModalOpen(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
                          title="Edit Item"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>

                        {/* Delete Item */}
                        <button
                          type="button"
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-1.5 text-red-400 hover:text-red-300 rounded hover:bg-red-950/40 transition-colors"
                          title="Delete Item"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <FolderModal
        isOpen={folderModalOpen}
        onClose={() => setFolderModalOpen(false)}
        subjectId={subject.id}
        parentFolderId={selectedFolderId}
        folderToEdit={editingFolder}
        onSuccess={(saved) => {
          if (editingFolder) {
            setFolders((prev) =>
              prev.map((f) => (f.id === saved.id ? saved : f))
            );
          } else {
            setFolders((prev) => [...prev, saved]);
            setExpandedFolderIds((prev) => new Set([...prev, saved.id]));
          }
        }}
      />

      <ItemModal
        isOpen={itemModalOpen}
        onClose={() => setItemModalOpen(false)}
        subjectId={subject.id}
        folderId={selectedFolderId}
        defaultKind={itemModalKind}
        itemToEdit={editingItem}
        onSuccess={(saved) => {
          if (editingItem) {
            setItems((prev) =>
              prev.map((i) => (i.id === saved.id ? saved : i))
            );
          } else {
            setItems((prev) => [...prev, saved]);
          }
        }}
      />

      <ImageLightbox
        isOpen={Boolean(lightboxItem)}
        onClose={() => setLightboxItem(null)}
        imageUrl={lightboxItem?.imageUrl || ""}
        title={lightboxItem?.title || ""}
        caption={lightboxItem?.caption}
      />
    </div>
  );
}

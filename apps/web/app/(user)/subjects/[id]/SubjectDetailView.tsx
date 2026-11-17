"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { ItemRow } from "@/components/notes/ItemRow";
import { ImageLightbox } from "@/components/gallery/ImageLightbox";
import { EmptyState } from "@/components/ui/EmptyState";
import type { Subject, Folder, Item } from "@notes/shared";

interface SubjectDetailViewProps {
  subject: Subject;
  folders: Folder[];
  items: Item[];
}

export function SubjectDetailView({
  subject,
  folders,
  items,
}: SubjectDetailViewProps) {
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [lightboxItem, setLightboxItem] = useState<Item | null>(null);

  // Folder lookup map
  const folderMap = useMemo(() => new Map(folders.map((f) => [f.id, f])), [folders]);

  // Current folder breadcrumbs: [Root, Parent, Current]
  const breadcrumbs = useMemo(() => {
    const crumbs: { id: string | null; name: string }[] = [
      { id: null, name: "Root" },
    ];
    if (!currentFolderId) return crumbs;

    const path: Folder[] = [];
    let curr: Folder | undefined = folderMap.get(currentFolderId);
    while (curr) {
      path.unshift(curr);
      curr = curr.parentId ? folderMap.get(curr.parentId) : undefined;
    }

    path.forEach((f) => crumbs.push({ id: f.id, name: f.name }));
    return crumbs;
  }, [currentFolderId, folderMap]);

  // Subfolders in current level
  const currentSubfolders = useMemo(() => {
    return folders.filter((f) => (f.parentId || null) === currentFolderId);
  }, [folders, currentFolderId]);

  // Items in current level
  const currentItems = useMemo(() => {
    return items.filter((i) => (i.folderId || null) === currentFolderId);
  }, [items, currentFolderId]);

  // Separate files and images in current level
  const currentFiles = useMemo(() => currentItems.filter((i) => i.kind === "file"), [currentItems]);
  const currentImages = useMemo(() => currentItems.filter((i) => i.kind === "image"), [currentItems]);

  // Lightbox navigation
  const lightboxIndex = useMemo(() => {
    if (!lightboxItem) return -1;
    return currentImages.findIndex((img) => img.id === lightboxItem.id);
  }, [lightboxItem, currentImages]);

  const handlePrevImage = () => {
    if (lightboxIndex > 0) {
      setLightboxItem(currentImages[lightboxIndex - 1]);
    }
  };

  const handleNextImage = () => {
    if (lightboxIndex < currentImages.length - 1) {
      setLightboxItem(currentImages[lightboxIndex + 1]);
    }
  };

  // Helper count for folder
  const getItemCountInFolder = (folderId: string) => {
    return items.filter((i) => i.folderId === folderId).length;
  };

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto">
      {/* Top Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
        <Link href="/" className="hover:text-indigo-400 transition-colors flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          Subjects
        </Link>
        <span className="text-slate-600">/</span>
        <button
          type="button"
          onClick={() => setCurrentFolderId(null)}
          className={`hover:text-indigo-400 transition-colors ${
            !currentFolderId ? "text-slate-100 font-semibold" : ""
          }`}
        >
          {subject.name}
        </button>
        {breadcrumbs.slice(1).map((crumb, idx) => (
          <span key={crumb.id || idx} className="flex items-center gap-1.5">
            <span className="text-slate-600">/</span>
            <button
              type="button"
              onClick={() => setCurrentFolderId(crumb.id)}
              className={`hover:text-indigo-400 transition-colors ${
                crumb.id === currentFolderId ? "text-indigo-400 font-semibold" : ""
              }`}
            >
              {crumb.name}
            </button>
          </span>
        ))}
      </nav>

      {/* Header Banner */}
      <div className="p-6 md:p-8 bg-slate-900/80 border border-slate-800 rounded-2xl relative overflow-hidden shadow-sm">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 relative z-10">
          <div className="flex items-start gap-4 flex-1">
            {subject.thumbnailUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={subject.thumbnailUrl}
                alt={subject.name}
                className="w-16 h-16 rounded-xl object-cover border border-slate-700/80 shrink-0 shadow-md"
              />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-indigo-900 to-slate-900 border border-indigo-700/40 flex items-center justify-center text-lg font-mono font-bold text-indigo-300 shrink-0 shadow-md">
                {subject.name.slice(0, 2).toUpperCase()}
              </div>
            )}

            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Badge variant="indigo" size="sm">
                  {subject.category || "Core"}
                </Badge>
                <span className="text-xs text-slate-400 font-mono">
                  {items.length} total items
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
                {subject.name}
              </h1>
              {subject.description && (
                <p className="text-xs md:text-sm text-slate-300 max-w-2xl leading-relaxed">
                  {subject.description}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Folders navigation section */}
      {currentSubfolders.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-2">
            <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            Folders ({currentSubfolders.length})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {currentSubfolders.map((fld) => (
              <button
                key={fld.id}
                type="button"
                onClick={() => setCurrentFolderId(fld.id)}
                className="group flex items-center gap-3 p-4 rounded-xl border border-slate-800 bg-slate-900/50 hover:bg-slate-850 hover:border-amber-500/40 transition-all text-left shadow-sm"
              >
                <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0 group-hover:scale-105 transition-transform">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-semibold text-slate-100 group-hover:text-amber-300 transition-colors truncate">
                    {fld.name}
                  </h4>
                  <span className="text-[11px] font-mono text-slate-500">
                    {getItemCountInFolder(fld.id)} items
                  </span>
                </div>
                <svg className="w-4 h-4 text-slate-500 group-hover:text-amber-400 group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Image Gallery Section (if any images in this level) */}
      {currentImages.length > 0 && (
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between pb-1 border-b border-slate-800/80">
            <h2 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-2">
              <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Diagrams & Formula Sheets ({currentImages.length})
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {currentImages.map((img) => (
              <div
                key={img.id}
                onClick={() => setLightboxItem(img)}
                className="group relative cursor-pointer rounded-xl overflow-hidden border border-slate-800 bg-slate-900/60 hover:border-indigo-500/50 transition-all aspect-video flex flex-col justify-end p-2.5"
              >
                {img.imageUrl && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={img.imageUrl}
                    alt={img.title}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                <div className="relative z-10">
                  <span className="text-xs font-medium text-white line-clamp-1 group-hover:text-indigo-300 transition-colors">
                    {img.title}
                  </span>
                  {img.caption && (
                    <span className="text-[10px] text-slate-400 line-clamp-1">
                      {img.caption}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Files Section (PDF, PPT, DOC) */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between pb-1 border-b border-slate-800/80">
          <h2 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-2">
            <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Study Notes ({currentFiles.length})
          </h2>
        </div>

        {currentFiles.length === 0 && currentImages.length === 0 && currentSubfolders.length === 0 ? (
          <EmptyState
            title="No notes in this folder"
            description="There are currently no notes or diagrams uploaded to this folder."
            action={
              currentFolderId
                ? {
                    label: "Go back to root",
                    onClick: () => setCurrentFolderId(null),
                  }
                : undefined
            }
          />
        ) : (
          <div className="flex flex-col gap-2.5">
            {currentFiles.map((file) => (
              <ItemRow key={file.id} item={file} />
            ))}
          </div>
        )}
      </section>

      {/* Lightbox Modal */}
      <ImageLightbox
        isOpen={Boolean(lightboxItem)}
        onClose={() => setLightboxItem(null)}
        imageUrl={lightboxItem?.imageUrl || ""}
        title={lightboxItem?.title || ""}
        caption={lightboxItem?.caption}
        onPrev={handlePrevImage}
        onNext={handleNextImage}
        hasPrev={lightboxIndex > 0}
        hasNext={lightboxIndex < currentImages.length - 1}
      />
    </div>
  );
}

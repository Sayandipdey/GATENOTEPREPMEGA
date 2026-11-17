"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import type { Item } from "@notes/shared";

interface ItemRowProps {
  item: Item;
  initialBookmarked?: boolean;
  onOpenImage?: (item: Item) => void;
}

export function ItemRow({
  item,
  initialBookmarked = false,
  onOpenImage,
}: ItemRowProps) {
  const [isBookmarked, setIsBookmarked] = useState(initialBookmarked);
  const [bookmarking, setBookmarking] = useState(false);
  const [viewCount, setViewCount] = useState(item.viewCount ?? 0);

  const toggleBookmark = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setBookmarking(true);
    try {
      const res = await fetch("/api/user/bookmarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: item.id }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setIsBookmarked(data.data.bookmarked);
      }
    } catch {
      // ignore
    } finally {
      setBookmarking(false);
    }
  };

  const handleOpenFile = () => {
    // Fire-and-forget view increment
    fetch(`/api/items/${item.id}/view`, { method: "POST" }).catch(() => {});
    fetch(`/api/notes/${item.id}/view`, { method: "POST" }).catch(() => {});
    setViewCount((v) => v + 1);

    if (item.megaFileLink) {
      window.open(item.megaFileLink, "_blank", "noopener,noreferrer");
    }
  };

  const handleOpenImageItem = () => {
    fetch(`/api/items/${item.id}/view`, { method: "POST" }).catch(() => {});
    setViewCount((v) => v + 1);
    if (onOpenImage) {
      onOpenImage(item);
    } else if (item.imageUrl) {
      window.open(item.imageUrl, "_blank", "noopener,noreferrer");
    }
  };

  const isImage = item.kind === "image";

  return (
    <div className="group flex items-center justify-between p-3.5 sm:p-4 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-850 hover:border-slate-700 transition-all duration-150 gap-4">
      {/* Left side: Icon/Thumbnail + Title + Details */}
      <div
        className="flex items-center gap-3.5 min-w-0 flex-1 cursor-pointer"
        onClick={isImage ? handleOpenImageItem : handleOpenFile}
      >
        {isImage ? (
          <div className="relative w-11 h-11 flex-shrink-0 rounded-lg overflow-hidden border border-slate-700/60 bg-slate-950 flex items-center justify-center">
            {item.imageUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={item.imageUrl}
                alt={item.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
              />
            ) : (
              <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            )}
            <span className="absolute bottom-0 right-0 bg-indigo-600 text-[8px] font-mono font-bold text-white px-1 rounded-tl">
              IMG
            </span>
          </div>
        ) : (
          <div className="w-11 h-11 flex-shrink-0 rounded-lg bg-slate-800/80 border border-slate-700/50 flex flex-col items-center justify-center font-mono text-[10px] uppercase font-bold text-slate-300 group-hover:text-white transition-colors">
            {item.type === "pdf" && <span className="text-red-400">PDF</span>}
            {item.type === "ppt" && <span className="text-amber-400">PPT</span>}
            {item.type === "doc" && <span className="text-blue-400">DOC</span>}
            {(!item.type || item.type === "other") && <span>FILE</span>}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-medium text-slate-100 group-hover:text-indigo-400 transition-colors truncate">
              {item.title}
            </h4>
          </div>
          <div className="flex items-center gap-2.5 mt-1 text-xs text-slate-400 font-mono text-[11px]">
            <span>{viewCount} views</span>
            {item.caption && (
              <>
                <span className="text-slate-600">•</span>
                <span className="font-sans text-xs text-slate-400 truncate max-w-xs">{item.caption}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Right side: Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Bookmark button */}
        <button
          type="button"
          onClick={toggleBookmark}
          disabled={bookmarking}
          aria-label={isBookmarked ? "Remove bookmark" : "Bookmark this item"}
          className={`p-2 rounded-lg transition-colors border ${
            isBookmarked
              ? "bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20"
              : "bg-slate-800/60 border-slate-700/50 text-slate-400 hover:text-white hover:bg-slate-800"
          }`}
          title={isBookmarked ? "Bookmarked" : "Add bookmark"}
        >
          <svg className="w-4 h-4" fill={isBookmarked ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
        </button>

        {/* Primary Action Button */}
        {isImage ? (
          <button
            type="button"
            onClick={handleOpenImageItem}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-indigo-600/90 hover:bg-indigo-600 text-white transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <span>View</span>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </button>
        ) : (
          <button
            type="button"
            onClick={handleOpenFile}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-indigo-600/90 hover:bg-indigo-600 text-white transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <span>Open</span>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

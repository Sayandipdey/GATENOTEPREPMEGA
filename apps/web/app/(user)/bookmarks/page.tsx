"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ItemRow } from "@/components/notes/ItemRow";
import { ImageLightbox } from "@/components/gallery/ImageLightbox";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import type { Item } from "@notes/shared";

export default function BookmarksPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightboxItem, setLightboxItem] = useState<Item | null>(null);

  useEffect(() => {
    async function loadBookmarks() {
      try {
        const res = await fetch("/api/user/bookmarks");
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          setItems(data.data);
        }
      } catch (err) {
        console.error("Failed to load bookmarks:", err);
      } finally {
        setLoading(false);
      }
    }
    loadBookmarks();
  }, []);

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Saved Bookmarks</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Pinned study notes and diagrams for rapid GATE exam revision
          </p>
        </div>
        <Link
          href="/"
          className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          ← Browse subjects
        </Link>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Spinner className="w-7 h-7 text-indigo-500" />
          <p className="text-xs text-slate-400">Loading your bookmarks...</p>
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title="No bookmarks saved yet"
          description="Click the bookmark icon on any note or diagram to pin it here for quick access."
          action={{
            label: "Explore Subjects",
            onClick: () => {
              window.location.href = "/";
            },
          }}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              initialBookmarked={true}
              onOpenImage={(img) => setLightboxItem(img)}
            />
          ))}
        </div>
      )}

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

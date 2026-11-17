"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ItemRow } from "@/components/notes/ItemRow";
import { ImageLightbox } from "@/components/gallery/ImageLightbox";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import type { Item } from "@notes/shared";

export default function RecentPage() {
  const [items, setItems] = useState<(Item & { viewedAt: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightboxItem, setLightboxItem] = useState<Item | null>(null);

  useEffect(() => {
    async function loadRecent() {
      try {
        const res = await fetch("/api/user/recent");
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          setItems(data.data);
        }
      } catch (err) {
        console.error("Failed to load recent history:", err);
      } finally {
        setLoading(false);
      }
    }
    loadRecent();
  }, []);

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Recently Viewed</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Pick up right where you left off during your study sessions
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
          <p className="text-xs text-slate-400">Loading reading history...</p>
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title="No reading history yet"
          description="Notes and formula sheets you view will automatically appear here."
          action={{
            label: "Start Reading",
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

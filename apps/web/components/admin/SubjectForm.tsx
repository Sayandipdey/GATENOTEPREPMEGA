"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { compressImageToWebP } from "@/lib/image-compress";
import { GATE_CATEGORIES } from "@notes/shared";
import type { Subject } from "@notes/shared";

interface SubjectFormProps {
  initialData?: Partial<Subject> | null;
  onSuccess: (saved: Subject) => void;
  onCancel: () => void;
}

export function SubjectForm({
  initialData,
  onSuccess,
  onCancel,
}: SubjectFormProps) {
  const isEditing = Boolean(initialData?.id);

  const [name, setName] = useState(initialData?.name ?? "");
  const [category, setCategory] = useState(initialData?.category ?? "Core");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [thumbnailUrl, setThumbnailUrl] = useState(initialData?.thumbnailUrl ?? "");
  const [order, setOrder] = useState<number>(initialData?.order ?? 0);
  const [isPublished, setIsPublished] = useState<boolean>(
    initialData?.isPublished ?? true
  );

  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      // 1. Compress to WebP max 600px
      const { blob, filename } = await compressImageToWebP(file, 600, 0.85);

      // 2. Request upload URL
      const urlRes = await fetch("/api/admin/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename, contentType: "image/webp" }),
      });
      const config = await urlRes.json();
      if (!urlRes.ok || !config.uploadUrl) {
        throw new Error(config.error || "Failed to get upload destination");
      }

      // 3. Upload file
      const uploadRes = await fetch(config.uploadUrl, {
        method: "POST", // supports our direct upload endpoint or cloud PUT
        headers: { "Content-Type": "image/webp" },
        body: blob,
      });

      if (!uploadRes.ok) {
        // Try fallback PUT if it was a Google Storage signed URL
        const retryRes = await fetch(config.uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": "image/webp" },
          body: blob,
        });
        if (!retryRes.ok) {
          throw new Error("Failed to upload image data");
        }
      }

      setThumbnailUrl(config.publicUrl);
    } catch (err: any) {
      setError(err.message || "Failed to upload thumbnail");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Subject name is required");
      return;
    }

    setLoading(true);

    try {
      const url = isEditing
        ? `/api/admin/subjects/${initialData!.id}`
        : "/api/admin/subjects";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          category: category.trim() || "Core",
          description: description.trim(),
          thumbnailUrl: thumbnailUrl.trim(),
          order: Number(order),
          isPublished,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error ?? "Failed to save subject");
      }

      onSuccess(data.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error saving subject");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-xs font-sans">
      {error && (
        <div className="p-3 bg-red-950/60 border border-red-800/80 rounded-xl text-red-300">
          {error}
        </div>
      )}

      <div>
        <label className="block text-slate-300 mb-1.5 font-medium">
          Subject Name *
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Signals & Systems, Network Theory"
          className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          required
        />
      </div>

      <div>
        <label className="block text-slate-300 mb-1.5 font-medium">
          Category *
        </label>
        <div className="flex flex-wrap gap-2 mb-2">
          {GATE_CATEGORIES.filter((c) => c !== "All").map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                category === cat
                  ? "bg-indigo-600 border-indigo-500 text-white"
                  : "bg-slate-900 border-slate-700 text-slate-400 hover:text-white"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="Or type custom category..."
          className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div>
        <label className="block text-slate-300 mb-1.5 font-medium">
          Subject Thumbnail (Image)
        </label>
        <div className="flex items-center gap-3">
          {thumbnailUrl ? (
            <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-slate-700 bg-slate-900 shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={thumbnailUrl} alt="Thumbnail preview" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => setThumbnailUrl("")}
                className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 text-white flex items-center justify-center text-xs transition-opacity"
              >
                ✕
              </button>
            </div>
          ) : (
            <div className="w-14 h-14 rounded-xl border border-dashed border-slate-700 flex items-center justify-center text-slate-500 text-xs shrink-0">
              No icon
            </div>
          )}

          <div className="flex-1 space-y-1">
            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-medium cursor-pointer transition-colors">
              {uploading ? (
                <>
                  <Spinner className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Compressing & Uploading...</span>
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>Upload Image (Auto-WebP)</span>
                </>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleThumbnailUpload}
                disabled={uploading}
                className="hidden"
              />
            </label>
            <p className="text-[11px] text-slate-500">
              Or paste direct image URL below:
            </p>
            <input
              type="url"
              value={thumbnailUrl}
              onChange={(e) => setThumbnailUrl(e.target.value)}
              placeholder="https://..."
              className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700/80 rounded-lg text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      <div>
        <label className="block text-slate-300 mb-1.5 font-medium">
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="Brief summary of exam syllabus covered..."
          className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
        />
      </div>

      <div className="flex items-center justify-between pt-2">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={isPublished}
            onChange={(e) => setIsPublished(e.target.checked)}
            className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
          />
          <span className="text-slate-200 font-medium">Published (visible to students)</span>
        </label>
      </div>

      <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-800">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" isLoading={loading}>
          {isEditing ? "Save Changes" : "Create Subject"}
        </Button>
      </div>
    </form>
  );
}

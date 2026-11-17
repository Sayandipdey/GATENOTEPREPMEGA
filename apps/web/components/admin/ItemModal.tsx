"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { compressImageToWebP } from "@/lib/image-compress";
import { MEGA_URL_PREFIX, NOTE_TYPES } from "@notes/shared";
import type { Item, NoteFileType, ItemKind } from "@notes/shared";

interface ItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjectId: string;
  folderId?: string | null;
  defaultKind?: ItemKind;
  itemToEdit?: Item | null;
  onSuccess: (saved: Item) => void;
}

export function ItemModal({
  isOpen,
  onClose,
  subjectId,
  folderId = null,
  defaultKind = "file",
  itemToEdit,
  onSuccess,
}: ItemModalProps) {
  const isEditing = Boolean(itemToEdit);

  const [kind, setKind] = useState<ItemKind>(itemToEdit?.kind ?? defaultKind);
  const [title, setTitle] = useState(itemToEdit?.title ?? "");
  const [type, setType] = useState<NoteFileType>(itemToEdit?.type ?? "pdf");
  const [megaFileLink, setMegaFileLink] = useState(itemToEdit?.megaFileLink ?? "");
  const [imageUrl, setImageUrl] = useState(itemToEdit?.imageUrl ?? "");
  const [caption, setCaption] = useState(itemToEdit?.caption ?? "");
  const [isPublished, setIsPublished] = useState<boolean>(itemToEdit?.isPublished ?? true);

  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      // 1. Compress to WebP max 1600px
      const { blob, filename } = await compressImageToWebP(file, 1600, 0.88);

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
        method: "POST",
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

      setImageUrl(config.publicUrl);
      if (!title) {
        setTitle(file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "));
      }
    } catch (err: any) {
      setError(err.message || "Failed to upload diagram image");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    if (kind === "file") {
      if (!megaFileLink.trim().startsWith(MEGA_URL_PREFIX)) {
        setError(`File link must start with ${MEGA_URL_PREFIX}`);
        return;
      }
    } else {
      if (!imageUrl.trim()) {
        setError("Please upload an image or provide an image URL");
        return;
      }
    }

    setLoading(true);

    try {
      const url = isEditing
        ? `/api/admin/items/${itemToEdit!.id}`
        : "/api/admin/items";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectId,
          folderId: isEditing ? itemToEdit!.folderId : folderId,
          kind,
          title: title.trim(),
          type: kind === "file" ? type : undefined,
          megaFileLink: kind === "file" ? megaFileLink.trim() : undefined,
          imageUrl: kind === "image" ? imageUrl.trim() : undefined,
          caption: kind === "image" ? caption.trim() : undefined,
          isPublished,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to save item");
      }

      onSuccess(data.data);
      onClose();
    } catch (err: any) {
      setError(err.message || "Error saving item");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? `Edit ${kind === "file" ? "File Note" : "Diagram"}` : `Add New ${kind === "file" ? "File Link" : "Image / Diagram"}`}
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs font-sans">
        {error && (
          <div className="p-3 bg-red-950/60 border border-red-800/80 rounded-xl text-red-300">
            {error}
          </div>
        )}

        {/* Kind Toggle (when creating new) */}
        {!isEditing && (
          <div className="flex rounded-xl bg-slate-900 border border-slate-700 p-1">
            <button
              type="button"
              onClick={() => setKind("file")}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                kind === "file"
                  ? "bg-indigo-600 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              📄 File (MEGA PDF / PPT / DOC)
            </button>
            <button
              type="button"
              onClick={() => setKind("image")}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                kind === "image"
                  ? "bg-indigo-600 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              🖼️ Diagram / Image
            </button>
          </div>
        )}

        <div>
          <label className="block text-slate-300 mb-1 font-medium">
            Title *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={kind === "file" ? "e.g. Nyquist Stability Criterion Master Notes" : "e.g. Bode Plot Frequency Asymptotes Diagram"}
            className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            required
            autoFocus
          />
        </div>

        {kind === "file" ? (
          <>
            <div>
              <label className="block text-slate-300 mb-1 font-medium">
                Document Type
              </label>
              <div className="flex gap-2">
                {NOTE_TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={`px-3 py-1.5 rounded-lg uppercase font-mono text-xs font-bold border transition-colors ${
                      type === t
                        ? "bg-indigo-600 border-indigo-500 text-white"
                        : "bg-slate-900 border-slate-700 text-slate-400 hover:text-white"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-slate-300 mb-1 font-medium">
                MEGA File Public Link *
              </label>
              <input
                type="url"
                value={megaFileLink}
                onChange={(e) => setMegaFileLink(e.target.value)}
                placeholder="https://mega.nz/file/..."
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-xs"
                required
              />
              <p className="mt-1 text-[11px] text-slate-400">
                Encrypted public share link generated directly from MEGA cloud.
              </p>
            </div>
          </>
        ) : (
          <>
            <div>
              <label className="block text-slate-300 mb-1 font-medium">
                Diagram / Formula Image *
              </label>
              <div className="flex items-center gap-3">
                {imageUrl ? (
                  <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-700 bg-slate-900 shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imageUrl} alt="Diagram preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setImageUrl("")}
                      className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 text-white flex items-center justify-center text-xs transition-opacity"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-xl border border-dashed border-slate-700 flex flex-col items-center justify-center text-slate-500 text-xs shrink-0 p-1 text-center">
                    No image
                  </div>
                )}

                <div className="flex-1 space-y-1">
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium cursor-pointer transition-colors">
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
                        <span>Upload File (Auto-WebP 1600px)</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={uploading}
                      className="hidden"
                    />
                  </label>
                  <p className="text-[11px] text-slate-400">
                    Or paste direct image URL below:
                  </p>
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-slate-300 mb-1 font-medium">
                Caption / Notes (Optional)
              </label>
              <input
                type="text"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="e.g. Asymptotic slopes: -20dB/dec for simple pole"
                className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </>
        )}

        <div className="pt-2">
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

        <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-800">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={loading}>
            {isEditing ? "Save Item" : "Create Item"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

"use client";

import { useState, useRef } from "react";
import { compressImageToWebP } from "@/lib/image-compress";

interface ImageUploadPopoverProps {
  currentUrl?: string;
  onSelect: (url: string) => void;
  onClose: () => void;
}

export function ImageUploadPopover({
  currentUrl,
  onSelect,
  onClose,
}: ImageUploadPopoverProps) {
  const [urlInput, setUrlInput] = useState(currentUrl || "");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file (JPG, PNG, or WebP).");
      return;
    }

    try {
      setUploading(true);
      setError(null);

      // Compress client-side to WebP (max 1600px)
      const { blob, filename } = await compressImageToWebP(file, 1600, 0.85);

      // Upload via upload-file endpoint
      const formData = new FormData();
      formData.append("file", blob, filename);

      const res = await fetch("/api/admin/upload-file", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to upload image");
      }

      onSelect(data.data.url);
      onClose();
    } catch (err: any) {
      setError(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-5 font-sans space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <h4 className="font-semibold text-sm text-white">Attach Diagram Image</h4>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xs"
          >
            ✕
          </button>
        </div>

        {error && (
          <p className="p-2 rounded bg-red-950/50 border border-red-800/80 text-red-300 text-xs">
            {error}
          </p>
        )}

        {/* Upload File Button */}
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file);
            }}
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-2.5 px-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {uploading ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            )}
            {uploading ? "Compressing & Uploading..." : "Upload Image from Device"}
          </button>
        </div>

        <div className="flex items-center gap-2 my-2">
          <div className="flex-1 h-px bg-slate-800" />
          <span className="text-[10px] font-mono uppercase text-slate-500">or paste URL</span>
          <div className="flex-1 h-px bg-slate-800" />
        </div>

        {/* URL Input */}
        <div className="space-y-2">
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://example.com/diagram.webp"
            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 placeholder-slate-600 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <button
            type="button"
            disabled={!urlInput.trim()}
            onClick={() => {
              onSelect(urlInput.trim());
              onClose();
            }}
            className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 text-xs font-mono font-medium rounded-lg transition-colors"
          >
            Apply URL
          </button>
        </div>

        {/* Remove Image Option */}
        {currentUrl && (
          <div className="pt-2 border-t border-slate-800/80">
            <button
              type="button"
              onClick={() => {
                onSelect("");
                onClose();
              }}
              className="w-full py-1.5 text-xs text-red-400 hover:text-red-300 font-mono transition-colors text-center"
            >
              Remove Image
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

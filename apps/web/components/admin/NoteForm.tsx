"use client";

import { useState } from "react";
import { MegaLinkChecker } from "@/components/mega/MegaLinkChecker";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { NOTE_TYPES, type Note, type NoteType } from "@notes/shared";

interface NoteFormProps {
  subjectId: string;
  initialData?: Partial<Note> | null;
  onSuccess: (saved: Note) => void;
  onCancel: () => void;
}

export function NoteForm({
  subjectId,
  initialData,
  onSuccess,
  onCancel,
}: NoteFormProps) {
  const isEditing = Boolean(initialData?.id);

  const [title, setTitle] = useState(initialData?.title ?? "");
  const [type, setType] = useState<NoteType>(initialData?.type ?? "pdf");
  const [megaFileLink, setMegaFileLink] = useState(initialData?.megaFileLink ?? "");
  const [isPublished, setIsPublished] = useState<boolean>(
    initialData?.isPublished ?? true
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Note title is required");
      return;
    }
    if (!megaFileLink.trim().startsWith("https://mega.nz/")) {
      setError("MEGA link must start with https://mega.nz/");
      return;
    }

    setLoading(true);

    try {
      const url = isEditing
        ? `/api/admin/notes/${initialData!.id}`
        : "/api/admin/notes";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectId,
          title: title.trim(),
          type,
          megaFileLink: megaFileLink.trim(),
          isPublished,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error ?? "Failed to save note");
      }

      onSuccess(data.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error saving note");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 font-mono text-xs">
      {error && (
        <div className="p-3 bg-red-950/60 border border-red-800 rounded-lg text-red-300">
          {error}
        </div>
      )}

      <div>
        <label className="block text-gray-400 mb-1 font-semibold uppercase text-[10px]">
          Note Title *
        </label>
        <input
          type="text"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Unit 1: Asymptotic Complexity & Divide-and-Conquer"
          className="w-full px-3 py-2 bg-gray-950 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      <div>
        <label className="block text-gray-400 mb-1 font-semibold uppercase text-[10px]">
          Material Format / Type *
        </label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as NoteType)}
          className="w-full px-3 py-2 bg-gray-950 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 uppercase"
        >
          {NOTE_TYPES.map((t) => (
            <option key={t} value={t}>
              {t.toUpperCase()} Document
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-gray-400 mb-1 font-semibold uppercase text-[10px]">
          MEGA Public File Share Link *
        </label>
        <input
          type="url"
          required
          value={megaFileLink}
          onChange={(e) => setMegaFileLink(e.target.value)}
          placeholder="https://mega.nz/file/XXXXXX#YYYYYY"
          className="w-full px-3 py-2 bg-gray-950 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
        />
        <MegaLinkChecker url={megaFileLink} />
      </div>

      <div className="flex items-center gap-2 pt-1">
        <input
          type="checkbox"
          id="notePublished"
          checked={isPublished}
          onChange={(e) => setIsPublished(e.target.checked)}
          className="w-4 h-4 rounded border-gray-700 text-indigo-600 focus:ring-indigo-500 bg-gray-950"
        />
        <label htmlFor="notePublished" className="text-gray-300 font-sans text-xs select-none cursor-pointer">
          Publish immediately (visible to all students enrolled in this course)
        </label>
      </div>

      <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-gray-800">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={loading}>
          {loading ? (
            <span className="flex items-center gap-1.5">
              <Spinner className="w-3.5 h-3.5" /> Saving...
            </span>
          ) : isEditing ? (
            "Update Note"
          ) : (
            "Add Note"
          )}
        </Button>
      </div>
    </form>
  );
}

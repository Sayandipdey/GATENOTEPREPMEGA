"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import type { Folder } from "@notes/shared";

interface FolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjectId: string;
  parentFolderId?: string | null;
  folderToEdit?: Folder | null;
  onSuccess: (folder: Folder) => void;
}

export function FolderModal({
  isOpen,
  onClose,
  subjectId,
  parentFolderId = null,
  folderToEdit,
  onSuccess,
}: FolderModalProps) {
  const isEditing = Boolean(folderToEdit);
  const [name, setName] = useState(folderToEdit?.name ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Folder name is required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const url = isEditing
        ? `/api/admin/folders/${folderToEdit!.id}`
        : "/api/admin/folders";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectId,
          parentId: isEditing ? folderToEdit!.parentId : parentFolderId,
          name: name.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to save folder");
      }

      setName("");
      onSuccess(data.data);
      onClose();
    } catch (err: any) {
      setError(err.message || "Error saving folder");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? "Rename Folder" : "Create New Folder"}
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs font-sans">
        {error && (
          <div className="p-3 bg-red-950/60 border border-red-800/80 rounded-xl text-red-300">
            {error}
          </div>
        )}

        <div>
          <label className="block text-slate-300 mb-1.5 font-medium">
            Folder Name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Unit 1: Fourier Series, Revision Sheets"
            className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            autoFocus
            required
          />
        </div>

        <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-800">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={loading}>
            {isEditing ? "Save Name" : "Create Folder"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

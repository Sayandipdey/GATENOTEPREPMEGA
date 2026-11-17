"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SubjectForm } from "@/components/admin/SubjectForm";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import type { Subject } from "@notes/shared";

export default function AdminSubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [reorderDirty, setReorderDirty] = useState(false);
  const [savingReorder, setSavingReorder] = useState(false);

  const fetchSubjects = async () => {
    try {
      const res = await fetch("/api/admin/subjects");
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setSubjects(data.data);
      }
    } catch (err) {
      console.error("Error loading subjects:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  const handleTogglePublish = async (id: string, current: boolean) => {
    try {
      const res = await fetch(`/api/admin/subjects/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished: !current }),
      });
      const data = await res.json();
      if (data.success) {
        setSubjects((prev) =>
          prev.map((s) => (s.id === id ? { ...s, isPublished: !current } : s))
        );
      }
    } catch (err) {
      console.error("Error toggling publish:", err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure? This will delete the subject along with all its folders and items!")) {
      return;
    }
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/subjects/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setSubjects((prev) => prev.filter((s) => s.id !== id));
      }
    } catch (err) {
      console.error("Error deleting subject:", err);
    } finally {
      setDeletingId(null);
    }
  };

  const moveRow = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= subjects.length) return;

    const updated = [...subjects];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;

    setSubjects(updated);
    setReorderDirty(true);
  };

  const saveOrder = async () => {
    setSavingReorder(true);
    try {
      const ids = subjects.map((s) => s.id);
      const res = await fetch("/api/admin/subjects/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      const data = await res.json();
      if (data.success) {
        setReorderDirty(false);
      }
    } catch (err) {
      console.error("Error reordering:", err);
    } finally {
      setSavingReorder(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">GATE Subjects</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Manage subjects, nested folder hierarchies, notes, and study diagrams
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {reorderDirty && (
            <Button
              variant="secondary"
              size="sm"
              onClick={saveOrder}
              isLoading={savingReorder}
            >
              Save New Order
            </Button>
          )}

          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setEditingSubject(null);
              setIsModalOpen(true);
            }}
          >
            + Add Subject
          </Button>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Spinner className="w-7 h-7 text-indigo-500" />
          <p className="text-xs text-slate-400">Loading subjects...</p>
        </div>
      ) : subjects.length === 0 ? (
        <EmptyState
          title="No subjects yet"
          description="Create your first GATE subject or use the bulk importer to add subjects and folders."
          action={{
            label: "+ Add Subject",
            onClick: () => {
              setEditingSubject(null);
              setIsModalOpen(true);
            },
          }}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {subjects.map((sub, index) => (
            <div
              key={sub.id}
              className="flex items-center justify-between p-4 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-850 hover:border-slate-700 transition-all gap-4"
            >
              <div className="flex items-center gap-4 min-w-0 flex-1">
                {/* Reorder handles */}
                <div className="flex flex-col gap-1 text-slate-500 shrink-0">
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => moveRow(index, "up")}
                    className="hover:text-slate-200 disabled:opacity-20"
                    title="Move up"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    disabled={index === subjects.length - 1}
                    onClick={() => moveRow(index, "down")}
                    className="hover:text-slate-200 disabled:opacity-20"
                    title="Move down"
                  >
                    ▼
                  </button>
                </div>

                {/* Thumbnail / Monogram */}
                {sub.thumbnailUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={sub.thumbnailUrl}
                    alt={sub.name}
                    className="w-12 h-12 rounded-lg object-cover border border-slate-700/60 shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-indigo-950/60 border border-indigo-700/30 flex items-center justify-center text-xs font-mono font-bold text-indigo-400 shrink-0">
                    {sub.name.slice(0, 2).toUpperCase()}
                  </div>
                )}

                {/* Details */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/admin/subjects/${sub.id}`}
                      className="text-sm font-semibold text-white hover:text-indigo-400 transition-colors truncate"
                    >
                      {sub.name}
                    </Link>
                    <Badge variant="indigo" size="sm">
                      {sub.category || "Core"}
                    </Badge>
                  </div>
                  {sub.description && (
                    <p className="text-xs text-slate-400 truncate mt-0.5 max-w-lg">
                      {sub.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 shrink-0">
                {/* Publish Toggle Button */}
                <button
                  type="button"
                  onClick={() => handleTogglePublish(sub.id, sub.isPublished)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                    sub.isPublished
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
                      : "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700"
                  }`}
                >
                  {sub.isPublished ? "Published" : "Draft"}
                </button>

                {/* Open File Explorer & Sheet */}
                <Link
                  href={`/admin/subjects/${sub.id}/sheet`}
                  className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors flex items-center gap-1 font-mono"
                  title="Open Spreadsheet Editor"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                  </svg>
                  <span>Sheet</span>
                </Link>

                <Link
                  href={`/admin/subjects/${sub.id}`}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-indigo-600/90 hover:bg-indigo-600 text-white transition-colors flex items-center gap-1.5"
                >
                  <span>Explorer</span>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>

                {/* Edit */}
                <button
                  type="button"
                  onClick={() => {
                    setEditingSubject(sub);
                    setIsModalOpen(true);
                  }}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                  title="Edit Subject"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>

                {/* Delete */}
                <button
                  type="button"
                  disabled={deletingId === sub.id}
                  onClick={() => handleDelete(sub.id)}
                  className="p-1.5 text-red-400 hover:text-red-300 rounded-lg hover:bg-red-950/40 transition-colors disabled:opacity-40"
                  title="Delete Subject"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingSubject ? "Edit Subject" : "Create New GATE Subject"}
      >
        <SubjectForm
          initialData={editingSubject}
          onSuccess={(saved) => {
            setIsModalOpen(false);
            if (editingSubject) {
              setSubjects((prev) =>
                prev.map((s) => (s.id === saved.id ? saved : s))
              );
            } else {
              setSubjects((prev) => [...prev, saved]);
            }
          }}
          onCancel={() => setIsModalOpen(false)}
        />
      </Modal>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import type { AllowedUser } from "@notes/shared";

export default function AllowedUsersPage() {
  const [allowedUsers, setAllowedUsers] = useState<AllowedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Single Add form
  const [singleIdentifier, setSingleIdentifier] = useState("");
  const [singleNotes, setSingleNotes] = useState("");
  const [addingSingle, setAddingSingle] = useState(false);

  // Bulk CSV Paste form
  const [bulkText, setBulkText] = useState("");
  const [showBulkPaste, setShowBulkPaste] = useState(false);
  const [addingBulk, setAddingBulk] = useState(false);

  const [toast, setToast] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchAllowedUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/allowed-users");
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setAllowedUsers(data.data);
      }
    } catch (err) {
      console.error("Failed to load allowed users:", err);
      showToast("Failed to load allowed users", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllowedUsers();
  }, []);

  const handleAddSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleIdentifier.trim()) return;

    try {
      setAddingSingle(true);
      const res = await fetch("/api/admin/allowed-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: singleIdentifier.trim(),
          notes: singleNotes.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to add user");
      }

      setSingleIdentifier("");
      setSingleNotes("");
      showToast(`Added ${data.data.identifier} to allowlist!`);
      fetchAllowedUsers();
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setAddingSingle(false);
    }
  };

  const handleAddBulk = async () => {
    const lines = bulkText
      .split(/[\n,;]+/)
      .map((l) => l.trim().toLowerCase())
      .filter(Boolean);

    if (lines.length === 0) return;

    try {
      setAddingBulk(true);
      const res = await fetch("/api/admin/allowed-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifiers: lines }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to import users");
      }

      setBulkText("");
      setShowBulkPaste(false);
      showToast(`Allowlist updated! Added: ${data.data.added}, Skipped (duplicates): ${data.data.skipped}`);
      fetchAllowedUsers();
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setAddingBulk(false);
    }
  };

  const handleDelete = async (identifier: string) => {
    if (!confirm(`Remove ${identifier} from the allowlist?`)) return;

    try {
      const res = await fetch(`/api/admin/allowed-users?identifier=${encodeURIComponent(identifier)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to delete user");
      }

      setAllowedUsers((prev) => prev.filter((u) => u.identifier !== identifier));
      showToast(`Removed ${identifier} from allowlist.`);
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const filteredUsers = allowedUsers.filter(
    (u) =>
      u.identifier.toLowerCase().includes(search.toLowerCase().trim()) ||
      u.notes?.toLowerCase().includes(search.toLowerCase().trim())
  );

  return (
    <div className="space-y-8 font-sans max-w-6xl mx-auto">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 px-4 py-2.5 rounded-xl font-mono text-xs shadow-2xl flex items-center gap-2 animate-slide-down ${
            toast.type === "success"
              ? "bg-emerald-950 border border-emerald-700 text-emerald-200"
              : "bg-red-950 border border-red-700 text-red-200"
          }`}
        >
          <span>{toast.type === "success" ? "✓" : "⚠"}</span>
          <span>{toast.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-mono text-2xl font-bold tracking-tight text-white">
              Allowed Users
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-mono text-xs font-semibold">
              SIGNUP_MODE: ALLOWLIST
            </span>
          </div>
          <p className="text-xs font-mono text-slate-400 mt-1">
            Private-access management: only students on this list can log in.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setShowBulkPaste(!showBulkPaste)}
            className="font-mono text-xs"
          >
            📋 {showBulkPaste ? "Hide CSV Paste" : "Paste CSV / Multiline"}
          </Button>
        </div>
      </div>

      {/* Bulk CSV Paste Accordion */}
      {showBulkPaste && (
        <div className="p-5 bg-slate-900 border border-indigo-500/40 rounded-2xl shadow-xl space-y-3 font-mono text-xs animate-fade-in">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-white">Bulk Paste Allowed Emails or Mobile Numbers</h3>
            <span className="text-slate-400 text-[11px]">Separate by newlines or commas</span>
          </div>
          <textarea
            rows={5}
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            placeholder={`student1@gmail.com\n+919876543210\nstudent2@university.edu`}
            className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setShowBulkPaste(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={addingBulk || !bulkText.trim()}
              onClick={handleAddBulk}
            >
              {addingBulk ? <Spinner size={14} /> : "Import All to Allowlist"}
            </Button>
          </div>
        </div>
      )}

      {/* Add Single User Box */}
      <form
        onSubmit={handleAddSingle}
        className="p-5 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-3"
      >
        <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
          + Add Single Allowed Student
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <input
              type="text"
              required
              value={singleIdentifier}
              onChange={(e) => setSingleIdentifier(e.target.value)}
              placeholder="Email (student@example.com) or Phone (+919876543210)"
              className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={singleNotes}
              onChange={(e) => setSingleNotes(e.target.value)}
              placeholder="Notes (e.g. Batch 2026)"
              className="flex-1 px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={addingSingle || !singleIdentifier.trim()}
              className="font-mono shrink-0"
            >
              {addingSingle ? <Spinner size={14} /> : "Add User"}
            </Button>
          </div>
        </div>
      </form>

      {/* Search Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative w-full max-w-sm">
          <svg
            className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search allowed emails or phones..."
            className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <span className="text-xs font-mono text-slate-400">
          Showing {filteredUsers.length} of {allowedUsers.length}
        </span>
      </div>

      {/* Table */}
      {loading ? (
        <div className="p-12 flex justify-center">
          <Spinner size={24} />
        </div>
      ) : filteredUsers.length === 0 ? (
        <EmptyState
          icon="🛡️"
          title="No allowed users found"
          description={
            search
              ? "No allowed users match your search query."
              : "No users on the allowlist yet. When SIGNUP_MODE=allowlist, only users on this list can log in."
          }
        />
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden font-mono text-xs">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 uppercase text-[10px]">
                <th className="py-3 px-4">Identifier (Email / Phone)</th>
                <th className="py-3 px-4">Added Date</th>
                <th className="py-3 px-4">Added By</th>
                <th className="py-3 px-4">Notes</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredUsers.map((user) => (
                <tr key={user.identifier} className="hover:bg-slate-850/50 transition-colors">
                  <td className="py-3 px-4 font-semibold text-slate-200">
                    {user.identifier}
                  </td>
                  <td className="py-3 px-4 text-slate-400">
                    {new Date(user.addedAt).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4 text-slate-400">
                    {user.addedBy}
                  </td>
                  <td className="py-3 px-4 text-slate-400">
                    {user.notes || "—"}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => handleDelete(user.identifier)}
                      className="px-2.5 py-1 rounded-lg bg-red-950/40 border border-red-800/60 text-red-400 hover:bg-red-900/60 text-[11px] transition-colors"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

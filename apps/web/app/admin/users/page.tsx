"use client";

import { useEffect, useState, useCallback } from "react";
import { UserTable } from "@/components/admin/UserTable";
import { Spinner } from "@/components/ui/Spinner";
import type { User } from "@notes/shared";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const loadUsers = useCallback(async (query = "") => {
    try {
      const q = query ? `?search=${encodeURIComponent(query)}` : "";
      const res = await fetch(`/api/admin/users${q}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setUsers(data.data);
      }
    } catch (err) {
      console.error("Failed to load users:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    loadUsers(searchTerm);
  };

  const handlePromote = async (id: string) => {
    const res = await fetch(`/api/admin/users/${id}/promote`, { method: "POST" });
    const data = await res.json();
    if (data.success) {
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, role: "admin" } : u)));
    } else {
      alert(data.error ?? "Failed to promote user");
    }
  };

  const handleToggleDisable = async (id: string, currentDisabled: boolean) => {
    const res = await fetch(`/api/admin/users/${id}/disable`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ disable: !currentDisabled }),
    });
    const data = await res.json();
    if (data.success) {
      setUsers((prev) =>
        prev.map((u) => (u.id === id ? { ...u, isDisabled: !currentDisabled } : u))
      );
    } else {
      alert(data.error ?? "Failed to update user status");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-800">
        <div>
          <h1 className="font-mono text-2xl font-bold tracking-tight text-white">
            User Accounts
          </h1>
          <p className="text-xs font-mono text-gray-400 mt-1">
            Registered students and platform administrators verified via Phone.email OTP
          </p>
        </div>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search email, phone, name..."
            className="px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-xs font-mono text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-64"
          />
          <button
            type="submit"
            className="px-3 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-200 text-xs font-mono rounded-lg transition-colors"
          >
            Search
          </button>
        </form>
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <Spinner className="w-8 h-8 text-indigo-500" />
          <p className="text-xs font-mono text-gray-400">Loading user accounts...</p>
        </div>
      ) : (
        <UserTable
          users={users}
          onPromote={handlePromote}
          onToggleDisable={handleToggleDisable}
        />
      )}
    </div>
  );
}

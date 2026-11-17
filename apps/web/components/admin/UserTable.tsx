"use client";

import { useState } from "react";
import type { User } from "@notes/shared";

interface UserTableProps {
  users: User[];
  onPromote: (id: string) => Promise<void>;
  onToggleDisable: (id: string, currentDisabled: boolean) => Promise<void>;
}

export function UserTable({ users, onPromote, onToggleDisable }: UserTableProps) {
  const [actingId, setActingId] = useState<string | null>(null);

  const handlePromote = async (user: User) => {
    if (
      !window.confirm(
        `Are you sure you want to promote ${user.name || user.email || user.phone} to Admin?`
      )
    ) {
      return;
    }
    setActingId(user.id);
    try {
      await onPromote(user.id);
    } finally {
      setActingId(null);
    }
  };

  const handleDisableToggle = async (user: User) => {
    const action = user.isDisabled ? "enable" : "disable";
    if (
      !window.confirm(
        `Are you sure you want to ${action} user ${user.name || user.email || user.phone}?`
      )
    ) {
      return;
    }
    setActingId(user.id);
    try {
      await onToggleDisable(user.id, user.isDisabled);
    } finally {
      setActingId(null);
    }
  };

  if (users.length === 0) {
    return (
      <div className="p-12 text-center bg-gray-900 border border-gray-800 rounded-xl space-y-2 font-mono">
        <p className="text-sm text-gray-300">No users match your criteria.</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left font-mono text-xs">
          <thead className="bg-gray-950/60 border-b border-gray-800 text-gray-500 uppercase text-[10px]">
            <tr>
              <th className="py-3 px-4">User</th>
              <th className="py-3 px-4">Identifier</th>
              <th className="py-3 px-3 text-center">Role</th>
              <th className="py-3 px-3 text-center">Joined</th>
              <th className="py-3 px-3 text-center">Last Active</th>
              <th className="py-3 px-3 text-center">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/60">
            {users.map((u) => {
              const isWorking = actingId === u.id;
              const identifier = u.email ?? u.phone ?? "N/A";

              return (
                <tr
                  key={u.id}
                  className={`hover:bg-gray-850/40 transition-colors ${
                    u.isDisabled ? "opacity-60 bg-red-950/10" : ""
                  }`}
                >
                  <td className="py-3 px-4 font-semibold text-white">
                    {u.name || "Anonymous User"}
                  </td>

                  <td className="py-3 px-4 text-gray-300">
                    <span className="bg-gray-800 px-2 py-0.5 rounded text-[11px]">
                      {identifier}
                    </span>
                  </td>

                  <td className="py-3 px-3 text-center">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        u.role === "admin"
                          ? "bg-purple-950 text-purple-400 border border-purple-800"
                          : "bg-gray-800 text-gray-400 border border-gray-700"
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>

                  <td className="py-3 px-3 text-center text-gray-400">
                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "-"}
                  </td>

                  <td className="py-3 px-3 text-center text-gray-400">
                    {u.lastSeen ? new Date(u.lastSeen).toLocaleDateString() : "-"}
                  </td>

                  <td className="py-3 px-3 text-center">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        u.isDisabled
                          ? "bg-red-950 text-red-400 border border-red-800"
                          : "bg-emerald-950 text-emerald-400 border border-emerald-800"
                      }`}
                    >
                      {u.isDisabled ? "DISABLED" : "ACTIVE"}
                    </span>
                  </td>

                  <td className="py-3 px-4 text-right space-x-2">
                    {u.role !== "admin" && (
                      <button
                        type="button"
                        disabled={isWorking}
                        onClick={() => handlePromote(u)}
                        className="px-2.5 py-1 bg-purple-950/60 hover:bg-purple-900 border border-purple-800 text-purple-300 rounded text-[11px] disabled:opacity-50"
                      >
                        {isWorking ? "..." : "Make Admin"}
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={isWorking}
                      onClick={() => handleDisableToggle(u)}
                      className={`px-2.5 py-1 rounded text-[11px] disabled:opacity-50 border ${
                        u.isDisabled
                          ? "bg-emerald-950/60 text-emerald-300 border-emerald-800 hover:bg-emerald-900"
                          : "bg-red-950/60 text-red-300 border-red-800 hover:bg-red-900"
                      }`}
                    >
                      {isWorking ? "..." : u.isDisabled ? "Enable" : "Disable"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

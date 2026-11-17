import Link from "next/link";
import { DashboardStats } from "@/components/admin/DashboardStats";
import { SignupChart } from "@/components/admin/SignupChart";
import { OtpLogsTable } from "@/components/admin/OtpLogsTable";
import { db } from "@/lib/db";
import type { OtpUsageRecord } from "@notes/shared";

export const dynamic = "force-dynamic";

async function getDashboardData() {
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const stats = await db.stats.get();
  const allUsers = await db.users.list();

  let active24h = 0;
  let active7d = 0;

  const signupMap = new Map<string, number>();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    signupMap.set(d.toISOString().split("T")[0], 0);
  }

  allUsers.forEach((user) => {
    if (user.lastSeen && user.lastSeen >= oneDayAgo) active24h++;
    if (user.lastSeen && user.lastSeen >= sevenDaysAgo) active7d++;

    if (user.createdAt && user.createdAt >= thirtyDaysAgo) {
      const day = user.createdAt.split("T")[0];
      if (signupMap.has(day)) {
        signupMap.set(day, (signupMap.get(day) ?? 0) + 1);
      }
    }
  });

  const signupHistory = Array.from(signupMap.entries()).map(([date, count]) => ({
    date,
    count,
  }));

  const topNotes = await db.notes.topViewed(5);
  const otpUsage = await db.otpUsage.getDailyStats(14);
  const initialOtpLogs = await db.otpLogs.list(30);

  return {
    stats: {
      totalUsers: stats.totalUsers,
      totalSubjects: stats.totalSubjects,
      totalNotes: stats.totalNotes,
      totalViews: stats.totalViews,
      active24h,
      active7d,
    },
    signupHistory,
    topNotes,
    otpUsage,
    initialOtpLogs,
  };
}

export default async function AdminDashboardPage() {
  const data = await getDashboardData();
  const otpTotals = data.otpUsage.reduce(
    (acc, r: OtpUsageRecord) => ({
      email: acc.email + r.email,
      phone: acc.phone + r.phone,
      brevo: acc.brevo + (r.brevo ?? 0),
      total: acc.total + r.total,
    }),
    { email: 0, phone: 0, brevo: 0, total: 0 }
  );

  return (
    <div className="space-y-8">
      {/* Title & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-800">
        <div>
          <h1 className="font-mono text-2xl font-bold tracking-tight text-white">
            System Overview
          </h1>
          <p className="text-xs font-mono text-gray-400 mt-1">
            Real-time platform metrics, storage status, and user activity
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/admin/subjects"
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-mono font-medium rounded-lg transition-colors flex items-center gap-1.5"
          >
            <span>+ Add Subject</span>
          </Link>
          <Link
            href="/admin/import"
            className="px-3.5 py-2 bg-gray-900 hover:bg-gray-800 border border-gray-700 text-gray-200 text-xs font-mono font-medium rounded-lg transition-colors"
          >
            Excel / CSV Import
          </Link>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <DashboardStats stats={data.stats} />

      {/* Live OTP Requests Console (Manual Dispatch by Admin) */}
      <OtpLogsTable initialLogs={data.initialOtpLogs} />

      {/* 30-Day Signup Trend Chart */}
      <SignupChart data={data.signupHistory} />

      {/* Top 5 Most Viewed Notes Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-mono text-sm font-semibold text-white">
              Most Viewed Study Notes
            </h3>
            <p className="text-xs text-gray-400 font-mono mt-0.5">
              Ranked by cumulative document openings
            </p>
          </div>
          <Link
            href="/admin/subjects"
            className="text-xs font-mono text-indigo-400 hover:text-indigo-300"
          >
            Manage Notes →
          </Link>
        </div>

        {data.topNotes.length === 0 ? (
          <p className="text-xs font-mono text-gray-500 py-6 text-center">
            No notes have recorded views yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-gray-800 text-gray-500 uppercase">
                  <th className="py-2.5 px-3">Title</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3 text-right">Views</th>
                  <th className="py-2.5 px-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {data.topNotes.map((note) => (
                  <tr key={note.id} className="hover:bg-gray-850/50 transition-colors">
                    <td className="py-3 px-3 font-medium text-gray-200 truncate max-w-xs">
                      {note.title}
                    </td>
                    <td className="py-3 px-3">
                      <span className="uppercase px-2 py-0.5 bg-gray-800 text-gray-300 rounded text-[10px]">
                        {note.type}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right text-indigo-400 font-bold">
                      {note.viewCount.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] ${
                          note.isPublished
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                            : "bg-gray-800 text-gray-400"
                        }`}
                      >
                        {note.isPublished ? "PUBLISHED" : "DRAFT"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {/* OTP Usage Counters (last 14 days) */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-mono text-sm font-semibold text-white">
              Auth Verifications — Last 14 Days
            </h3>
            <p className="text-xs text-gray-400 font-mono mt-0.5">
              OTP sign-in events by method (free-tier usage monitor)
            </p>
          </div>
          <div className="flex gap-3 text-xs font-mono">
            <span className="px-2 py-1 bg-indigo-950 border border-indigo-800 text-indigo-300 rounded">
              Email: {otpTotals.email}
            </span>
            <span className="px-2 py-1 bg-sky-950 border border-sky-800 text-sky-300 rounded">
              Phone: {otpTotals.phone}
            </span>
            {otpTotals.brevo > 0 && (
              <span className="px-2 py-1 bg-violet-950 border border-violet-800 text-violet-300 rounded">
                Brevo: {otpTotals.brevo}
              </span>
            )}
            <span className="px-2 py-1 bg-emerald-950 border border-emerald-800 text-emerald-300 rounded font-bold">
              Total: {otpTotals.total}
            </span>
          </div>
        </div>

        {/* Daily breakdown table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-gray-800 text-gray-500 uppercase text-[10px]">
                <th className="py-2 px-3">Date</th>
                <th className="py-2 px-3 text-right text-indigo-400">Email</th>
                <th className="py-2 px-3 text-right text-sky-400">Phone</th>
                <th className="py-2 px-3 text-right text-violet-400">Brevo</th>
                <th className="py-2 px-3 text-right text-emerald-400">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {data.otpUsage
                .slice()
                .reverse()
                .map((row: OtpUsageRecord) => (
                  <tr
                    key={row.date}
                    className={`transition-colors ${
                      row.total > 0
                        ? "hover:bg-gray-800/40"
                        : "opacity-40"
                    }`}
                  >
                    <td className="py-2 px-3 text-gray-300">{row.date}</td>
                    <td className="py-2 px-3 text-right text-indigo-300">
                      {row.email || "—"}
                    </td>
                    <td className="py-2 px-3 text-right text-sky-300">
                      {row.phone || "—"}
                    </td>
                    <td className="py-2 px-3 text-right text-violet-300">
                      {row.brevo || "—"}
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-emerald-300">
                      {row.total || "—"}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

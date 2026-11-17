import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, jsonOk, jsonError } from "@/lib/helpers";

/**
 * GET /api/admin/stats
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    requireAdmin(req);

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const globalStats = await db.stats.get();
    const allUsers = await db.users.list();

    let active24h = 0;
    let active7d = 0;

    const signupMap = new Map<string, number>();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().split("T")[0];
      signupMap.set(key, 0);
    }

    allUsers.forEach((user) => {
      if (user.lastSeen && user.lastSeen >= oneDayAgo) active24h++;
      if (user.lastSeen && user.lastSeen >= sevenDaysAgo) active7d++;

      if (user.createdAt && user.createdAt >= thirtyDaysAgo) {
        const dateKey = user.createdAt.split("T")[0];
        if (signupMap.has(dateKey)) {
          signupMap.set(dateKey, (signupMap.get(dateKey) ?? 0) + 1);
        }
      }
    });

    const signupHistory = Array.from(signupMap.entries()).map(([date, count]) => ({
      date,
      count,
    }));

    const topNotes = await db.notes.topViewed(5);

    return jsonOk({
      totalUsers: globalStats.totalUsers,
      totalSubjects: globalStats.totalSubjects,
      totalNotes: globalStats.totalNotes,
      totalViews: globalStats.totalViews,
      active24h,
      active7d,
      topNotes,
      signupHistory,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load dashboard statistics";
    const status = (err as { status?: number }).status ?? 500;
    return jsonError(message, status);
  }
}

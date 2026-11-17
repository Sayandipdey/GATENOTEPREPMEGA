import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserIdFromRequest, jsonOk, jsonError } from "@/lib/helpers";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/subjects
 * Returns all published GATE subjects with item counts.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    getUserIdFromRequest(req);
    const subjects = await db.subjects.list(true);
    
    // Add item count to each subject
    const subjectsWithCounts = await Promise.all(
      subjects.map(async (sub) => {
        const items = await db.items.listBySubject(sub.id, true);
        return {
          ...sub,
          itemCount: items.length,
        };
      })
    );

    return jsonOk(subjectsWithCounts);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch subjects";
    return jsonError(message, 500);
  }
}

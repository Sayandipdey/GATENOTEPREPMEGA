import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { SheetCommitSchema } from "@notes/shared";
import { getCurrentUser } from "@/lib/current-user";
import { jsonOk, jsonError } from "@/lib/helpers";

/**
 * POST /api/admin/subjects/[id]/sheet/commit
 * Executes an atomic batch of create, update, delete, move, and order operations
 * from the spreadsheet editor with concurrency checking.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") {
      return jsonError("Unauthorized", 401);
    }

    const { id: subjectId } = params;
    const subject = await db.subjects.get(subjectId);
    if (!subject) {
      return jsonError("Subject not found", 404);
    }

    const body = await req.json();
    const parsed = SheetCommitSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.errors[0]?.message || "Invalid commit payload", 400);
    }

    const result = await db.sheet.commit(subjectId, parsed.data);
    return jsonOk(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to commit sheet changes";
    return jsonError(message, 500);
  }
}

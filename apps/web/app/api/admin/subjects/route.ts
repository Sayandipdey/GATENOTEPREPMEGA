import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, jsonOk, jsonError } from "@/lib/helpers";
import { SubjectCreateSchema } from "@notes/shared";

/**
 * GET /api/admin/subjects
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    requireAdmin(req);
    const subjects = await db.subjects.list(false);
    return jsonOk(subjects);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch subjects";
    const status = (err as { status?: number }).status ?? 500;
    return jsonError(message, status);
  }
}

/**
 * POST /api/admin/subjects
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    requireAdmin(req);

    const body = await req.json();
    const parsed = SubjectCreateSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "Invalid subject data", 400);
    }

    const newSubject = await db.subjects.create(parsed.data);
    return jsonOk(newSubject, 201);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create subject";
    const status = (err as { status?: number }).status ?? 500;
    return jsonError(message, status);
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getUploadConfig } from "@/lib/storage";
import { getCurrentUser } from "@/lib/current-user";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { filename, contentType } = await req.json();
    if (!filename || !contentType) {
      return NextResponse.json({ error: "Missing filename or contentType" }, { status: 400 });
    }

    const config = await getUploadConfig(filename, contentType);
    return NextResponse.json(config);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to create upload URL" }, { status: 500 });
  }
}

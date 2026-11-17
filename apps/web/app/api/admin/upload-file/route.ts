import { NextRequest, NextResponse } from "next/server";
import { saveLocalUpload } from "@/lib/storage";
import { getCurrentUser } from "@/lib/current-user";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const filename = searchParams.get("filename");
  if (!filename) {
    return NextResponse.json({ error: "Filename is required" }, { status: 400 });
  }

  try {
    const arrayBuffer = await req.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const publicUrl = await saveLocalUpload(filename, buffer);
    return NextResponse.json({ success: true, publicUrl });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to save file" }, { status: 500 });
  }
}

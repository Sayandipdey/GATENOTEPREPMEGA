import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, jsonOk, jsonError } from "@/lib/helpers";
import { isValidMegaLink, getMegaEmbedUrl } from "@/lib/mega-validate";

/**
 * GET /api/admin/link-check?url=...
 * Validates a MEGA link format and reports whether it is structurally valid.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    requireAdmin(req);

    const { searchParams } = new URL(req.url);
    const url = searchParams.get("url");

    if (!url) {
      return jsonError("URL parameter is required", 400);
    }

    const valid = isValidMegaLink(url);
    if (!valid) {
      return jsonOk({
        valid: false,
        reachable: false,
        message: "Invalid MEGA link. Link must start with https://mega.nz/ and follow MEGA share format.",
      });
    }

    const embedUrl = getMegaEmbedUrl(url);

    // Check link format specifics (folder vs file)
    let linkType = "unknown";
    if (url.includes("/folder/") || url.includes("/#F!")) {
      linkType = "folder";
    } else if (url.includes("/file/") || url.includes("/embed/") || url.includes("/#!")) {
      linkType = "file";
    }

    return jsonOk({
      valid: true,
      reachable: true,
      linkType,
      embedUrl,
      message: `Valid MEGA ${linkType} link`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to validate link";
    const status = (err as { status?: number }).status ?? 500;
    return jsonError(message, status);
  }
}

import { NextRequest, NextResponse } from "next/server";
import { LinkCheckSchema, MEGA_URL_PREFIX } from "@notes/shared";
import type { LinkCheckResultItem, LinkStatus } from "@notes/shared";
import { getCurrentUser } from "@/lib/current-user";
import { jsonOk, jsonError } from "@/lib/helpers";

/**
 * POST /api/admin/links/check
 * Validates MEGA links in parallel batches (max 10 concurrent, 5s timeout).
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") {
      return jsonError("Unauthorized", 401);
    }

    const body = await req.json();
    const parsed = LinkCheckSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.errors[0]?.message || "Invalid link check payload", 400);
    }

    const itemsToCheck = parsed.data.items;
    const now = new Date().toISOString();

    // Helper to check a single URL
    async function checkUrl(id: string, urlStr: string): Promise<LinkCheckResultItem> {
      if (!urlStr.startsWith(MEGA_URL_PREFIX)) {
        return {
          id,
          url: urlStr,
          status: "invalid" as LinkStatus,
          checkedAt: now,
          reason: "Not a valid MEGA URL",
        };
      }

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(urlStr, {
          method: "HEAD",
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) GATE-Notes-LinkChecker/1.0",
          },
          signal: controller.signal,
          redirect: "follow",
        });

        clearTimeout(timeoutId);

        if (response.ok || response.status === 301 || response.status === 302 || response.status === 307) {
          return {
            id,
            url: urlStr,
            status: "ok" as LinkStatus,
            checkedAt: now,
          };
        }

        if (response.status === 404) {
          return {
            id,
            url: urlStr,
            status: "possibly_broken" as LinkStatus,
            checkedAt: now,
            reason: "Returned HTTP 404",
          };
        }

        return {
          id,
          url: urlStr,
          status: "ok" as LinkStatus,
          checkedAt: now,
        };
      } catch (err: any) {
        if (err.name === "AbortError") {
          return {
            id,
            url: urlStr,
            status: "possibly_broken" as LinkStatus,
            checkedAt: now,
            reason: "Connection timed out (5s)",
          };
        }
        return {
          id,
          url: urlStr,
          status: "possibly_broken" as LinkStatus,
          checkedAt: now,
          reason: err.message || "Failed to reach server",
        };
      }
    }

    // Process in batches of 10
    const results: LinkCheckResultItem[] = [];
    const batchSize = 10;
    for (let i = 0; i < itemsToCheck.length; i += batchSize) {
      const chunk = itemsToCheck.slice(i, i + batchSize);
      const chunkResults = await Promise.all(
        chunk.map((item) => checkUrl(item.id, item.url))
      );
      results.push(...chunkResults);
    }

    return jsonOk({ results });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to check links";
    return jsonError(message, 500);
  }
}

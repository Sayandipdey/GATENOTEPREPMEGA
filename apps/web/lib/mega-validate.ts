/**
 * @file mega-validate.ts
 * @description Helper utilities for validating and transforming MEGA.nz links.
 *
 * These functions are intentionally dependency-free so they can be used in
 * both server (Node) and client (browser) contexts without bundling issues.
 */

import { MEGA_URL_PREFIX } from "@notes/shared";

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * Returns `true` if `url` is a syntactically valid URL that starts with the
 * MEGA.nz origin (`https://mega.nz/`).
 *
 * This is a lightweight, synchronous check — it does **not** verify that the
 * remote file actually exists.
 *
 * @param url - The URL string to validate.
 * @returns `true` when the URL is a well-formed MEGA.nz link.
 *
 * @example
 * isValidMegaLink("https://mega.nz/file/abc123#key");  // true
 * isValidMegaLink("https://drive.google.com/...");      // false
 */
export function isValidMegaLink(url: string): boolean {
  if (!url.startsWith(MEGA_URL_PREFIX)) {
    return false;
  }
  try {
    const parsed = new URL(url);
    // Hostname must be exactly mega.nz (no subdomains) and protocol https.
    return parsed.hostname === "mega.nz" && parsed.protocol === "https:";
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Transform
// ---------------------------------------------------------------------------

/**
 * Converts a MEGA.nz file link (`https://mega.nz/file/<id>#<key>`) into an
 * embeddable link (`https://mega.nz/embed/<id>#<key>`).
 *
 * Returns `null` when:
 * - The URL is not a valid MEGA.nz link.
 * - The path does not start with `/file/` (e.g. it is already `/embed/` or
 *   points to a folder `/folder/`).
 *
 * @param url - A MEGA.nz file URL.
 * @returns An embeddable URL string, or `null` if conversion is not possible.
 *
 * @example
 * getMegaEmbedUrl("https://mega.nz/file/abc123#KEY");
 * // → "https://mega.nz/embed/abc123#KEY"
 *
 * getMegaEmbedUrl("https://mega.nz/folder/xyz");
 * // → null
 */
export function getMegaEmbedUrl(url: string): string | null {
  if (!isValidMegaLink(url)) {
    return null;
  }

  try {
    const parsed = new URL(url);

    if (!parsed.pathname.startsWith("/file/")) {
      // Not a file link — folders, embeds, etc. are not supported.
      return null;
    }

    // Replace /file/ prefix with /embed/
    parsed.pathname = parsed.pathname.replace(/^\/file\//, "/embed/");
    return parsed.toString();
  } catch {
    return null;
  }
}

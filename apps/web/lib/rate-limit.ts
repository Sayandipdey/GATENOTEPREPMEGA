/**
 * @file rate-limit.ts
 * @description Rate-limiting helpers for the Notes Platform API.
 *
 * When `UPSTASH_REDIS_REST_URL` is set in the environment the module uses
 * @upstash/ratelimit backed by Upstash Redis (sliding-window algorithm).
 *
 * When the env var is absent it falls back to a **simple in-memory Map**.
 *
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  ⚠  IN-MEMORY RATE LIMITING — IMPORTANT WARNING                         ║
 * ║                                                                          ║
 * ║  The in-memory fallback stores state in a JavaScript Map that lives in   ║
 * ║  the Node.js process heap.  This works fine for a single long-running    ║
 * ║  server process (e.g. `next start` on a traditional VPS), but it has     ║
 * ║  CRITICAL limitations in serverless / edge environments:                 ║
 * ║                                                                          ║
 * ║  • Each serverless function instance has its own isolated heap.          ║
 * ║    Rate-limit counters are NOT shared across concurrent instances, so a  ║
 * ║    determined client can spawn many parallel requests and each will       ║
 * ║    appear to have a fresh quota.                                          ║
 * ║                                                                          ║
 * ║  • State is lost between cold starts; a reboot resets all counters.      ║
 * ║                                                                          ║
 * ║  For production deployments on Vercel, AWS Lambda, Google Cloud Run,     ║
 * ║  Cloudflare Workers, or any other serverless platform you MUST set        ║
 * ║  UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN to enable the       ║
 * ║  Upstash-backed implementation.                                           ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

/** Result of a rate-limit check. */
export interface RateLimitResult {
  /** Whether the request is allowed to proceed. */
  success: boolean;
  /** Number of remaining requests in the current window. */
  remaining: number;
}

// ---------------------------------------------------------------------------
// In-memory fallback implementation
// ---------------------------------------------------------------------------

interface MemoryEntry {
  count: number;
  resetAt: number; // epoch ms
}

function createInMemoryLimiter(limit: number, windowMs: number) {
  const store = new Map<string, MemoryEntry>();

  return async (identifier: string): Promise<RateLimitResult> => {
    const now = Date.now();
    const entry = store.get(identifier);

    if (!entry || now >= entry.resetAt) {
      // New window.
      store.set(identifier, { count: 1, resetAt: now + windowMs });
      return { success: true, remaining: limit - 1 };
    }

    if (entry.count >= limit) {
      return { success: false, remaining: 0 };
    }

    entry.count += 1;
    return { success: true, remaining: limit - entry.count };
  };
}

// ---------------------------------------------------------------------------
// Upstash implementation (lazy, only imported when env var is set)
// ---------------------------------------------------------------------------

type RateLimiterFn = (identifier: string) => Promise<RateLimitResult>;

/** Wraps an Upstash Ratelimit instance into the common {@link RateLimiterFn} shape. */
async function buildUpstashLimiter(
  limit: number,
  window: string
): Promise<RateLimiterFn> {
  // Dynamic imports so the module still loads even if the packages are absent.
  const [{ Ratelimit }, { Redis }] = await Promise.all([
    import("@upstash/ratelimit"),
    import("@upstash/redis"),
  ]);

  const redis = Redis.fromEnv();
  const rl = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, window as `${number} ${"ms" | "s" | "m" | "h" | "d"}`),
    analytics: false,
  });

  return async (identifier: string): Promise<RateLimitResult> => {
    const { success, remaining } = await rl.limit(identifier);
    return { success, remaining };
  };
}

// ---------------------------------------------------------------------------
// Module-level singleton limiter promises
// ---------------------------------------------------------------------------

let authLimiterPromise: Promise<RateLimiterFn> | null = null;
let writeLimiterPromise: Promise<RateLimiterFn> | null = null;

function getAuthLimiter(): Promise<RateLimiterFn> {
  if (!authLimiterPromise) {
    if (process.env.UPSTASH_REDIS_REST_URL) {
      authLimiterPromise = buildUpstashLimiter(10, "1 m");
    } else {
      const fn = createInMemoryLimiter(10, 60_000);
      authLimiterPromise = Promise.resolve(fn);
    }
  }
  return authLimiterPromise;
}

function getWriteLimiter(): Promise<RateLimiterFn> {
  if (!writeLimiterPromise) {
    if (process.env.UPSTASH_REDIS_REST_URL) {
      writeLimiterPromise = buildUpstashLimiter(60, "1 m");
    } else {
      const fn = createInMemoryLimiter(60, 60_000);
      writeLimiterPromise = Promise.resolve(fn);
    }
  }
  return writeLimiterPromise;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Checks whether the given identifier has exceeded the **auth** rate limit.
 *
 * Limit: 10 requests per minute (sliding window).
 * Intended for use on `/api/auth/*` routes.
 *
 * @param identifier - A stable key to rate-limit on, typically the client IP.
 */
export async function rateLimitAuth(
  identifier: string
): Promise<RateLimitResult> {
  const limiter = await getAuthLimiter();
  return limiter(identifier);
}

/**
 * Checks whether the given identifier has exceeded the **write** rate limit.
 *
 * Limit: 60 requests per minute (sliding window).
 * Intended for use on authenticated mutation routes.
 *
 * @param identifier - A stable key to rate-limit on, typically the user ID.
 */
export async function rateLimitWrite(
  identifier: string
): Promise<RateLimitResult> {
  const limiter = await getWriteLimiter();
  return limiter(identifier);
}

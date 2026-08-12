// Lightweight in-memory rate limiter for Nitro server routes.
//
// Fixed-window counter keyed by an arbitrary string (typically client IP).
// Single-instance/in-memory only — resets on cold start or redeploy, and
// does not share state across serverless instances. That's an accepted
// trade-off here: the goal is to blunt casual abuse/scripted flooding of
// routes that use shared upstream credentials (e.g. the Spotify app
// token), not to provide distributed, airtight enforcement. Swap in
// Vercel KV/Upstash if that stronger guarantee is ever needed.

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

// Opportunistically drop expired buckets so the map doesn't grow forever.
const CLEANUP_INTERVAL_MS = 5 * 60_000;
let lastCleanup = Date.now();

function cleanupExpired(now: number) {
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  /** Unix ms timestamp when the current window resets. */
  resetAt: number;
}

/**
 * Fixed-window rate limit check. Each distinct `key` gets its own budget
 * of `limit` requests per `windowMs`; call once per incoming request.
 */
export function checkRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  cleanupExpired(now);

  let bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + windowMs };
    buckets.set(key, bucket);
  }

  bucket.count += 1;

  return {
    allowed: bucket.count <= limit,
    limit,
    remaining: Math.max(0, limit - bucket.count),
    resetAt: bucket.resetAt,
  };
}

/**
 * Applies a rate limit to the current request, identified by client IP.
 * Throws a 429 H3Error (with Retry-After / X-RateLimit-* headers) when the
 * caller is over budget; otherwise sets the informational headers and
 * returns normally.
 */
export function enforceRateLimit(
  event: import('h3').H3Event,
  routeKey: string,
  limit: number,
  windowMs: number
) {
  const ip = getRequestIP(event, { xForwardedFor: true }) ?? 'unknown';
  const result = checkRateLimit(`${routeKey}:${ip}`, limit, windowMs);

  setResponseHeader(event, 'X-RateLimit-Limit', String(result.limit));
  setResponseHeader(event, 'X-RateLimit-Remaining', String(result.remaining));
  setResponseHeader(event, 'X-RateLimit-Reset', String(Math.ceil(result.resetAt / 1000)));

  if (!result.allowed) {
    const retryAfterSeconds = Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000));
    setResponseHeader(event, 'Retry-After', String(retryAfterSeconds));
    throw createError({
      statusCode: 429,
      statusMessage: 'Too Many Requests',
      message: 'Rate limit exceeded. Please slow down and try again shortly.',
    });
  }
}

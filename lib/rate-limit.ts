import "server-only";

type RateLimitOptions = { limit: number; windowMs: number };
type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

function pruneExpired(now: number): void {
  if (buckets.size < 1000) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export function checkRateLimit(key: string, options: RateLimitOptions): boolean {
  const now = Date.now();
  pruneExpired(now);
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + options.windowMs });
    return true;
  }
  if (bucket.count >= options.limit) return false;
  bucket.count += 1;
  return true;
}

/** Compatibility wrapper used by the houses module. */
export function createRateLimiter(limit: number, windowMs: number) {
  const prefix = `houses:${Math.random().toString(36).slice(2)}:`;
  return (key: string): boolean =>
    checkRateLimit(`${prefix}${key}`, { limit, windowMs });
}

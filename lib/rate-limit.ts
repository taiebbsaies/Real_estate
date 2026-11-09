import "server-only";

type Bucket = { count: number; resetAt: number };

/**
 * Small in-memory rate limiter. It resets on server restart and is not shared
 * between instances; it is a best-effort guard, not a durable quota.
 */
export function createRateLimiter(limit: number, windowMs: number) {
  const buckets = new Map<string, Bucket>();

  return function consume(key: string): boolean {
    const now = Date.now();
    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return true;
    }

    if (bucket.count >= limit) {
      return false;
    }

    bucket.count += 1;
    return true;
  };
}

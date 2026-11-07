// Fixed-window rate limit per client IP for the contact form (#77): `max` hits per `windowMs`.
// In memory: one container, and a restart only gives an attacker a fresh window, nothing more.

export type RateLimiter = (key: string, now?: number) => { allowed: boolean; retryAfterSeconds: number };

export function createRateLimiter({ max, windowMs }: { max: number; windowMs: number }): RateLimiter {
  const hits = new Map<string, { count: number; resetAt: number }>();

  return (key, now = Date.now()) => {
    // Drop expired windows now and then, so the map can't grow without bound.
    if (hits.size > 1000) for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);

    const entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      return { allowed: true, retryAfterSeconds: 0 };
    }
    entry.count += 1;
    const retryAfterSeconds = Math.ceil((entry.resetAt - now) / 1000);
    return { allowed: entry.count <= max, retryAfterSeconds };
  };
}

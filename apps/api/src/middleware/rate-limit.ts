import type { Context, Next } from 'hono';

type Bucket = {
  count: number;
  resetAt: number;
};

export type RateLimitOptions = {
  limit: number;
  windowMs: number;
  keyFn: (c: Context) => string | null;
};

export function rateLimit(options: RateLimitOptions) {
  const buckets = new Map<string, Bucket>();
  const { limit, windowMs, keyFn } = options;

  return async (c: Context, next: Next): Promise<Response | void> => {
    const key = keyFn(c);
    if (!key) {
      await next();
      return;
    }

    const now = Date.now();
    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      await next();
      return;
    }

    if (bucket.count >= limit) {
      const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
      c.header('Retry-After', String(retryAfter));
      return c.json({ error: 'rate_limited', retryAfter }, 429);
    }

    bucket.count += 1;
    await next();
  };
}

export function perUserKey(c: Context): string | null {
  const user = c.get('user');
  return user ? `user:${user.id}` : null;
}

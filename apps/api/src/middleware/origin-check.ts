import type { MiddlewareHandler } from 'hono';

const STATE_CHANGING = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

export function originCheck(allowedOrigins: string[]): MiddlewareHandler {
  const allowed = new Set(allowedOrigins);
  return async (c, next) => {
    if (!STATE_CHANGING.has(c.req.method)) return next();
    const origin = c.req.header('origin');
    if (!origin || !allowed.has(origin)) {
      return c.json({ error: 'forbidden_origin' }, 403);
    }
    return next();
  };
}

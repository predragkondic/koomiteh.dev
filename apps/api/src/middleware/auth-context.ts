import type { Context, Next } from 'hono';
import { getCookie } from 'hono/cookie';
import type { User } from '@koomiteh/shared';
import {
  SESSION_COOKIE_NAME,
  validateSessionToken,
} from '../auth/sessions.js';
import { setSessionCookie, clearSessionCookie } from '../auth/cookies.js';

export type AuthVars = {
  user: User | null;
  sessionToken: string | null;
};

declare module 'hono' {
  interface ContextVariableMap {
    user: User | null;
    sessionToken: string | null;
  }
}

export async function authContext(c: Context, next: Next): Promise<void> {
  const token = getCookie(c, SESSION_COOKIE_NAME) ?? null;
  if (!token) {
    c.set('user', null);
    c.set('sessionToken', null);
    await next();
    return;
  }

  const result = await validateSessionToken(token);
  if (!result.session) {
    clearSessionCookie(c);
    c.set('user', null);
    c.set('sessionToken', null);
    await next();
    return;
  }

  setSessionCookie(c, token, result.session.expiresAt);
  c.set('user', result.user);
  c.set('sessionToken', token);
  await next();
}

export async function requireAuth(c: Context, next: Next): Promise<Response | void> {
  await authContext(c, async () => {});
  const user = c.get('user');
  if (!user) {
    return c.json({ error: 'unauthorized' }, 401);
  }
  await next();
}

export async function requireAdmin(c: Context, next: Next): Promise<Response | void> {
  await authContext(c, async () => {});
  const user = c.get('user');
  if (!user) {
    return c.json({ error: 'unauthorized' }, 401);
  }
  if (user.role !== 'admin' && user.role !== 'superadmin') {
    return c.json({ error: 'forbidden' }, 403);
  }
  await next();
}

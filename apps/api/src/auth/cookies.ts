import type { Context } from 'hono';
import { setCookie, deleteCookie } from 'hono/cookie';
import { env } from '../env.js';
import { SESSION_COOKIE_NAME } from './sessions.js';

const THIRTY_DAYS_SECS = 60 * 60 * 24 * 30;

export function setSessionCookie(
  c: Context,
  token: string,
  expiresAt: Date,
): void {
  setCookie(c, SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'Lax',
    secure: env.sessionCookie.secure,
    path: '/',
    domain: env.sessionCookie.domain || undefined,
    expires: expiresAt,
    maxAge: THIRTY_DAYS_SECS,
  });
}

export function clearSessionCookie(c: Context): void {
  deleteCookie(c, SESSION_COOKIE_NAME, {
    path: '/',
    domain: env.sessionCookie.domain || undefined,
    secure: env.sessionCookie.secure,
  });
}

const STATE_COOKIE = 'github_oauth_state';

export function setStateCookie(c: Context, state: string): void {
  setCookie(c, STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: 'Lax',
    secure: env.sessionCookie.secure,
    path: '/',
    maxAge: 60 * 10,
  });
}

export { STATE_COOKIE };

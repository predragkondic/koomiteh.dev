import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import { users } from '@koomiteh/shared';
import { db, pool } from '../db/client.js';
import { createApp } from '../app.js';
import {
  SESSION_COOKIE_NAME,
  createSession,
  generateSessionToken,
} from '../auth/sessions.js';

const app = createApp();
const ORIGIN = 'http://localhost:5173';

async function call<T = unknown>(
  pathname: string,
  opts: { cookie?: string } = {},
): Promise<{ status: number; body: T }> {
  const headers: Record<string, string> = { Origin: ORIGIN };
  if (opts.cookie) headers.Cookie = opts.cookie;
  const res = await app.request(`http://localhost${pathname}`, { headers });
  const body = (await res.json().catch(() => ({}))) as T;
  return { status: res.status, body };
}

async function createTestUser(githubLogin: string): Promise<string> {
  const rows = await db
    .insert(users)
    .values({
      githubId: Math.floor(Math.random() * 1_000_000_000),
      githubLogin,
      displayName: githubLogin,
      avatarUrl: null,
    })
    .returning({ id: users.id });
  return rows[0]!.id;
}

async function loginAs(userId: string): Promise<string> {
  const token = generateSessionToken();
  await createSession(token, userId);
  return `${SESSION_COOKIE_NAME}=${token}`;
}

beforeAll(async () => {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL must be set for integration tests');
  }
});

beforeEach(async () => {
  await db.execute(sql`TRUNCATE TABLE ${users} RESTART IDENTITY CASCADE`);
});

afterAll(async () => {
  await pool.end();
});

type ProfileBody = {
  id: string;
  githubLogin: string;
  displayName: string;
  avatarUrl: string | null;
  role: 'user' | 'admin' | 'superadmin';
  createdAt: string;
};

describe('GET /me/profile', () => {
  it('requires auth (401 without session cookie)', async () => {
    const { status, body } = await call<{ error: string }>('/me/profile');
    expect(status).toBe(401);
    expect(body.error).toBe('unauthorized');
  });

  it('returns the authenticated user with createdAt', async () => {
    const userId = await createTestUser('octocat');
    const cookie = await loginAs(userId);

    const { status, body } = await call<ProfileBody>('/me/profile', { cookie });

    expect(status).toBe(200);
    expect(body.id).toBe(userId);
    expect(body.githubLogin).toBe('octocat');
    expect(body.displayName).toBe('octocat');
    expect(body.role).toBe('user');
    expect(typeof body.createdAt).toBe('string');
    expect(new Date(body.createdAt).toISOString()).toBe(body.createdAt);
  });
});

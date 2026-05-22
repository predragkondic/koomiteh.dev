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

async function createTestUser(
  githubLogin: string,
  overrides: { deletedAt?: Date | null } = {},
): Promise<string> {
  const rows = await db
    .insert(users)
    .values({
      githubId: Math.floor(Math.random() * 1_000_000_000),
      githubLogin,
      displayName: githubLogin,
      avatarUrl: null,
      ...overrides,
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

type PublicProfile = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  githubLogin: string | null;
  createdAt: string;
};

describe('GET /users/:id', () => {
  it('requires auth (401 without session cookie)', async () => {
    const userId = await createTestUser('octocat');

    const { status, body } = await call<{ error: string }>(`/users/${userId}`);

    expect(status).toBe(401);
    expect(body.error).toBe('unauthorized');
  });

  it('returns the public profile for an existing user (no githubId)', async () => {
    const targetId = await createTestUser('octocat');
    const viewerId = await createTestUser('viewer');
    const cookie = await loginAs(viewerId);

    const { status, body } = await call<PublicProfile & Record<string, unknown>>(
      `/users/${targetId}`,
      { cookie },
    );

    expect(status).toBe(200);
    expect(body.id).toBe(targetId);
    expect(body.displayName).toBe('octocat');
    expect(body.githubLogin).toBe('octocat');
    expect(body.avatarUrl).toBeNull();
    expect(typeof body.createdAt).toBe('string');
    expect(new Date(body.createdAt).toISOString()).toBe(body.createdAt);
    expect(body).not.toHaveProperty('githubId');
    expect(body).not.toHaveProperty('deletedAt');
    expect(body).not.toHaveProperty('role');
  });

  it('returns 404 for an unknown user id', async () => {
    const viewerId = await createTestUser('viewer');
    const cookie = await loginAs(viewerId);
    const unknownId = '00000000-0000-0000-0000-000000000000';

    const { status, body } = await call<{ error: string }>(
      `/users/${unknownId}`,
      { cookie },
    );

    expect(status).toBe(404);
    expect(body.error).toBe('not_found');
  });

  it('returns 410 Gone with [deleted]-state for soft-deleted user', async () => {
    const targetId = await createTestUser('ghosty', {
      deletedAt: new Date('2026-01-01T00:00:00.000Z'),
    });
    const viewerId = await createTestUser('viewer');
    const cookie = await loginAs(viewerId);

    const { status, body } = await call<{
      error: string;
      id: string;
      displayName: string;
      avatarUrl: string | null;
      githubLogin: string | null;
      createdAt: string;
    }>(`/users/${targetId}`, { cookie });

    expect(status).toBe(410);
    expect(body.error).toBe('gone');
    expect(body.id).toBe(targetId);
    expect(body.displayName).toBe('[deleted]');
    expect(body.avatarUrl).toBeNull();
    expect(body.githubLogin).toBeNull();
    expect(typeof body.createdAt).toBe('string');
  });
});

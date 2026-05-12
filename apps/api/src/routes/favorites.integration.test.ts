import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sql } from 'drizzle-orm';
import { favorites, posts, users } from '@koomiteh/shared';
import { db, pool } from '../db/client.js';
import { createApp } from '../app.js';
import { seedFromDir } from '../seed.js';
import {
  SESSION_COOKIE_NAME,
  createSession,
  generateSessionToken,
} from '../auth/sessions.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const fixtureDir = path.resolve(here, '../test-fixtures/content');

const app = createApp();
const ORIGIN = 'http://localhost:5173';

type CallOptions = {
  method?: 'GET' | 'POST' | 'DELETE';
  cookie?: string;
};

async function call<T = unknown>(
  pathname: string,
  opts: CallOptions = {},
): Promise<{ status: number; body: T }> {
  const headers: Record<string, string> = { Origin: ORIGIN };
  if (opts.cookie) headers.Cookie = opts.cookie;
  const res = await app.request(`http://localhost${pathname}`, {
    method: opts.method ?? 'GET',
    headers,
  });
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
  await db.execute(
    sql`TRUNCATE TABLE ${favorites}, ${posts}, ${users} RESTART IDENTITY CASCADE`,
  );
  await seedFromDir(fixtureDir);
});

afterAll(async () => {
  await pool.end();
});

describe('POST /favorites/:postId', () => {
  it('requires auth (401 without session cookie)', async () => {
    const { status, body } = await call<{ error: string }>(
      '/favorites/typescript-junior-closures',
      { method: 'POST' },
    );
    expect(status).toBe(401);
    expect(body.error).toBe('unauthorized');
  });

  it('favorites a post for a logged-in user', async () => {
    const userId = await createTestUser('alice');
    const cookie = await loginAs(userId);
    const { status, body } = await call<{ favorited: boolean }>(
      '/favorites/typescript-junior-closures',
      { method: 'POST', cookie },
    );
    expect(status).toBe(200);
    expect(body.favorited).toBe(true);
  });

  it('is idempotent (no error on repeated POST)', async () => {
    const userId = await createTestUser('bob');
    const cookie = await loginAs(userId);
    const a = await call(
      '/favorites/typescript-junior-closures',
      { method: 'POST', cookie },
    );
    const b = await call(
      '/favorites/typescript-junior-closures',
      { method: 'POST', cookie },
    );
    expect(a.status).toBe(200);
    expect(b.status).toBe(200);
    const rows = await db.select().from(favorites);
    expect(rows).toHaveLength(1);
  });

  it('404 on unknown post', async () => {
    const userId = await createTestUser('carol');
    const cookie = await loginAs(userId);
    const { status } = await call('/favorites/does-not-exist', {
      method: 'POST',
      cookie,
    });
    expect(status).toBe(404);
  });

  it('404 on soft-deleted post', async () => {
    await db.execute(
      sql`UPDATE ${posts} SET deleted_at = now() WHERE content_id = 'typescript-junior-closures'`,
    );
    const userId = await createTestUser('dave');
    const cookie = await loginAs(userId);
    const { status } = await call('/favorites/typescript-junior-closures', {
      method: 'POST',
      cookie,
    });
    expect(status).toBe(404);
  });
});

describe('DELETE /favorites/:postId', () => {
  it('requires auth', async () => {
    const { status } = await call('/favorites/typescript-junior-closures', {
      method: 'DELETE',
    });
    expect(status).toBe(401);
  });

  it('is idempotent (DELETE on non-favorited post returns 200)', async () => {
    const userId = await createTestUser('eve');
    const cookie = await loginAs(userId);
    const { status, body } = await call<{ favorited: boolean }>(
      '/favorites/typescript-junior-closures',
      { method: 'DELETE', cookie },
    );
    expect(status).toBe(200);
    expect(body.favorited).toBe(false);
  });

  it('removes an existing favorite', async () => {
    const userId = await createTestUser('frank');
    const cookie = await loginAs(userId);
    await call('/favorites/typescript-junior-closures', {
      method: 'POST',
      cookie,
    });
    await call('/favorites/typescript-junior-closures', {
      method: 'DELETE',
      cookie,
    });
    const rows = await db.select().from(favorites);
    expect(rows).toHaveLength(0);
  });
});

describe('GET /me/favorites', () => {
  it('requires auth', async () => {
    const { status } = await call('/me/favorites');
    expect(status).toBe(401);
  });

  it('returns empty list for new user', async () => {
    const userId = await createTestUser('grace');
    const cookie = await loginAs(userId);
    const { status, body } = await call<{
      items: unknown[];
      total: number;
      page: number;
      pageSize: number;
      pageCount: number;
    }>('/me/favorites', { cookie });
    expect(status).toBe(200);
    expect(body.items).toEqual([]);
    expect(body.total).toBe(0);
    expect(body.page).toBe(1);
    expect(body.pageCount).toBe(0);
  });

  it('sorts favorites by created_at DESC', async () => {
    const userId = await createTestUser('heidi');
    const cookie = await loginAs(userId);
    await call('/favorites/typescript-junior-closures', { method: 'POST', cookie });
    await call('/favorites/javascript-junior-hoisting', { method: 'POST', cookie });
    await call('/favorites/typescript-senior-variance', { method: 'POST', cookie });

    const { body } = await call<{
      items: Array<{ id: string }>;
      total: number;
    }>('/me/favorites', { cookie });
    expect(body.total).toBe(3);
    expect(body.items[0].id).toBe('typescript-senior-variance');
    expect(body.items[2].id).toBe('typescript-junior-closures');
  });

  it('excludes soft-deleted posts', async () => {
    const userId = await createTestUser('ivan');
    const cookie = await loginAs(userId);
    await call('/favorites/typescript-junior-closures', { method: 'POST', cookie });
    await call('/favorites/javascript-junior-hoisting', { method: 'POST', cookie });
    await db.execute(
      sql`UPDATE ${posts} SET deleted_at = now() WHERE content_id = 'typescript-junior-closures'`,
    );
    const { body } = await call<{
      items: Array<{ id: string }>;
      total: number;
    }>('/me/favorites', { cookie });
    expect(body.total).toBe(1);
    expect(body.items[0].id).toBe('javascript-junior-hoisting');
  });

  it('does not leak across users', async () => {
    const alice = await createTestUser('alice2');
    const bob = await createTestUser('bob2');
    const aliceCookie = await loginAs(alice);
    const bobCookie = await loginAs(bob);
    await call('/favorites/typescript-junior-closures', {
      method: 'POST',
      cookie: aliceCookie,
    });
    const { body } = await call<{ total: number }>('/me/favorites', {
      cookie: bobCookie,
    });
    expect(body.total).toBe(0);
  });

  it('paginates with page + pageSize', async () => {
    const userId = await createTestUser('judy');
    const cookie = await loginAs(userId);
    await call('/favorites/typescript-junior-closures', { method: 'POST', cookie });
    await call('/favorites/javascript-junior-hoisting', { method: 'POST', cookie });
    await call('/favorites/typescript-senior-variance', { method: 'POST', cookie });
    await call('/favorites/javascript-senior-event-loop', { method: 'POST', cookie });

    const { body } = await call<{
      items: unknown[];
      total: number;
      page: number;
      pageSize: number;
      pageCount: number;
    }>('/me/favorites?page=2&pageSize=2', { cookie });
    expect(body.page).toBe(2);
    expect(body.pageSize).toBe(2);
    expect(body.total).toBe(4);
    expect(body.pageCount).toBe(2);
    expect(body.items).toHaveLength(2);
  });
});

describe('GET /me/favorites/ids', () => {
  it('returns content ids of all favorites (no pagination)', async () => {
    const userId = await createTestUser('kim');
    const cookie = await loginAs(userId);
    await call('/favorites/typescript-junior-closures', { method: 'POST', cookie });
    await call('/favorites/javascript-junior-hoisting', { method: 'POST', cookie });
    const { status, body } = await call<{ ids: string[] }>(
      '/me/favorites/ids',
      { cookie },
    );
    expect(status).toBe(200);
    expect(body.ids.sort()).toEqual([
      'javascript-junior-hoisting',
      'typescript-junior-closures',
    ]);
  });
});

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { eq, sql } from 'drizzle-orm';
import { posts, users } from '@koomiteh/shared';
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
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  cookie?: string;
  body?: unknown;
};

async function call<T = unknown>(
  pathname: string,
  opts: CallOptions = {},
): Promise<{ status: number; body: T }> {
  const headers: Record<string, string> = { Origin: ORIGIN };
  if (opts.cookie) headers.Cookie = opts.cookie;
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  const res = await app.request(`http://localhost${pathname}`, {
    method: opts.method ?? 'GET',
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  const text = await res.text();
  const body = text ? (JSON.parse(text) as T) : ({} as T);
  return { status: res.status, body };
}

async function createTestUser(
  githubLogin: string,
  role: 'user' | 'admin' = 'user',
): Promise<string> {
  const rows = await db
    .insert(users)
    .values({
      githubId: Math.floor(Math.random() * 1_000_000_000),
      githubLogin,
      displayName: githubLogin,
      avatarUrl: null,
      role,
    })
    .returning({ id: users.id });
  return rows[0]!.id;
}

async function loginAs(userId: string): Promise<string> {
  const token = generateSessionToken();
  await createSession(token, userId);
  return `${SESSION_COOKIE_NAME}=${token}`;
}

async function adminCookie(): Promise<string> {
  const id = await createTestUser(`admin-${Math.random()}`, 'admin');
  return loginAs(id);
}

async function userCookie(): Promise<string> {
  const id = await createTestUser(`user-${Math.random()}`, 'user');
  return loginAs(id);
}

beforeAll(async () => {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL must be set for integration tests');
  }
});

beforeEach(async () => {
  await db.execute(
    sql`TRUNCATE TABLE ${posts}, ${users} RESTART IDENTITY CASCADE`,
  );
  await seedFromDir(fixtureDir);
});

afterAll(async () => {
  await pool.end();
});

describe('GET /admin/posts (auth)', () => {
  it('401 without session', async () => {
    const { status } = await call('/admin/posts');
    expect(status).toBe(401);
  });

  it('403 for non-admin user', async () => {
    const cookie = await userCookie();
    const { status, body } = await call<{ error: string }>('/admin/posts', {
      cookie,
    });
    expect(status).toBe(403);
    expect(body.error).toBe('forbidden');
  });

  it('200 for admin (excludes deleted by default)', async () => {
    await db.execute(
      sql`UPDATE ${posts} SET deleted_at = now() WHERE content_id = 'typescript-junior-closures'`,
    );
    const cookie = await adminCookie();
    const { status, body } = await call<{
      items: Array<{ id: string; deletedAt: string | null }>;
      total: number;
    }>('/admin/posts', { cookie });
    expect(status).toBe(200);
    expect(body.total).toBe(3);
    expect(body.items.every((i) => i.deletedAt === null)).toBe(true);
  });

  it('includeDeleted=true returns soft-deleted posts too', async () => {
    await db.execute(
      sql`UPDATE ${posts} SET deleted_at = now() WHERE content_id = 'typescript-junior-closures'`,
    );
    const cookie = await adminCookie();
    const { body } = await call<{
      items: Array<{ id: string; deletedAt: string | null }>;
      total: number;
    }>('/admin/posts?includeDeleted=true', { cookie });
    expect(body.total).toBe(4);
    const deleted = body.items.find(
      (i) => i.id === 'typescript-junior-closures',
    );
    expect(deleted?.deletedAt).not.toBeNull();
  });
});

describe('POST /admin/posts', () => {
  it('401 without session', async () => {
    const { status } = await call('/admin/posts', {
      method: 'POST',
      body: {},
    });
    expect(status).toBe(401);
  });

  it('403 for non-admin', async () => {
    const cookie = await userCookie();
    const { status } = await call('/admin/posts', {
      method: 'POST',
      cookie,
      body: {
        slug: 'foo',
        question: 'q?',
        language: 'typescript',
        level: 'junior',
        tags: [],
        bodyMd: 'x',
      },
    });
    expect(status).toBe(403);
  });

  it('creates a post for admin', async () => {
    const cookie = await adminCookie();
    const { status, body } = await call<{
      frontmatter: { id: string; slug: string };
      bodyMd: string;
    }>('/admin/posts', {
      method: 'POST',
      cookie,
      body: {
        slug: 'pure-functions',
        question: 'What is a pure function?',
        language: 'typescript',
        level: 'junior',
        tags: ['fp'],
        bodyMd: 'A pure function...',
      },
    });
    expect(status).toBe(201);
    expect(body.frontmatter.id).toBe('typescript-junior-pure-functions');
    expect(body.frontmatter.slug).toBe('pure-functions');
    expect(body.bodyMd).toBe('A pure function...');
  });

  it('400 invalid body (missing fields)', async () => {
    const cookie = await adminCookie();
    const { status, body } = await call<{ error: string }>('/admin/posts', {
      method: 'POST',
      cookie,
      body: { slug: 'x' },
    });
    expect(status).toBe(400);
    expect(body.error).toBe('invalid_body');
  });

  it('400 invalid language (not in LANGUAGES)', async () => {
    const cookie = await adminCookie();
    const { status, body } = await call<{ error: string }>('/admin/posts', {
      method: 'POST',
      cookie,
      body: {
        slug: 'rust-thing',
        question: 'q?',
        language: 'rust',
        level: 'junior',
        tags: [],
        bodyMd: 'x',
      },
    });
    expect(status).toBe(400);
    expect(body.error).toBe('invalid_language');
  });

  it('409 slug conflict within same language', async () => {
    const cookie = await adminCookie();
    const { status, body } = await call<{ error: string }>('/admin/posts', {
      method: 'POST',
      cookie,
      body: {
        slug: 'what-is-a-closure',
        question: 'duplicate',
        language: 'typescript',
        level: 'senior',
        tags: [],
        bodyMd: 'x',
      },
    });
    expect(status).toBe(409);
    expect(body.error).toBe('slug_conflict');
  });
});

describe('PATCH /admin/posts/:id', () => {
  it('403 for non-admin', async () => {
    const cookie = await userCookie();
    const { status } = await call(
      '/admin/posts/typescript-junior-closures',
      { method: 'PATCH', cookie, body: { question: 'x' } },
    );
    expect(status).toBe(403);
  });

  it('updates fields and bumps updatedAt', async () => {
    const cookie = await adminCookie();
    const before = await db
      .select({ updatedAt: posts.updatedAt })
      .from(posts)
      .where(eq(posts.contentId, 'typescript-junior-closures'));
    const beforeMs = before[0]!.updatedAt.getTime();

    const { status, body } = await call<{
      frontmatter: { question: string };
      bodyMd: string;
    }>('/admin/posts/typescript-junior-closures', {
      method: 'PATCH',
      cookie,
      body: { question: 'New question?', bodyMd: 'new body' },
    });
    expect(status).toBe(200);
    expect(body.frontmatter.question).toBe('New question?');
    expect(body.bodyMd).toBe('new body');

    const after = await db
      .select({ updatedAt: posts.updatedAt })
      .from(posts)
      .where(eq(posts.contentId, 'typescript-junior-closures'));
    expect(after[0]!.updatedAt.getTime()).toBeGreaterThanOrEqual(beforeMs);
  });

  it('404 for unknown id', async () => {
    const cookie = await adminCookie();
    const { status } = await call('/admin/posts/does-not-exist', {
      method: 'PATCH',
      cookie,
      body: { question: 'x' },
    });
    expect(status).toBe(404);
  });

  it('409 when changing slug to one used by another post in same language', async () => {
    const cookie = await adminCookie();
    const { status, body } = await call<{ error: string }>(
      '/admin/posts/typescript-senior-variance',
      {
        method: 'PATCH',
        cookie,
        body: { slug: 'what-is-a-closure' },
      },
    );
    expect(status).toBe(409);
    expect(body.error).toBe('slug_conflict');
  });

  it('keeps content_id stable when slug changes', async () => {
    const cookie = await adminCookie();
    await call('/admin/posts/typescript-junior-closures', {
      method: 'PATCH',
      cookie,
      body: { slug: 'closures-explained' },
    });
    const { status, body } = await call<{
      frontmatter: { id: string; slug: string };
    }>('/admin/posts/typescript-junior-closures', { cookie });
    expect(status).toBe(200);
    expect(body.frontmatter.id).toBe('typescript-junior-closures');
    expect(body.frontmatter.slug).toBe('closures-explained');
  });
});

describe('DELETE + restore /admin/posts/:id', () => {
  it('soft-deletes and restores', async () => {
    const cookie = await adminCookie();

    const del = await call('/admin/posts/typescript-junior-closures', {
      method: 'DELETE',
      cookie,
    });
    expect(del.status).toBe(200);

    const row = await db
      .select({ deletedAt: posts.deletedAt })
      .from(posts)
      .where(eq(posts.contentId, 'typescript-junior-closures'));
    expect(row[0]!.deletedAt).not.toBeNull();

    const restore = await call(
      '/admin/posts/typescript-junior-closures/restore',
      { method: 'POST', cookie },
    );
    expect(restore.status).toBe(200);

    const restored = await db
      .select({ deletedAt: posts.deletedAt })
      .from(posts)
      .where(eq(posts.contentId, 'typescript-junior-closures'));
    expect(restored[0]!.deletedAt).toBeNull();
  });

  it('soft-deleted post is excluded from public /posts but detail returns 410', async () => {
    const cookie = await adminCookie();
    await call('/admin/posts/typescript-junior-closures', {
      method: 'DELETE',
      cookie,
    });

    const { body: list } = await call<{ total: number }>('/posts');
    expect(list.total).toBe(3);

    const { status, body } = await call<{ error: string }>(
      '/posts/typescript-junior-closures',
    );
    expect(status).toBe(410);
    expect(body.error).toBe('gone');
  });

  it('403 for non-admin on DELETE', async () => {
    const cookie = await userCookie();
    const { status } = await call(
      '/admin/posts/typescript-junior-closures',
      { method: 'DELETE', cookie },
    );
    expect(status).toBe(403);
  });
});

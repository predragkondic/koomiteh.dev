import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sql } from 'drizzle-orm';
import { comments, posts, users } from '@koomiteh/shared';
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
  let bodyInit: BodyInit | undefined;
  if (opts.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    bodyInit = JSON.stringify(opts.body);
  }
  const res = await app.request(`http://localhost${pathname}`, {
    method: opts.method ?? 'GET',
    headers,
    body: bodyInit,
  });
  const responseBody = (await res.json().catch(() => ({}))) as T;
  return { status: res.status, body: responseBody };
}

async function createTestUser(
  githubLogin: string,
  role: 'user' | 'admin' | 'superadmin' = 'user',
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

beforeAll(async () => {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL must be set for integration tests');
  }
});

beforeEach(async () => {
  await db.execute(
    sql`TRUNCATE TABLE ${comments}, ${posts}, ${users} RESTART IDENTITY CASCADE`,
  );
  await seedFromDir(fixtureDir);
});

afterAll(async () => {
  await pool.end();
});

describe('POST /posts/:id/comments', () => {
  it('rejects unauthenticated requests with 401', async () => {
    const { status, body } = await call<{ error: string }>(
      '/posts/typescript-junior-closures/comments',
      { method: 'POST', body: { bodyMd: 'hello' } },
    );
    expect(status).toBe(401);
    expect(body.error).toBe('unauthorized');
    const rows = await db.select().from(comments);
    expect(rows).toHaveLength(0);
  });

  it('rejects POST on unknown post with 404', async () => {
    const userId = await createTestUser('lost');
    const cookie = await loginAs(userId);
    const { status } = await call('/posts/does-not-exist/comments', {
      method: 'POST',
      cookie,
      body: { bodyMd: 'hi' },
    });
    expect(status).toBe(404);
  });

  it('creates a comment for an authenticated user', async () => {
    const userId = await createTestUser('alice');
    const cookie = await loginAs(userId);
    const { status, body } = await call<{
      comment: { id: string; bodyHtmlSafe: string };
    }>('/posts/typescript-junior-closures/comments', {
      method: 'POST',
      cookie,
      body: { bodyMd: 'Hello **world**' },
    });
    expect(status).toBe(201);
    expect(body.comment.bodyHtmlSafe).toContain('Hello');
    const rows = await db.select().from(comments);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.bodyMd).toBe('Hello **world**');
  });

  it('rejects empty bodyMd with 400', async () => {
    const userId = await createTestUser('emptyguy');
    const cookie = await loginAs(userId);
    const { status } = await call('/posts/typescript-junior-closures/comments', {
      method: 'POST',
      cookie,
      body: { bodyMd: '   ' },
    });
    expect(status).toBe(400);
    const rows = await db.select().from(comments);
    expect(rows).toHaveLength(0);
  });

  it('rejects bodyMd longer than 10000 chars with 400', async () => {
    const userId = await createTestUser('longguy');
    const cookie = await loginAs(userId);
    const { status } = await call('/posts/typescript-junior-closures/comments', {
      method: 'POST',
      cookie,
      body: { bodyMd: 'a'.repeat(10001) },
    });
    expect(status).toBe(400);
    const rows = await db.select().from(comments);
    expect(rows).toHaveLength(0);
  });

  it('strips <script> tags from bodyMd in stored body_html_safe', async () => {
    const userId = await createTestUser('mallory');
    const cookie = await loginAs(userId);
    const xss = 'before\n\n<script>alert("xss")</script>\n\nafter';
    const { status, body } = await call<{
      comment: { bodyHtmlSafe: string };
    }>('/posts/typescript-junior-closures/comments', {
      method: 'POST',
      cookie,
      body: { bodyMd: xss },
    });
    expect(status).toBe(201);
    expect(body.comment.bodyHtmlSafe).not.toMatch(/<script/i);
    expect(body.comment.bodyHtmlSafe).not.toContain('alert("xss")');
    expect(body.comment.bodyHtmlSafe).toContain('before');
    expect(body.comment.bodyHtmlSafe).toContain('after');
    const rows = await db.select().from(comments);
    expect(rows[0]!.bodyMd).toBe(xss);
    expect(rows[0]!.bodyHtmlSafe).not.toMatch(/<script/i);
  });
});

type CommentItem = {
  id: string;
  bodyHtmlSafe: string;
  author: { id: string; displayName: string; avatarUrl: string | null } | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};
type CommentListResponse = {
  items: CommentItem[];
  page: number;
  pageSize: number;
  total: number;
  pageCount: number;
};

describe('GET /posts/:id/comments', () => {
  it('returns 200 with empty list when no comments exist', async () => {
    const { status, body } = await call<CommentListResponse>(
      '/posts/typescript-junior-closures/comments',
    );
    expect(status).toBe(200);
    expect(body.items).toEqual([]);
    expect(body.total).toBe(0);
    expect(body.page).toBe(1);
    expect(body.pageCount).toBe(0);
  });

  it('lists comments chronologically ASC with author info', async () => {
    const aliceId = await createTestUser('alice');
    const bobId = await createTestUser('bob');
    const aliceCookie = await loginAs(aliceId);
    const bobCookie = await loginAs(bobId);
    await call('/posts/typescript-junior-closures/comments', {
      method: 'POST',
      cookie: aliceCookie,
      body: { bodyMd: 'first comment' },
    });
    await call('/posts/typescript-junior-closures/comments', {
      method: 'POST',
      cookie: bobCookie,
      body: { bodyMd: 'second comment' },
    });

    const { status, body } = await call<CommentListResponse>(
      '/posts/typescript-junior-closures/comments',
    );
    expect(status).toBe(200);
    expect(body.total).toBe(2);
    expect(body.items).toHaveLength(2);
    expect(body.items[0]!.bodyHtmlSafe).toContain('first');
    expect(body.items[1]!.bodyHtmlSafe).toContain('second');
    expect(body.items[0]!.author?.displayName).toBe('alice');
    expect(body.items[1]!.author?.displayName).toBe('bob');
    expect(body.items[0]!.deletedAt).toBeNull();
  });

  it('does not include body_md in response (only body_html_safe)', async () => {
    const userId = await createTestUser('keep_md_private');
    const cookie = await loginAs(userId);
    await call('/posts/typescript-junior-closures/comments', {
      method: 'POST',
      cookie,
      body: { bodyMd: '<script>x</script>plain' },
    });
    const { body } = await call<CommentListResponse & { items: Array<CommentItem & { bodyMd?: string }> }>(
      '/posts/typescript-junior-closures/comments',
    );
    expect(body.items[0]!.bodyHtmlSafe).toContain('plain');
    expect(body.items[0]!.bodyHtmlSafe).not.toMatch(/<script/i);
    expect(body.items[0]!.bodyMd).toBeUndefined();
  });

  it('returns 404 for unknown post', async () => {
    const { status } = await call('/posts/does-not-exist/comments');
    expect(status).toBe(404);
  });
});

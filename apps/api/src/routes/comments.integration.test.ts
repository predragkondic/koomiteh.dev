import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { eq, sql } from 'drizzle-orm';
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
  let bodyInit: string | undefined;
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

  it('HTML-escapes raw <script> tags in stored body_html_safe', async () => {
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
    expect(body.comment.bodyHtmlSafe).toContain('&lt;script&gt;');
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

  it('omits body_md for non-owners and anon viewers', async () => {
    const authorId = await createTestUser('author');
    const viewerId = await createTestUser('viewer');
    const authorCookie = await loginAs(authorId);
    await call('/posts/typescript-junior-closures/comments', {
      method: 'POST',
      cookie: authorCookie,
      body: { bodyMd: '<script>x</script>plain' },
    });
    const viewerCookie = await loginAs(viewerId);
    const { body: viewerBody } = await call<
      CommentListResponse & { items: Array<CommentItem & { bodyMd?: string }> }
    >('/posts/typescript-junior-closures/comments', {
      cookie: viewerCookie,
    });
    expect(viewerBody.items[0]!.bodyHtmlSafe).toContain('plain');
    expect(viewerBody.items[0]!.bodyHtmlSafe).not.toMatch(/<script/i);
    expect(viewerBody.items[0]!.bodyMd).toBeUndefined();

    const { body: anonBody } = await call<
      CommentListResponse & { items: Array<CommentItem & { bodyMd?: string }> }
    >('/posts/typescript-junior-closures/comments');
    expect(anonBody.items[0]!.bodyMd).toBeUndefined();
  });

  it('includes body_md only for the owner of the comment', async () => {
    const authorId = await createTestUser('owner');
    const authorCookie = await loginAs(authorId);
    const raw = 'My **draft** text\n\n```ts\nconst x = 1;\n```';
    await call('/posts/typescript-junior-closures/comments', {
      method: 'POST',
      cookie: authorCookie,
      body: { bodyMd: raw },
    });
    const { body } = await call<
      CommentListResponse & { items: Array<CommentItem & { bodyMd?: string }> }
    >('/posts/typescript-junior-closures/comments', {
      cookie: authorCookie,
    });
    expect(body.items[0]!.bodyMd).toBe(raw);
  });

  it('returns 404 for unknown post', async () => {
    const { status } = await call('/posts/does-not-exist/comments');
    expect(status).toBe(404);
  });

  it('paginates with page + pageSize', async () => {
    const userId = await createTestUser('many');
    const cookie = await loginAs(userId);
    for (let i = 0; i < 5; i++) {
      await call('/posts/typescript-junior-closures/comments', {
        method: 'POST',
        cookie,
        body: { bodyMd: `comment-${i}` },
      });
    }
    const { body } = await call<CommentListResponse>(
      '/posts/typescript-junior-closures/comments?page=2&pageSize=2',
    );
    expect(body.page).toBe(2);
    expect(body.pageSize).toBe(2);
    expect(body.total).toBe(5);
    expect(body.pageCount).toBe(3);
    expect(body.items).toHaveLength(2);
    expect(body.items[0]!.bodyHtmlSafe).toContain('comment-2');
    expect(body.items[1]!.bodyHtmlSafe).toContain('comment-3');
  });

  it('redacts soft-deleted comments to [deleted] with null author', async () => {
    const userId = await createTestUser('mortal');
    const cookie = await loginAs(userId);
    await call('/posts/typescript-junior-closures/comments', {
      method: 'POST',
      cookie,
      body: { bodyMd: 'about to vanish' },
    });
    await db.execute(
      sql`UPDATE ${comments} SET deleted_at = now() WHERE user_id = ${userId}`,
    );
    const { body } = await call<CommentListResponse>(
      '/posts/typescript-junior-closures/comments',
    );
    expect(body.total).toBe(1);
    expect(body.items[0]!.bodyHtmlSafe).toBe('[deleted]');
    expect(body.items[0]!.author).toBeNull();
    expect(body.items[0]!.deletedAt).not.toBeNull();
  });
});

async function postComment(
  cookie: string,
  bodyMd: string,
  contentId = 'typescript-junior-closures',
): Promise<string> {
  const { body } = await call<{ comment: { id: string } }>(
    `/posts/${contentId}/comments`,
    { method: 'POST', cookie, body: { bodyMd } },
  );
  return body.comment.id;
}

describe('PATCH /comments/:id', () => {
  it('lets the owner edit body, re-sanitizes, bumps updated_at', async () => {
    const userId = await createTestUser('editor');
    const cookie = await loginAs(userId);
    const commentId = await postComment(cookie, 'original');
    const before = await db
      .select({ updatedAt: comments.updatedAt })
      .from(comments)
      .where(eq(comments.id, commentId));
    await new Promise((r) => setTimeout(r, 5));
    const { status, body } = await call<{
      comment: { bodyHtmlSafe: string; updatedAt: string };
    }>(`/comments/${commentId}`, {
      method: 'PATCH',
      cookie,
      body: { bodyMd: 'edited <script>x</script> text' },
    });
    expect(status).toBe(200);
    expect(body.comment.bodyHtmlSafe).toContain('edited');
    expect(body.comment.bodyHtmlSafe).not.toMatch(/<script/i);
    const after = await db
      .select({ updatedAt: comments.updatedAt, bodyMd: comments.bodyMd })
      .from(comments)
      .where(eq(comments.id, commentId));
    expect(after[0]!.bodyMd).toBe('edited <script>x</script> text');
    expect(after[0]!.updatedAt.getTime()).toBeGreaterThan(
      before[0]!.updatedAt.getTime(),
    );
  });

  it('rejects non-owner with 403', async () => {
    const ownerId = await createTestUser('owner');
    const intruderId = await createTestUser('intruder');
    const ownerCookie = await loginAs(ownerId);
    const intruderCookie = await loginAs(intruderId);
    const commentId = await postComment(ownerCookie, 'mine');
    const { status } = await call(`/comments/${commentId}`, {
      method: 'PATCH',
      cookie: intruderCookie,
      body: { bodyMd: 'pwned' },
    });
    expect(status).toBe(403);
    const row = await db
      .select({ bodyMd: comments.bodyMd })
      .from(comments)
      .where(eq(comments.id, commentId));
    expect(row[0]!.bodyMd).toBe('mine');
  });

  it('rejects anonymous with 401', async () => {
    const ownerId = await createTestUser('owner2');
    const ownerCookie = await loginAs(ownerId);
    const commentId = await postComment(ownerCookie, 'mine2');
    const { status } = await call(`/comments/${commentId}`, {
      method: 'PATCH',
      body: { bodyMd: 'anon-edit' },
    });
    expect(status).toBe(401);
  });

  it('404 for missing comment', async () => {
    const userId = await createTestUser('ghost');
    const cookie = await loginAs(userId);
    const { status } = await call(
      '/comments/00000000-0000-0000-0000-000000000000',
      { method: 'PATCH', cookie, body: { bodyMd: 'x' } },
    );
    expect(status).toBe(404);
  });

  it('rejects body > 10000 chars with 400', async () => {
    const userId = await createTestUser('verbose');
    const cookie = await loginAs(userId);
    const commentId = await postComment(cookie, 'short');
    const { status } = await call(`/comments/${commentId}`, {
      method: 'PATCH',
      cookie,
      body: { bodyMd: 'a'.repeat(10001) },
    });
    expect(status).toBe(400);
  });

  it('rate-limit: 31st PATCH in window returns 429', async () => {
    const userId = await createTestUser('patcher');
    const cookie = await loginAs(userId);
    const commentId = await postComment(cookie, 'first');
    let lastStatus = 0;
    for (let i = 0; i < 31; i++) {
      const { status } = await call(`/comments/${commentId}`, {
        method: 'PATCH',
        cookie,
        body: { bodyMd: `edit-${i}` },
      });
      lastStatus = status;
      if (i < 30) {
        expect(status).toBe(200);
      }
    }
    expect(lastStatus).toBe(429);
  });
});

describe('DELETE /comments/:id', () => {
  it('owner soft-deletes (deleted_at set, row stays)', async () => {
    const ownerId = await createTestUser('soft');
    const cookie = await loginAs(ownerId);
    const commentId = await postComment(cookie, 'goodbye');
    const { status } = await call(`/comments/${commentId}`, {
      method: 'DELETE',
      cookie,
    });
    expect(status).toBe(200);
    const rows = await db
      .select()
      .from(comments)
      .where(eq(comments.id, commentId));
    expect(rows).toHaveLength(1);
    expect(rows[0]!.deletedAt).not.toBeNull();
  });

  it('admin hard-deletes any comment (row vanishes)', async () => {
    const ownerId = await createTestUser('victim');
    const adminId = await createTestUser('janitor', 'admin');
    const ownerCookie = await loginAs(ownerId);
    const adminCookie = await loginAs(adminId);
    const commentId = await postComment(ownerCookie, 'spam');
    const { status } = await call(`/comments/${commentId}`, {
      method: 'DELETE',
      cookie: adminCookie,
    });
    expect(status).toBe(200);
    const rows = await db
      .select()
      .from(comments)
      .where(eq(comments.id, commentId));
    expect(rows).toHaveLength(0);
  });

  it('superadmin hard-deletes any comment', async () => {
    const ownerId = await createTestUser('victim2');
    const supId = await createTestUser('overlord', 'superadmin');
    const ownerCookie = await loginAs(ownerId);
    const supCookie = await loginAs(supId);
    const commentId = await postComment(ownerCookie, 'oops');
    const { status } = await call(`/comments/${commentId}`, {
      method: 'DELETE',
      cookie: supCookie,
    });
    expect(status).toBe(200);
    const rows = await db
      .select()
      .from(comments)
      .where(eq(comments.id, commentId));
    expect(rows).toHaveLength(0);
  });

  it('non-owner non-admin gets 403, comment intact', async () => {
    const ownerId = await createTestUser('owner3');
    const intruderId = await createTestUser('intruder3');
    const ownerCookie = await loginAs(ownerId);
    const intruderCookie = await loginAs(intruderId);
    const commentId = await postComment(ownerCookie, 'safe');
    const { status } = await call(`/comments/${commentId}`, {
      method: 'DELETE',
      cookie: intruderCookie,
    });
    expect(status).toBe(403);
    const rows = await db
      .select()
      .from(comments)
      .where(eq(comments.id, commentId));
    expect(rows[0]!.deletedAt).toBeNull();
  });

  it('anonymous gets 401', async () => {
    const ownerId = await createTestUser('owner4');
    const ownerCookie = await loginAs(ownerId);
    const commentId = await postComment(ownerCookie, 'mine4');
    const { status } = await call(`/comments/${commentId}`, {
      method: 'DELETE',
    });
    expect(status).toBe(401);
  });

  it('404 for missing comment', async () => {
    const userId = await createTestUser('ghost2');
    const cookie = await loginAs(userId);
    const { status } = await call(
      '/comments/00000000-0000-0000-0000-000000000000',
      { method: 'DELETE', cookie },
    );
    expect(status).toBe(404);
  });

  it('rate-limit: returns 429 after 11th POST in the window', async () => {
    const userId = await createTestUser('flooder');
    const cookie = await loginAs(userId);
    let lastStatus = 0;
    for (let i = 0; i < 11; i++) {
      const { status } = await call(
        '/posts/typescript-junior-closures/comments',
        { method: 'POST', cookie, body: { bodyMd: `msg-${i}` } },
      );
      lastStatus = status;
      if (i < 10) {
        expect(status).toBe(201);
      }
    }
    expect(lastStatus).toBe(429);
  });

  it('soft-delete is idempotent (second DELETE by owner returns 200, no change)', async () => {
    const userId = await createTestUser('twice');
    const cookie = await loginAs(userId);
    const commentId = await postComment(cookie, 'temp');
    await call(`/comments/${commentId}`, { method: 'DELETE', cookie });
    const beforeRows = await db
      .select({ deletedAt: comments.deletedAt })
      .from(comments)
      .where(eq(comments.id, commentId));
    const firstDeletedAt = beforeRows[0]!.deletedAt;
    const { status } = await call(`/comments/${commentId}`, {
      method: 'DELETE',
      cookie,
    });
    expect(status).toBe(200);
    const afterRows = await db
      .select({ deletedAt: comments.deletedAt })
      .from(comments)
      .where(eq(comments.id, commentId));
    expect(afterRows[0]!.deletedAt!.toISOString()).toBe(
      firstDeletedAt!.toISOString(),
    );
  });
});

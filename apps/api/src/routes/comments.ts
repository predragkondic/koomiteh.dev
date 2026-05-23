import { Hono } from 'hono';
import { z } from 'zod';
import { and, asc, eq, isNull, sql } from 'drizzle-orm';
import { comments, posts, users } from '@koomiteh/shared';
import { db } from '../db/client.js';
import { requireAuth } from '../middleware/auth-context.js';
import { sanitizeCommentMd } from '../services/comment-sanitize.js';

const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 20;

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce
    .number()
    .int()
    .positive()
    .max(MAX_PAGE_SIZE)
    .default(DEFAULT_PAGE_SIZE),
});

const MAX_BODY = 10000;

const createBodySchema = z.object({
  bodyMd: z
    .string()
    .min(1)
    .max(MAX_BODY)
    .refine((s) => s.trim().length > 0, 'bodyMd must not be blank'),
});

export const postCommentsRoute = new Hono();

async function resolveLivePostId(contentId: string): Promise<string | null> {
  const rows = await db
    .select({ id: posts.id })
    .from(posts)
    .where(and(eq(posts.contentId, contentId), isNull(posts.deletedAt)))
    .limit(1);
  return rows[0]?.id ?? null;
}

postCommentsRoute.get('/', async (c) => {
  const contentId = c.req.param('id');
  const postId = await resolveLivePostId(contentId);
  if (!postId) {
    return c.json({ error: 'not_found' }, 404);
  }

  const parsed = listQuerySchema.safeParse({
    page: c.req.query('page'),
    pageSize: c.req.query('pageSize'),
  });
  if (!parsed.success) {
    return c.json({ error: 'invalid_query', issues: parsed.error.issues }, 400);
  }
  const { page, pageSize } = parsed.data;
  const offset = (page - 1) * pageSize;

  const where = eq(comments.postId, postId);

  const [rows, totalRows] = await Promise.all([
    db
      .select({
        id: comments.id,
        bodyHtmlSafe: comments.bodyHtmlSafe,
        createdAt: comments.createdAt,
        updatedAt: comments.updatedAt,
        deletedAt: comments.deletedAt,
        authorId: users.id,
        authorDisplayName: users.displayName,
        authorAvatarUrl: users.avatarUrl,
      })
      .from(comments)
      .innerJoin(users, eq(comments.userId, users.id))
      .where(where)
      .orderBy(asc(comments.createdAt))
      .limit(pageSize)
      .offset(offset),
    db
      .select({ total: sql<number>`count(*)::int` })
      .from(comments)
      .where(where),
  ]);

  const total = totalRows[0]?.total ?? 0;
  const items = rows.map((r) => {
    const isDeleted = r.deletedAt !== null;
    return {
      id: r.id,
      bodyHtmlSafe: isDeleted ? '[deleted]' : r.bodyHtmlSafe,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      deletedAt: isDeleted ? r.deletedAt!.toISOString() : null,
      author: isDeleted
        ? null
        : {
            id: r.authorId,
            displayName: r.authorDisplayName,
            avatarUrl: r.authorAvatarUrl,
          },
    };
  });

  return c.json({
    items,
    page,
    pageSize,
    total,
    pageCount: Math.ceil(total / pageSize),
  });
});

postCommentsRoute.post('/', requireAuth, async (c) => {
  const contentId = c.req.param('id');
  const postId = await resolveLivePostId(contentId);
  if (!postId) {
    return c.json({ error: 'not_found' }, 404);
  }
  const user = c.get('user')!;
  const rawJson = await c.req.json().catch(() => null);
  const parsed = createBodySchema.safeParse(rawJson);
  if (!parsed.success) {
    return c.json({ error: 'invalid_body', issues: parsed.error.issues }, 400);
  }
  const { bodyMd } = parsed.data;
  const bodyHtmlSafe = sanitizeCommentMd(bodyMd);
  const inserted = await db
    .insert(comments)
    .values({
      postId,
      userId: user.id,
      bodyMd,
      bodyHtmlSafe,
    })
    .returning();
  const row = inserted[0]!;
  return c.json(
    {
      comment: {
        id: row.id,
        bodyHtmlSafe: row.bodyHtmlSafe,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      },
    },
    201,
  );
});

const idParamSchema = z.string().uuid();

const editBodySchema = z.object({
  bodyMd: z
    .string()
    .min(1)
    .max(MAX_BODY)
    .refine((s) => s.trim().length > 0, 'bodyMd must not be blank'),
});

export const commentsRoute = new Hono();

commentsRoute.delete('/:id', requireAuth, async (c) => {
  const parsedId = idParamSchema.safeParse(c.req.param('id'));
  if (!parsedId.success) {
    return c.json({ error: 'not_found' }, 404);
  }
  const commentId = parsedId.data;
  const rows = await db
    .select()
    .from(comments)
    .where(eq(comments.id, commentId))
    .limit(1);
  const row = rows[0];
  if (!row) {
    return c.json({ error: 'not_found' }, 404);
  }
  const user = c.get('user')!;
  const isAdmin = user.role === 'admin' || user.role === 'superadmin';
  const isOwner = row.userId === user.id;
  if (!isOwner && !isAdmin) {
    return c.json({ error: 'forbidden' }, 403);
  }
  if (isAdmin && !isOwner) {
    await db.delete(comments).where(eq(comments.id, commentId));
    return c.json({ ok: true, deleted: 'hard' });
  }
  if (row.deletedAt) {
    return c.json({ ok: true, deleted: 'soft' });
  }
  await db
    .update(comments)
    .set({ deletedAt: new Date() })
    .where(eq(comments.id, commentId));
  return c.json({ ok: true, deleted: 'soft' });
});

commentsRoute.patch('/:id', requireAuth, async (c) => {
  const parsedId = idParamSchema.safeParse(c.req.param('id'));
  if (!parsedId.success) {
    return c.json({ error: 'not_found' }, 404);
  }
  const commentId = parsedId.data;
  const rows = await db
    .select()
    .from(comments)
    .where(eq(comments.id, commentId))
    .limit(1);
  const row = rows[0];
  if (!row || row.deletedAt) {
    return c.json({ error: 'not_found' }, 404);
  }
  const user = c.get('user')!;
  if (row.userId !== user.id) {
    return c.json({ error: 'forbidden' }, 403);
  }
  const rawJson = await c.req.json().catch(() => null);
  const parsed = editBodySchema.safeParse(rawJson);
  if (!parsed.success) {
    return c.json({ error: 'invalid_body', issues: parsed.error.issues }, 400);
  }
  const { bodyMd } = parsed.data;
  const bodyHtmlSafe = sanitizeCommentMd(bodyMd);
  const updated = await db
    .update(comments)
    .set({ bodyMd, bodyHtmlSafe, updatedAt: new Date() })
    .where(eq(comments.id, commentId))
    .returning();
  const out = updated[0]!;
  return c.json({
    comment: {
      id: out.id,
      bodyHtmlSafe: out.bodyHtmlSafe,
      createdAt: out.createdAt.toISOString(),
      updatedAt: out.updatedAt.toISOString(),
    },
  });
});

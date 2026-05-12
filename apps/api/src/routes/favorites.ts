import { Hono } from 'hono';
import { z } from 'zod';
import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import {
  favorites,
  posts,
  type Post,
  type PostFrontmatter,
} from '@koomiteh/shared';
import { db } from '../db/client.js';
import { requireAuth } from '../middleware/auth-context.js';
import { perUserKey, rateLimit } from '../middleware/rate-limit.js';

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

function toFrontmatter(row: Post): PostFrontmatter {
  return {
    id: row.contentId,
    slug: row.slug,
    question: row.question,
    language: row.language,
    level: row.level,
    tags: row.tags,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

const favoritesRateLimit = rateLimit({
  limit: 60,
  windowMs: 60_000,
  keyFn: perUserKey,
});

async function resolvePostId(contentId: string): Promise<string | null> {
  const rows = await db
    .select({ id: posts.id })
    .from(posts)
    .where(and(eq(posts.contentId, contentId), isNull(posts.deletedAt)))
    .limit(1);
  return rows[0]?.id ?? null;
}

export const favoritesRoute = new Hono();

favoritesRoute.post(
  '/:postId',
  requireAuth,
  favoritesRateLimit,
  async (c) => {
    const user = c.get('user')!;
    const contentId = c.req.param('postId');
    const postId = await resolvePostId(contentId);
    if (!postId) {
      return c.json({ error: 'not_found' }, 404);
    }
    await db
      .insert(favorites)
      .values({ userId: user.id, postId })
      .onConflictDoNothing();
    return c.json({ ok: true, favorited: true });
  },
);

favoritesRoute.delete(
  '/:postId',
  requireAuth,
  favoritesRateLimit,
  async (c) => {
    const user = c.get('user')!;
    const contentId = c.req.param('postId');
    const postId = await resolvePostId(contentId);
    if (!postId) {
      return c.json({ error: 'not_found' }, 404);
    }
    await db
      .delete(favorites)
      .where(and(eq(favorites.userId, user.id), eq(favorites.postId, postId)));
    return c.json({ ok: true, favorited: false });
  },
);

export const myFavoritesRoute = new Hono();

myFavoritesRoute.get('/favorites', requireAuth, async (c) => {
  const parsed = listQuerySchema.safeParse({
    page: c.req.query('page'),
    pageSize: c.req.query('pageSize'),
  });
  if (!parsed.success) {
    return c.json({ error: 'invalid_query', issues: parsed.error.issues }, 400);
  }

  const user = c.get('user')!;
  const { page, pageSize } = parsed.data;
  const offset = (page - 1) * pageSize;

  const where = and(eq(favorites.userId, user.id), isNull(posts.deletedAt));

  const [rows, totalRows] = await Promise.all([
    db
      .select({ post: posts, favoritedAt: favorites.createdAt })
      .from(favorites)
      .innerJoin(posts, eq(favorites.postId, posts.id))
      .where(where)
      .orderBy(desc(favorites.createdAt))
      .limit(pageSize)
      .offset(offset),
    db
      .select({ total: sql<number>`count(*)::int` })
      .from(favorites)
      .innerJoin(posts, eq(favorites.postId, posts.id))
      .where(where),
  ]);

  const total = totalRows[0]?.total ?? 0;

  return c.json({
    items: rows.map((r) => toFrontmatter(r.post)),
    page,
    pageSize,
    total,
    pageCount: Math.ceil(total / pageSize),
  });
});

myFavoritesRoute.get('/favorites/ids', requireAuth, async (c) => {
  const user = c.get('user')!;
  const rows = await db
    .select({ contentId: posts.contentId })
    .from(favorites)
    .innerJoin(posts, eq(favorites.postId, posts.id))
    .where(and(eq(favorites.userId, user.id), isNull(posts.deletedAt)));
  return c.json({ ids: rows.map((r) => r.contentId) });
});

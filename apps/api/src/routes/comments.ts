import { Hono } from 'hono';
import { and, eq, isNull } from 'drizzle-orm';
import { comments, posts } from '@koomiteh/shared';
import { db } from '../db/client.js';
import { requireAuth } from '../middleware/auth-context.js';

export const postCommentsRoute = new Hono();

postCommentsRoute.post('/', requireAuth, async (c) => {
  const contentId = c.req.param('id');
  const postRows = await db
    .select({ id: posts.id })
    .from(posts)
    .where(and(eq(posts.contentId, contentId), isNull(posts.deletedAt)))
    .limit(1);
  if (!postRows[0]) {
    return c.json({ error: 'not_found' }, 404);
  }
  const postId = postRows[0].id;
  const user = c.get('user')!;
  const { bodyMd } = await c.req.json<{ bodyMd: string }>();
  const inserted = await db
    .insert(comments)
    .values({
      postId,
      userId: user.id,
      bodyMd,
      bodyHtmlSafe: bodyMd,
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

export const commentsRoute = new Hono();

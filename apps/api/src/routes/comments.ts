import { Hono } from 'hono';
import { z } from 'zod';
import { and, eq, isNull } from 'drizzle-orm';
import { comments, posts } from '@koomiteh/shared';
import { db } from '../db/client.js';
import { requireAuth } from '../middleware/auth-context.js';
import { sanitizeCommentMd } from '../services/comment-sanitize.js';

const MAX_BODY = 10000;

const createBodySchema = z.object({
  bodyMd: z
    .string()
    .min(1)
    .max(MAX_BODY)
    .refine((s) => s.trim().length > 0, 'bodyMd must not be blank'),
});

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

export const commentsRoute = new Hono();

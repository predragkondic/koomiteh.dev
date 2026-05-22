import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { users } from '@koomiteh/shared';
import { db } from '../db/client.js';
import { requireAuth } from '../middleware/auth-context.js';

export const usersRoute = new Hono();

usersRoute.get('/:id', requireAuth, async (c) => {
  const id = c.req.param('id')!;
  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
  const row = rows[0];
  if (!row) {
    return c.json({ error: 'not_found' }, 404);
  }
  if (row.deletedAt) {
    return c.json(
      {
        error: 'gone',
        id: row.id,
        displayName: '[deleted]',
        avatarUrl: null,
        githubLogin: null,
        createdAt: row.createdAt.toISOString(),
      },
      410,
    );
  }
  return c.json({
    id: row.id,
    displayName: row.displayName,
    avatarUrl: row.avatarUrl,
    githubLogin: row.githubLogin,
    createdAt: row.createdAt.toISOString(),
  });
});

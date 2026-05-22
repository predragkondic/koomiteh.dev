import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { users } from '@koomiteh/shared';
import { db } from '../db/client.js';
import { requireAuth } from '../middleware/auth-context.js';

export const usersRoute = new Hono();

const idParamSchema = z.string().uuid();

usersRoute.get('/:id', requireAuth, async (c) => {
  const parsed = idParamSchema.safeParse(c.req.param('id'));
  if (!parsed.success) {
    return c.json({ error: 'not_found' }, 404);
  }
  const id = parsed.data;

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

  const viewer = c.get('user')!;
  const isSelf = viewer.id === row.id;
  const isAdmin = viewer.role === 'admin' || viewer.role === 'superadmin';

  if (row.suspendedAt && !isSelf && !isAdmin) {
    return c.json({ error: 'not_found' }, 404);
  }

  return c.json({
    id: row.id,
    displayName: row.displayName,
    avatarUrl: row.avatarUrl,
    githubLogin: row.githubLogin,
    createdAt: row.createdAt.toISOString(),
  });
});

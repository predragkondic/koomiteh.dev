import { Hono } from 'hono';
import { z } from 'zod';
import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import { sessions, users, type User } from '@koomiteh/shared';
import { db } from '../db/client.js';
import { requireAdmin } from '../middleware/auth-context.js';

const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 100;

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce
    .number()
    .int()
    .positive()
    .max(MAX_PAGE_SIZE)
    .default(DEFAULT_PAGE_SIZE),
});

export type AdminUserListItem = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  githubLogin: string;
  role: 'user' | 'admin' | 'superadmin';
  createdAt: string;
  suspendedAt: string | null;
};

function toListItem(row: User): AdminUserListItem {
  return {
    id: row.id,
    displayName: row.displayName,
    avatarUrl: row.avatarUrl,
    githubLogin: row.githubLogin,
    role: row.role,
    createdAt: row.createdAt.toISOString(),
    suspendedAt: row.suspendedAt ? row.suspendedAt.toISOString() : null,
  };
}

export const adminUsersRoute = new Hono();

adminUsersRoute.use('*', requireAdmin);

type ActorRole = 'admin' | 'superadmin';
type TargetRole = 'user' | 'admin' | 'superadmin';

function canActOn(
  actor: { id: string; role: ActorRole },
  target: { id: string; role: TargetRole },
): boolean {
  if (actor.id === target.id) return false;
  if (actor.role === 'admin') return target.role === 'user';
  // superadmin
  return target.role === 'user' || target.role === 'admin';
}

const idParamSchema = z.string().uuid();

async function findTarget(id: string): Promise<User | null> {
  const parsed = idParamSchema.safeParse(id);
  if (!parsed.success) return null;
  const rows = await db
    .select()
    .from(users)
    .where(and(eq(users.id, id), isNull(users.deletedAt)))
    .limit(1);
  return rows[0] ?? null;
}

adminUsersRoute.get('/', async (c) => {
  const parsed = listQuerySchema.safeParse({
    page: c.req.query('page'),
    pageSize: c.req.query('pageSize'),
  });
  if (!parsed.success) {
    return c.json({ error: 'invalid_query', issues: parsed.error.issues }, 400);
  }
  const { page, pageSize } = parsed.data;
  const offset = (page - 1) * pageSize;

  const [rows, totalRows] = await Promise.all([
    db
      .select()
      .from(users)
      .where(sql`${users.deletedAt} IS NULL`)
      .orderBy(desc(users.createdAt))
      .limit(pageSize)
      .offset(offset),
    db
      .select({ total: sql<number>`count(*)::int` })
      .from(users)
      .where(sql`${users.deletedAt} IS NULL`),
  ]);

  const total = totalRows[0]?.total ?? 0;

  return c.json({
    items: rows.map(toListItem),
    page,
    pageSize,
    total,
    pageCount: Math.ceil(total / pageSize),
  });
});

adminUsersRoute.post('/:id/suspend', async (c) => {
  const actor = c.get('user')! as User & { role: ActorRole };
  const target = await findTarget(c.req.param('id'));
  if (!target) return c.json({ error: 'not_found' }, 404);
  if (!canActOn(actor, target)) return c.json({ error: 'forbidden' }, 403);

  await db
    .update(users)
    .set({ suspendedAt: new Date() })
    .where(eq(users.id, target.id));
  await db.delete(sessions).where(eq(sessions.userId, target.id));

  return c.json({ ok: true, suspended: true });
});

adminUsersRoute.post('/:id/unsuspend', async (c) => {
  const actor = c.get('user')! as User & { role: ActorRole };
  const target = await findTarget(c.req.param('id'));
  if (!target) return c.json({ error: 'not_found' }, 404);
  if (!canActOn(actor, target)) return c.json({ error: 'forbidden' }, 403);

  await db
    .update(users)
    .set({ suspendedAt: null })
    .where(eq(users.id, target.id));

  return c.json({ ok: true, suspended: false });
});

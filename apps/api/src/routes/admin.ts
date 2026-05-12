import { Hono } from 'hono';
import { z } from 'zod';
import { and, arrayOverlaps, desc, eq, isNull, ne, sql, type SQL } from 'drizzle-orm';
import {
  posts,
  isLanguageId,
  adminPostCreateSchema,
  adminPostUpdateSchema,
  type Post,
  type AdminPostListItem,
} from '@koomiteh/shared';
import { db } from '../db/client.js';
import { requireAdmin } from '../middleware/auth-context.js';

const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 20;

function toListItem(row: Post): AdminPostListItem {
  return {
    id: row.contentId,
    slug: row.slug,
    question: row.question,
    language: row.language,
    level: row.level,
    tags: row.tags,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    deletedAt: row.deletedAt ? row.deletedAt.toISOString() : null,
  };
}

const listQuerySchema = z.object({
  language: z.string().min(1).optional(),
  level: z.enum(['junior', 'senior']).optional(),
  tag: z.array(z.string().min(1)).optional(),
  q: z.string().min(1).optional(),
  includeDeleted: z
    .union([z.string(), z.boolean()])
    .optional()
    .transform((v) => v === true || v === 'true' || v === '1'),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce
    .number()
    .int()
    .positive()
    .max(MAX_PAGE_SIZE)
    .default(DEFAULT_PAGE_SIZE),
});

function buildContentId(language: string, level: string, slug: string): string {
  return `${language}-${level}-${slug}`;
}

async function findByContentId(contentId: string): Promise<Post | null> {
  const rows = await db
    .select()
    .from(posts)
    .where(eq(posts.contentId, contentId))
    .limit(1);
  return rows[0] ?? null;
}

export const adminRoute = new Hono();

adminRoute.use('*', requireAdmin);

adminRoute.get('/posts', async (c) => {
  const tagsParam = c.req.queries('tag');
  const parsed = listQuerySchema.safeParse({
    language: c.req.query('language'),
    level: c.req.query('level'),
    tag: tagsParam && tagsParam.length > 0 ? tagsParam : undefined,
    q: c.req.query('q'),
    includeDeleted: c.req.query('includeDeleted'),
    page: c.req.query('page'),
    pageSize: c.req.query('pageSize'),
  });
  if (!parsed.success) {
    return c.json({ error: 'invalid_query', issues: parsed.error.issues }, 400);
  }

  const { language, level, tag, q, includeDeleted, page, pageSize } = parsed.data;
  const offset = (page - 1) * pageSize;

  const conds: SQL[] = [];
  if (!includeDeleted) conds.push(isNull(posts.deletedAt));
  if (language) conds.push(eq(posts.language, language));
  if (level) conds.push(eq(posts.level, level));
  if (tag && tag.length > 0) conds.push(arrayOverlaps(posts.tags, tag));
  if (q) conds.push(sql`${posts.question} ILIKE ${`%${q}%`}`);

  const where = conds.length > 0 ? and(...conds) : undefined;

  const [rows, totalRows] = await Promise.all([
    db
      .select()
      .from(posts)
      .where(where)
      .orderBy(desc(posts.updatedAt))
      .limit(pageSize)
      .offset(offset),
    db
      .select({ total: sql<number>`count(*)::int` })
      .from(posts)
      .where(where),
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

adminRoute.get('/posts/:id', async (c) => {
  const row = await findByContentId(c.req.param('id'));
  if (!row) {
    return c.json({ error: 'not_found' }, 404);
  }
  return c.json({
    frontmatter: toListItem(row),
    bodyMd: row.bodyMd,
  });
});

adminRoute.post('/posts', async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'invalid_json' }, 400);
  }

  const parsed = adminPostCreateSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'invalid_body', issues: parsed.error.issues }, 400);
  }
  const data = parsed.data;
  if (!isLanguageId(data.language)) {
    return c.json({ error: 'invalid_language' }, 400);
  }

  const existingSlug = await db
    .select({ id: posts.id })
    .from(posts)
    .where(and(eq(posts.language, data.language), eq(posts.slug, data.slug)))
    .limit(1);
  if (existingSlug[0]) {
    return c.json({ error: 'slug_conflict' }, 409);
  }

  const contentId = buildContentId(data.language, data.level, data.slug);
  const existingContentId = await db
    .select({ id: posts.id })
    .from(posts)
    .where(eq(posts.contentId, contentId))
    .limit(1);
  if (existingContentId[0]) {
    return c.json({ error: 'content_id_conflict' }, 409);
  }

  const inserted = await db
    .insert(posts)
    .values({
      contentId,
      slug: data.slug,
      question: data.question,
      language: data.language,
      level: data.level,
      tags: data.tags,
      bodyMd: data.bodyMd,
    })
    .returning();

  return c.json(
    {
      frontmatter: toListItem(inserted[0]!),
      bodyMd: inserted[0]!.bodyMd,
    },
    201,
  );
});

adminRoute.patch('/posts/:id', async (c) => {
  const existing = await findByContentId(c.req.param('id'));
  if (!existing) {
    return c.json({ error: 'not_found' }, 404);
  }

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'invalid_json' }, 400);
  }

  const parsed = adminPostUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'invalid_body', issues: parsed.error.issues }, 400);
  }
  const data = parsed.data;

  if (data.language && !isLanguageId(data.language)) {
    return c.json({ error: 'invalid_language' }, 400);
  }

  const nextLanguage = data.language ?? existing.language;
  const nextSlug = data.slug ?? existing.slug;

  if (data.slug || data.language) {
    const slugConflict = await db
      .select({ id: posts.id })
      .from(posts)
      .where(
        and(
          eq(posts.language, nextLanguage),
          eq(posts.slug, nextSlug),
          ne(posts.id, existing.id),
        ),
      )
      .limit(1);
    if (slugConflict[0]) {
      return c.json({ error: 'slug_conflict' }, 409);
    }
  }

  const updated = await db
    .update(posts)
    .set({
      ...(data.slug !== undefined && { slug: data.slug }),
      ...(data.question !== undefined && { question: data.question }),
      ...(data.language !== undefined && { language: data.language }),
      ...(data.level !== undefined && { level: data.level }),
      ...(data.tags !== undefined && { tags: data.tags }),
      ...(data.bodyMd !== undefined && { bodyMd: data.bodyMd }),
      updatedAt: new Date(),
    })
    .where(eq(posts.id, existing.id))
    .returning();

  return c.json({
    frontmatter: toListItem(updated[0]!),
    bodyMd: updated[0]!.bodyMd,
  });
});

adminRoute.delete('/posts/:id', async (c) => {
  const existing = await findByContentId(c.req.param('id'));
  if (!existing) {
    return c.json({ error: 'not_found' }, 404);
  }
  if (existing.deletedAt) {
    return c.json({ ok: true, deleted: true });
  }
  await db
    .update(posts)
    .set({ deletedAt: new Date() })
    .where(eq(posts.id, existing.id));
  return c.json({ ok: true, deleted: true });
});

adminRoute.post('/posts/:id/restore', async (c) => {
  const existing = await findByContentId(c.req.param('id'));
  if (!existing) {
    return c.json({ error: 'not_found' }, 404);
  }
  if (!existing.deletedAt) {
    return c.json({ ok: true, deleted: false });
  }
  await db
    .update(posts)
    .set({ deletedAt: null })
    .where(eq(posts.id, existing.id));
  return c.json({ ok: true, deleted: false });
});

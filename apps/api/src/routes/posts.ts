import { Hono } from 'hono';
import { z } from 'zod';
import { and, arrayOverlaps, eq, isNull, sql, type SQL } from 'drizzle-orm';
import {
  posts,
  LANGUAGES,
  type Post,
  type PostFrontmatter,
} from '@koomiteh/shared';
import { db } from '../db/client.js';
import { env } from '../env.js';
import { postCommentsRoute } from './comments.js';

const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 20;
const MIN_Q_LENGTH = 3;

const SEARCH_VECTOR = sql`${posts}.search_vector`;

function buildPrefixTsQuery(q: string): string | null {
  const tokens = q
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.replace(/[^\p{L}\p{N}]+/gu, ''))
    .filter((t) => t.length > 0);
  if (tokens.length === 0) return null;
  return tokens.map((t) => `${t}:*`).join(' & ');
}

function escapeLike(s: string): string {
  return s.replace(/[\\%_]/g, '\\$&');
}

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

const listQuerySchema = z.object({
  language: z.string().min(1).optional(),
  level: z.enum(['junior', 'senior']).optional(),
  tag: z.array(z.string().min(1)).optional(),
  q: z.string().min(1).optional(),
  sort: z.enum(['relevance', 'newest']).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce
    .number()
    .int()
    .positive()
    .max(MAX_PAGE_SIZE)
    .default(DEFAULT_PAGE_SIZE),
});

export const postsRoute = new Hono();

postsRoute.route('/:id/comments', postCommentsRoute);

postsRoute.get('/tags', async (c) => {
  const language = c.req.query('language');
  const conds: SQL[] = [isNull(posts.deletedAt)];
  if (language) conds.push(eq(posts.language, language));

  const rows = await db
    .select({
      tag: sql<string>`unnest(${posts.tags})`,
    })
    .from(posts)
    .where(and(...conds));

  const set = new Set<string>();
  for (const r of rows) set.add(r.tag);
  const tags = Array.from(set).sort();

  return c.json({ tags });
});

postsRoute.get('/manifest', async (c) => {
  const rows = await db
    .select({
      language: posts.language,
      count: sql<number>`count(*)::int`,
    })
    .from(posts)
    .where(isNull(posts.deletedAt))
    .groupBy(posts.language);

  const counts = new Map<string, number>(rows.map((r) => [r.language, r.count]));

  const languages = LANGUAGES.map((l) => ({
    id: l.id,
    displayName: l.displayName,
    count: counts.get(l.id) ?? 0,
  }));
  const totalCount = languages.reduce((s, l) => s + l.count, 0);

  return c.json({
    languages,
    totalCount,
    builtAt: env.builtAt,
  });
});

postsRoute.get('/', async (c) => {
  const tagsParam = c.req.queries('tag');
  const parsed = listQuerySchema.safeParse({
    language: c.req.query('language'),
    level: c.req.query('level'),
    tag: tagsParam && tagsParam.length > 0 ? tagsParam : undefined,
    q: c.req.query('q'),
    sort: c.req.query('sort'),
    page: c.req.query('page'),
    pageSize: c.req.query('pageSize'),
  });

  if (!parsed.success) {
    return c.json({ error: 'invalid_query', issues: parsed.error.issues }, 400);
  }

  const { language, level, tag, q, page, pageSize } = parsed.data;
  const sort = parsed.data.sort ?? (q ? 'relevance' : 'newest');
  const offset = (page - 1) * pageSize;

  const baseConds: SQL[] = [isNull(posts.deletedAt)];
  if (language) baseConds.push(eq(posts.language, language));
  if (level) baseConds.push(eq(posts.level, level));
  if (tag && tag.length > 0) {
    baseConds.push(arrayOverlaps(posts.tags, tag));
  }

  const runListing = async (extraCond: SQL | null, orderBy: SQL) => {
    const where = extraCond
      ? and(...baseConds, extraCond)
      : and(...baseConds);
    const [rows, totalRows] = await Promise.all([
      db
        .select()
        .from(posts)
        .where(where)
        .orderBy(orderBy)
        .limit(pageSize)
        .offset(offset),
      db
        .select({ total: sql<number>`count(*)::int` })
        .from(posts)
        .where(where),
    ]);
    return { rows, total: totalRows[0]?.total ?? 0 };
  };

  let items: Post[] = [];
  let total = 0;

  const qTrimmed = q?.trim() ?? '';
  const tsq =
    qTrimmed.length >= MIN_Q_LENGTH ? buildPrefixTsQuery(qTrimmed) : null;

  if (tsq) {
    const ftsCond = sql`${SEARCH_VECTOR} @@ to_tsquery('english', ${tsq})`;
    const ftsOrder =
      sort === 'relevance'
        ? sql`ts_rank(${SEARCH_VECTOR}, to_tsquery('english', ${tsq})) DESC, ${posts.createdAt} DESC`
        : sql`${posts.createdAt} DESC`;
    const ftsResult = await runListing(ftsCond, ftsOrder);
    if (ftsResult.total > 0) {
      items = ftsResult.rows;
      total = ftsResult.total;
    } else {
      const likePattern = `%${escapeLike(qTrimmed)}%`;
      const fallbackCond = sql`(${posts.question} % ${qTrimmed} OR ${posts.question} ILIKE ${likePattern})`;
      const fallbackOrder =
        sort === 'relevance'
          ? sql`similarity(${posts.question}, ${qTrimmed}) DESC, ${posts.createdAt} DESC`
          : sql`${posts.createdAt} DESC`;
      const fallbackResult = await runListing(fallbackCond, fallbackOrder);
      items = fallbackResult.rows;
      total = fallbackResult.total;
    }
  } else {
    const result = await runListing(null, sql`${posts.createdAt} DESC`);
    items = result.rows;
    total = result.total;
  }

  return c.json({
    items: items.map(toFrontmatter),
    page,
    pageSize,
    total,
    pageCount: Math.ceil(total / pageSize),
  });
});

postsRoute.get('/by-slug/:language/:slug', async (c) => {
  const language = c.req.param('language');
  const slug = c.req.param('slug');
  const rows = await db
    .select()
    .from(posts)
    .where(and(eq(posts.language, language), eq(posts.slug, slug)))
    .limit(1);
  const row = rows[0];
  if (!row) {
    return c.json({ error: 'not_found' }, 404);
  }
  if (row.deletedAt) {
    return c.json(
      {
        error: 'gone',
        id: row.contentId,
        language: row.language,
        slug: row.slug,
      },
      410,
    );
  }
  return c.json({
    frontmatter: toFrontmatter(row),
    bodyMd: row.bodyMd,
  });
});

postsRoute.get('/:id', async (c) => {
  const contentId = c.req.param('id');
  const rows = await db
    .select()
    .from(posts)
    .where(eq(posts.contentId, contentId))
    .limit(1);
  const row = rows[0];
  if (!row) {
    return c.json({ error: 'not_found' }, 404);
  }
  if (row.deletedAt) {
    return c.json(
      {
        error: 'gone',
        id: row.contentId,
        language: row.language,
        slug: row.slug,
      },
      410,
    );
  }
  return c.json({
    frontmatter: toFrontmatter(row),
    bodyMd: row.bodyMd,
  });
});

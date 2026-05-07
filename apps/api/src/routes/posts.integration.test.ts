import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sql } from 'drizzle-orm';
import { posts } from '@koomiteh/shared';
import { db, pool } from '../db/client.js';
import { createApp } from '../app.js';
import { seedFromDir } from '../seed.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const fixtureDir = path.resolve(here, '../test-fixtures/content');

const app = createApp();

async function callJson<T = unknown>(pathname: string): Promise<{
  status: number;
  body: T;
}> {
  const res = await app.request(`http://localhost${pathname}`, {
    method: 'GET',
    headers: { Origin: 'http://localhost:5173' },
  });
  const body = (await res.json()) as T;
  return { status: res.status, body };
}

beforeAll(async () => {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL must be set for integration tests');
  }
});

beforeEach(async () => {
  await db.execute(sql`TRUNCATE TABLE ${posts} RESTART IDENTITY CASCADE`);
});

afterAll(async () => {
  await pool.end();
});

describe('seed', () => {
  it('inserts on first run, updates on second (idempotent)', async () => {
    const first = await seedFromDir(fixtureDir);
    expect(first.inserted).toBe(4);
    expect(first.updated).toBe(0);
    expect(first.total).toBe(4);

    const second = await seedFromDir(fixtureDir);
    expect(second.inserted).toBe(0);
    expect(second.updated).toBe(4);
    expect(second.total).toBe(4);
  });
});

describe('GET /posts/manifest', () => {
  it('returns counts per language and total', async () => {
    await seedFromDir(fixtureDir);
    const { status, body } = await callJson<{
      languages: Array<{ id: string; displayName: string; count: number }>;
      totalCount: number;
      builtAt: string;
    }>('/posts/manifest');

    expect(status).toBe(200);
    expect(body.totalCount).toBe(4);
    const langMap = Object.fromEntries(body.languages.map((l) => [l.id, l]));
    expect(langMap.typescript).toMatchObject({
      displayName: 'TypeScript',
      count: 2,
    });
    expect(langMap.javascript).toMatchObject({
      displayName: 'JavaScript',
      count: 2,
    });
    expect(typeof body.builtAt).toBe('string');
  });

  it('returns zeros when DB is empty', async () => {
    const { status, body } = await callJson<{
      languages: Array<{ count: number }>;
      totalCount: number;
    }>('/posts/manifest');

    expect(status).toBe(200);
    expect(body.totalCount).toBe(0);
    expect(body.languages.every((l) => l.count === 0)).toBe(true);
  });
});

describe('GET /posts (filters + pagination)', () => {
  beforeEach(async () => {
    await seedFromDir(fixtureDir);
  });

  it('returns all posts sorted newest-first by default', async () => {
    const { status, body } = await callJson<{
      items: Array<{ id: string; createdAt: string }>;
      total: number;
      pageCount: number;
    }>('/posts');

    expect(status).toBe(200);
    expect(body.total).toBe(4);
    expect(body.pageCount).toBe(1);
    expect(body.items[0].id).toBe('javascript-senior-event-loop'); // 2026-04-05
    expect(body.items[3].id).toBe('typescript-junior-closures'); // 2026-01-10
  });

  it('filters by language', async () => {
    const { body } = await callJson<{
      items: Array<{ id: string; language: string }>;
      total: number;
    }>('/posts?language=typescript');

    expect(body.total).toBe(2);
    expect(body.items.every((i) => i.language === 'typescript')).toBe(true);
  });

  it('filters by level', async () => {
    const { body } = await callJson<{
      items: Array<{ id: string; level: string }>;
      total: number;
    }>('/posts?level=senior');

    expect(body.total).toBe(2);
    expect(body.items.every((i) => i.level === 'senior')).toBe(true);
  });

  it('filters by multiple tags (OR via array overlap)', async () => {
    const { body } = await callJson<{
      items: Array<{ id: string; tags: string[] }>;
      total: number;
    }>('/posts?tag=hoisting&tag=variance');

    expect(body.total).toBe(2);
    const ids = body.items.map((i) => i.id).sort();
    expect(ids).toEqual([
      'javascript-junior-hoisting',
      'typescript-senior-variance',
    ]);
  });

  it('combines filters', async () => {
    const { body } = await callJson<{
      items: Array<{ id: string }>;
      total: number;
    }>('/posts?language=typescript&level=junior');

    expect(body.total).toBe(1);
    expect(body.items[0].id).toBe('typescript-junior-closures');
  });

  it('paginates with page + pageSize and computes pageCount', async () => {
    const { body } = await callJson<{
      items: Array<{ id: string }>;
      page: number;
      pageSize: number;
      total: number;
      pageCount: number;
    }>('/posts?pageSize=2&page=2');

    expect(body.page).toBe(2);
    expect(body.pageSize).toBe(2);
    expect(body.total).toBe(4);
    expect(body.pageCount).toBe(2);
    expect(body.items).toHaveLength(2);
  });

  it('rejects pageSize > 100', async () => {
    const { status } = await callJson('/posts?pageSize=101');
    expect(status).toBe(400);
  });
});

describe('GET /posts (search + ranking)', () => {
  beforeEach(async () => {
    await seedFromDir(fixtureDir);
  });

  it('ranks closure-related posts higher when q=closure', async () => {
    const { body } = await callJson<{
      items: Array<{ id: string }>;
      total: number;
    }>('/posts?q=closure');

    expect(body.total).toBeGreaterThan(0);
    expect(body.items[0].id).toBe('typescript-junior-closures');
  });

  it('matches via tag (B-weight) when q=variance', async () => {
    const { body } = await callJson<{
      items: Array<{ id: string }>;
      total: number;
    }>('/posts?q=variance');

    expect(body.total).toBeGreaterThan(0);
    expect(body.items[0].id).toBe('typescript-senior-variance');
  });

  it('falls back to pg_trgm when FTS yields zero hits (typo: hoistng)', async () => {
    const { body } = await callJson<{
      items: Array<{ id: string }>;
      total: number;
    }>('/posts?q=hoistng');

    expect(body.total).toBe(1);
    expect(body.items[0].id).toBe('javascript-junior-hoisting');
  });

  it('honors sort=newest while still applying FTS where-clause', async () => {
    const { body } = await callJson<{
      items: Array<{ id: string; createdAt: string }>;
      total: number;
    }>('/posts?q=hoisting&sort=newest');

    expect(body.total).toBe(1);
    expect(body.items[0].id).toBe('javascript-junior-hoisting');
  });
});

describe('GET /posts/tags', () => {
  beforeEach(async () => {
    await seedFromDir(fixtureDir);
  });

  it('returns sorted unique tags across all languages', async () => {
    const { status, body } = await callJson<{ tags: string[] }>('/posts/tags');
    expect(status).toBe(200);
    expect(body.tags).toEqual([...body.tags].sort());
    expect(new Set(body.tags).size).toBe(body.tags.length);
    expect(body.tags).toContain('closures');
    expect(body.tags).toContain('hoisting');
    expect(body.tags).toContain('variance');
  });

  it('filters tags by language', async () => {
    const { body } = await callJson<{ tags: string[] }>(
      '/posts/tags?language=javascript',
    );
    expect(body.tags).not.toContain('variance');
    expect(body.tags).toContain('hoisting');
  });

  it('excludes tags from soft-deleted posts', async () => {
    await db.execute(
      sql`UPDATE ${posts} SET deleted_at = now() WHERE content_id = 'typescript-senior-variance'`,
    );
    const { body } = await callJson<{ tags: string[] }>(
      '/posts/tags?language=typescript',
    );
    expect(body.tags).not.toContain('variance');
  });
});

describe('GET /posts/by-slug/:language/:slug', () => {
  beforeEach(async () => {
    await seedFromDir(fixtureDir);
  });

  it('returns frontmatter + bodyMd for matching language+slug', async () => {
    const { status, body } = await callJson<{
      frontmatter: { id: string; slug: string; language: string };
      bodyMd: string;
    }>('/posts/by-slug/typescript/what-is-a-closure');
    expect(status).toBe(200);
    expect(body.frontmatter.id).toBe('typescript-junior-closures');
    expect(body.frontmatter.slug).toBe('what-is-a-closure');
    expect(body.frontmatter.language).toBe('typescript');
  });

  it('returns 404 for unknown slug', async () => {
    const { status } = await callJson(
      '/posts/by-slug/typescript/does-not-exist',
    );
    expect(status).toBe(404);
  });

  it('returns 404 when language does not match the slug', async () => {
    const { status } = await callJson(
      '/posts/by-slug/javascript/what-is-a-closure',
    );
    expect(status).toBe(404);
  });

  it('excludes soft-deleted posts', async () => {
    await db.execute(
      sql`UPDATE ${posts} SET deleted_at = now() WHERE content_id = 'typescript-junior-closures'`,
    );
    const { status } = await callJson(
      '/posts/by-slug/typescript/what-is-a-closure',
    );
    expect(status).toBe(404);
  });
});

describe('GET /posts/:id', () => {
  beforeEach(async () => {
    await seedFromDir(fixtureDir);
  });

  it('returns frontmatter + bodyMd for an existing content_id', async () => {
    const { status, body } = await callJson<{
      frontmatter: { id: string; slug: string; tags: string[] };
      bodyMd: string;
    }>('/posts/typescript-junior-closures');

    expect(status).toBe(200);
    expect(body.frontmatter.id).toBe('typescript-junior-closures');
    expect(body.frontmatter.slug).toBe('what-is-a-closure');
    expect(body.frontmatter.tags).toEqual(['closures', 'scope']);
    expect(body.bodyMd).toContain('A **closure**');
    expect(body.bodyMd).toContain('makeCounter');
  });

  it('returns 404 for unknown id', async () => {
    const { status } = await callJson('/posts/does-not-exist');
    expect(status).toBe(404);
  });

  it('excludes soft-deleted posts', async () => {
    await db.execute(
      sql`UPDATE ${posts} SET deleted_at = now() WHERE content_id = 'typescript-junior-closures'`,
    );

    const { status } = await callJson('/posts/typescript-junior-closures');
    expect(status).toBe(404);

    const { body } = await callJson<{
      total: number;
      items: Array<{ id: string }>;
    }>('/posts');
    expect(body.total).toBe(3);
    expect(body.items.some((i) => i.id === 'typescript-junior-closures')).toBe(
      false,
    );
  });
});

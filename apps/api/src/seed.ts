import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import { eq } from 'drizzle-orm';
import {
  posts,
  seedFrontmatterSchema,
  isLanguageId,
} from '@koomiteh/shared';
import { db, pool } from './db/client.js';
import { logger } from './logger.js';

export type SeedResult = {
  inserted: number;
  updated: number;
  total: number;
};

export async function seedFromDir(contentDir: string): Promise<SeedResult> {
  const entries = await fs.readdir(contentDir).catch((err: NodeJS.ErrnoException) => {
    if (err.code === 'ENOENT') return [] as string[];
    throw err;
  });
  const mdFiles = entries.filter((f) => f.endsWith('.md')).sort();

  let inserted = 0;
  let updated = 0;
  const seenContentIds = new Set<string>();

  for (const file of mdFiles) {
    const full = path.join(contentDir, file);
    const raw = await fs.readFile(full, 'utf-8');
    const parsed = matter(raw);
    const fm = seedFrontmatterSchema.parse(parsed.data);

    if (!isLanguageId(fm.language)) {
      throw new Error(
        `Invalid language "${fm.language}" in ${file} (not in LANGUAGES)`,
      );
    }
    const expectedFile = `${fm.id}.md`;
    if (file !== expectedFile) {
      throw new Error(
        `Filename "${file}" does not match id "${fm.id}" (expected ${expectedFile})`,
      );
    }
    if (seenContentIds.has(fm.id)) {
      throw new Error(`Duplicate id "${fm.id}" across markdown files`);
    }
    seenContentIds.add(fm.id);

    const values = {
      contentId: fm.id,
      slug: fm.slug,
      question: fm.question,
      language: fm.language,
      level: fm.level,
      tags: fm.tags,
      bodyMd: parsed.content,
      createdAt: new Date(`${fm.createdAt}T00:00:00Z`),
      updatedAt: new Date(`${fm.updatedAt}T00:00:00Z`),
    };

    const existing = await db
      .select({ id: posts.id })
      .from(posts)
      .where(eq(posts.contentId, fm.id))
      .limit(1);

    if (existing[0]) {
      await db
        .update(posts)
        .set({
          slug: values.slug,
          question: values.question,
          language: values.language,
          level: values.level,
          tags: values.tags,
          bodyMd: values.bodyMd,
          createdAt: values.createdAt,
          updatedAt: values.updatedAt,
          deletedAt: null,
        })
        .where(eq(posts.id, existing[0].id));
      updated++;
    } else {
      await db.insert(posts).values(values);
      inserted++;
    }
  }

  return { inserted, updated, total: mdFiles.length };
}

const isMain =
  process.argv[1] !== undefined &&
  import.meta.url === `file://${process.argv[1]}`;

if (isMain) {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const repoRoot = path.resolve(here, '../../..');
  const contentDir = path.join(repoRoot, 'content', 'post');

  seedFromDir(contentDir)
    .then(async (result) => {
      logger.info(result, 'seed complete');
      await pool.end();
    })
    .catch(async (err: unknown) => {
      logger.error({ err }, 'seed failed');
      await pool.end().catch(() => {});
      process.exit(1);
    });
}

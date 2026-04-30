import { describe, it, expect, beforeAll } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import MiniSearch from 'minisearch';
import { buildContent, FrontmatterSchema } from './build-content.js';

const FIXTURES = path.resolve(__dirname, '__fixtures__');

const LANGUAGES = [
  { id: 'typescript', displayName: 'TypeScript', shikiLang: 'ts' },
  { id: 'javascript', displayName: 'JavaScript', shikiLang: 'js' },
] as const;

async function tmpOut(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), 'build-content-'));
}

describe('FrontmatterSchema', () => {
  const Schema = FrontmatterSchema(['typescript', 'javascript']);

  it('accepts valid frontmatter', () => {
    const result = Schema.safeParse({
      id: 'typescript-junior-x',
      slug: 'x',
      question: 'Q?',
      language: 'typescript',
      level: 'junior',
      tags: ['a-b', 'c1'],
      createdAt: '2026-01-01',
      updatedAt: '2026-01-02',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing required field', () => {
    const result = Schema.safeParse({
      id: 'x',
      slug: 'x',
      language: 'typescript',
      level: 'junior',
      tags: [],
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    });
    expect(result.success).toBe(false);
  });

  it('rejects unknown language', () => {
    const result = Schema.safeParse({
      id: 'x',
      slug: 'x',
      question: 'Q?',
      language: 'cobol',
      level: 'junior',
      tags: [],
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    });
    expect(result.success).toBe(false);
  });

  it('rejects bad date format', () => {
    const result = Schema.safeParse({
      id: 'x',
      slug: 'x',
      question: 'Q?',
      language: 'typescript',
      level: 'junior',
      tags: [],
      createdAt: '2026/01/01',
      updatedAt: '2026-01-01',
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-kebab tag', () => {
    const result = Schema.safeParse({
      id: 'x',
      slug: 'x',
      question: 'Q?',
      language: 'typescript',
      level: 'junior',
      tags: ['Not Kebab'],
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid level', () => {
    const result = Schema.safeParse({
      id: 'x',
      slug: 'x',
      question: 'Q?',
      language: 'typescript',
      level: 'principal',
      tags: [],
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    });
    expect(result.success).toBe(false);
  });
});

describe('buildContent — happy path', () => {
  let outDir: string;

  beforeAll(async () => {
    outDir = await tmpOut();
    await buildContent({
      contentDir: path.join(FIXTURES, 'valid'),
      outDir,
      languages: LANGUAGES,
    });
  });

  it('writes manifest.json with correct shape and counts', async () => {
    const raw = await fs.readFile(path.join(outDir, 'manifest.json'), 'utf-8');
    const m = JSON.parse(raw);
    expect(m.totalCount).toBe(2);
    expect(typeof m.builtAt).toBe('string');
    expect(m.languages).toHaveLength(2);
    const ts = m.languages.find((l: { id: string }) => l.id === 'typescript');
    const js = m.languages.find((l: { id: string }) => l.id === 'javascript');
    expect(ts).toEqual({ id: 'typescript', displayName: 'TypeScript', count: 1 });
    expect(js).toEqual({ id: 'javascript', displayName: 'JavaScript', count: 1 });
  });

  it('writes per-language indexes', async () => {
    const ts = JSON.parse(
      await fs.readFile(path.join(outDir, 'indexes', 'typescript.json'), 'utf-8'),
    );
    const js = JSON.parse(
      await fs.readFile(path.join(outDir, 'indexes', 'javascript.json'), 'utf-8'),
    );
    expect(ts).toHaveLength(1);
    expect(ts[0].id).toBe('typescript-junior-sample');
    expect(js).toHaveLength(1);
    expect(js[0].id).toBe('javascript-junior-sample');
  });

  it('writes one post JSON per MD file with frontmatter + bodyHtml', async () => {
    const post = JSON.parse(
      await fs.readFile(
        path.join(outDir, 'posts', 'typescript-junior-sample.json'),
        'utf-8',
      ),
    );
    expect(post.frontmatter.id).toBe('typescript-junior-sample');
    expect(typeof post.bodyHtml).toBe('string');
    expect(post.bodyHtml).toContain('<p>');
  });

  it('renders code blocks via shiki with dual-theme CSS variables', async () => {
    const post = JSON.parse(
      await fs.readFile(
        path.join(outDir, 'posts', 'typescript-junior-sample.json'),
        'utf-8',
      ),
    );
    expect(post.bodyHtml).toContain('class="shiki');
    expect(post.bodyHtml).toMatch(/--shiki-light/);
    expect(post.bodyHtml).toMatch(/--shiki-dark/);
  });

  it('writes a MiniSearch index that loads and yields hits for question text', async () => {
    const raw = await fs.readFile(path.join(outDir, 'search-index.json'), 'utf-8');
    const search = MiniSearch.loadJSON<{ id: string }>(raw, {
      idField: 'id',
      fields: ['question', 'tags'],
      storeFields: ['id', 'slug', 'language', 'level', 'question'],
    });
    const hits = search.search('sample');
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.map((h) => h.id)).toContain('typescript-junior-sample');
  });
});

describe('buildContent — failure modes', () => {
  it('throws on missing required field', async () => {
    const outDir = await tmpOut();
    await expect(
      buildContent({
        contentDir: path.join(FIXTURES, 'invalid-missing-field'),
        outDir,
        languages: LANGUAGES,
      }),
    ).rejects.toThrow(/Invalid frontmatter/);
  });

  it('throws on unknown language', async () => {
    const outDir = await tmpOut();
    await expect(
      buildContent({
        contentDir: path.join(FIXTURES, 'invalid-unknown-language'),
        outDir,
        languages: LANGUAGES,
      }),
    ).rejects.toThrow(/language must be one of/);
  });
});

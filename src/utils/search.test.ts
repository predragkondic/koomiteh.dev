import { describe, it, expect } from 'vitest';
import MiniSearch from 'minisearch';
import type { Level, PostFrontmatter } from '@/types';
import {
  loadSearchIndex,
  mergeHitsWithIndex,
  runGlobalSearch,
  runSearch,
} from './search';

function p(
  id: string,
  language: string,
  question: string,
  tags: string[],
  level: Level = 'junior',
): PostFrontmatter {
  return {
    id,
    slug: id,
    question,
    language,
    level,
    tags,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  };
}

const POSTS: PostFrontmatter[] = [
  p('ts-closure', 'typescript', 'What is a closure in TypeScript?', ['scope']),
  p('ts-tag', 'typescript', 'Generics overview', ['closure']),
  p('ts-other', 'typescript', 'Variance rules', ['variance', 'types']),
  p('js-closure', 'javascript', 'Closures and scope', ['scope']),
];

function buildJson(): string {
  const ms = new MiniSearch<PostFrontmatter>({
    idField: 'id',
    fields: ['question', 'tags'],
    storeFields: ['id', 'slug', 'language', 'level', 'question'],
    extractField: (doc, field) => {
      const v = (doc as unknown as Record<string, unknown>)[field];
      if (Array.isArray(v)) return v.join(' ');
      return (v as string) ?? '';
    },
  });
  ms.addAll(POSTS);
  return JSON.stringify(ms.toJSON());
}

describe('loadSearchIndex + runSearch', () => {
  it('ranks question hits above tag-only hits (boost ×3 vs ×1.5)', () => {
    const idx = loadSearchIndex(buildJson());
    const hits = runSearch(idx, 'closure');
    const ids = hits.map((h) => h.id);
    expect(ids).toContain('ts-closure');
    expect(ids).toContain('js-closure');
    expect(ids).toContain('ts-tag');
    const questionRank = ids.indexOf('ts-closure');
    const tagOnlyRank = ids.indexOf('ts-tag');
    expect(questionRank).toBeLessThan(tagOnlyRank);
  });

  it('returns empty array on empty/whitespace query', () => {
    const idx = loadSearchIndex(buildJson());
    expect(runSearch(idx, '')).toEqual([]);
    expect(runSearch(idx, '   ')).toEqual([]);
  });

  it('returns no hits for nonsense query', () => {
    const idx = loadSearchIndex(buildJson());
    expect(runSearch(idx, 'zzzqqqxxx')).toEqual([]);
  });

  it('accepts already-parsed JSON object', () => {
    const idx = loadSearchIndex(JSON.parse(buildJson()));
    const hits = runSearch(idx, 'closure');
    expect(hits.length).toBeGreaterThan(0);
  });
});

describe('mergeHitsWithIndex', () => {
  it('keeps only IDs present in the language index, preserving hit order', () => {
    const idx = loadSearchIndex(buildJson());
    const hits = runSearch(idx, 'closure');
    const tsOnly = POSTS.filter((p) => p.language === 'typescript');
    const merged = mergeHitsWithIndex(hits, tsOnly);
    const ids = merged.items.map((i) => i.id);
    expect(ids).not.toContain('js-closure');
    expect(ids).toContain('ts-closure');
    expect(ids).toContain('ts-tag');
    expect(ids.indexOf('ts-closure')).toBeLessThan(ids.indexOf('ts-tag'));
  });

  it('returns score map keyed by id', () => {
    const idx = loadSearchIndex(buildJson());
    const hits = runSearch(idx, 'closure');
    const merged = mergeHitsWithIndex(hits, POSTS);
    expect(merged.scoreById.size).toBe(merged.items.length);
    for (const item of merged.items) {
      expect(merged.scoreById.get(item.id)).toBeTypeOf('number');
    }
  });

  it('returns empty when no posts match hit ids', () => {
    const idx = loadSearchIndex(buildJson());
    const hits = runSearch(idx, 'closure');
    const merged = mergeHitsWithIndex(hits, []);
    expect(merged.items).toEqual([]);
    expect(merged.scoreById.size).toBe(0);
  });
});

describe('runGlobalSearch', () => {
  it('returns hits enriched with stored fields across languages', () => {
    const idx = loadSearchIndex(buildJson());
    const hits = runGlobalSearch(idx, 'closure');
    expect(hits.length).toBeGreaterThan(0);
    const tsClosure = hits.find((h) => h.id === 'ts-closure');
    expect(tsClosure).toBeDefined();
    expect(tsClosure?.language).toBe('typescript');
    expect(tsClosure?.question).toMatch(/closure/i);
    const languages = new Set(hits.map((h) => h.language));
    expect(languages.has('typescript')).toBe(true);
    expect(languages.has('javascript')).toBe(true);
  });

  it('respects the limit parameter', () => {
    const idx = loadSearchIndex(buildJson());
    const hits = runGlobalSearch(idx, 'closure', 1);
    expect(hits.length).toBeLessThanOrEqual(1);
  });

  it('returns empty for blank query', () => {
    const idx = loadSearchIndex(buildJson());
    expect(runGlobalSearch(idx, '   ')).toEqual([]);
  });
});

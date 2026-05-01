import MiniSearch, { type SearchResult } from 'minisearch';
import type { PostFrontmatter, SearchIndexJson } from '@/types';

const MINI_OPTIONS = {
  idField: 'id',
  fields: ['question', 'tags'] as string[],
  storeFields: ['id', 'slug', 'language', 'level', 'question'] as string[],
  extractField: (doc: unknown, field: string) => {
    const value = (doc as Record<string, unknown>)[field];
    if (Array.isArray(value)) return value.join(' ');
    return (value as string) ?? '';
  },
};

const SEARCH_OPTIONS = {
  boost: { question: 3, tags: 1.5 },
  fuzzy: 0.2,
  prefix: true,
};

export function loadSearchIndex(json: SearchIndexJson): MiniSearch {
  const raw = typeof json === 'string' ? json : JSON.stringify(json);
  return MiniSearch.loadJSON(raw, MINI_OPTIONS);
}

export interface SearchHit {
  id: string;
  score: number;
}

export function runSearch(index: MiniSearch, q: string): SearchHit[] {
  const trimmed = q.trim();
  if (!trimmed) return [];
  const results = index.search(trimmed, SEARCH_OPTIONS) as SearchResult[];
  return results.map((r) => ({ id: String(r.id), score: r.score }));
}

export function mergeHitsWithIndex(
  hits: readonly SearchHit[],
  posts: readonly PostFrontmatter[],
): { items: PostFrontmatter[]; scoreById: Map<string, number> } {
  const byId = new Map<string, PostFrontmatter>();
  for (const p of posts) byId.set(p.id, p);
  const scoreById = new Map<string, number>();
  const items: PostFrontmatter[] = [];
  for (const h of hits) {
    const post = byId.get(h.id);
    if (!post) continue;
    items.push(post);
    scoreById.set(h.id, h.score);
  }
  return { items, scoreById };
}

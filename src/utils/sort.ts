import type { PostFrontmatter } from '@/types';

export const SORT_OPTIONS = ['newest', 'oldest', 'relevance'] as const;
export type Sort = (typeof SORT_OPTIONS)[number];
export const DEFAULT_SORT: Sort = 'newest';

export function isSort(v: string | null | undefined): v is Sort {
  return !!v && (SORT_OPTIONS as readonly string[]).includes(v);
}

export function sortPosts(
  items: readonly PostFrontmatter[],
  sort: Sort,
): PostFrontmatter[] {
  const out = items.slice();
  if (sort === 'oldest') {
    out.sort((a, b) => cmpDate(a.updatedAt, b.updatedAt) || cmpId(a.id, b.id));
    return out;
  }
  // newest + relevance (relevance is search-driven; w/o search behaves as newest)
  out.sort((a, b) => cmpDate(b.updatedAt, a.updatedAt) || cmpId(a.id, b.id));
  return out;
}

function cmpDate(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

function cmpId(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

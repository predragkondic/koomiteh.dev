import { describe, it, expect } from 'vitest';
import type { Level, PostFrontmatter } from '@/types';
import {
  applyFilterSortPage,
  readFilterState,
  writeFilterState,
  PAGE_SIZE,
} from './useFilteredPosts';

function p(
  id: string,
  level: Level,
  tags: string[],
  updatedAt: string,
): PostFrontmatter {
  return {
    id,
    slug: id,
    question: id,
    language: 'typescript',
    level,
    tags,
    createdAt: updatedAt,
    updatedAt,
  };
}

const items: PostFrontmatter[] = [
  p('a', 'junior', ['closures'], '2026-01-01'),
  p('b', 'senior', ['variance', 'types'], '2026-03-01'),
  p('c', 'junior', ['scope', 'closures'], '2026-02-01'),
  p('d', 'senior', ['types'], '2026-04-01'),
];

describe('applyFilterSortPage', () => {
  it('level=both returns all', () => {
    const r = applyFilterSortPage(items, {
      level: 'both',
      tags: [],
      sort: 'newest',
      page: 1,
    });
    expect(r.totalFiltered).toBe(4);
    expect(r.items.map((x) => x.id)).toEqual(['d', 'b', 'c', 'a']);
  });

  it('level=junior filters to junior posts', () => {
    const r = applyFilterSortPage(items, {
      level: 'junior',
      tags: [],
      sort: 'newest',
      page: 1,
    });
    expect(r.items.map((x) => x.id)).toEqual(['c', 'a']);
  });

  it('tags AND-match — post must have all selected tags', () => {
    const r = applyFilterSortPage(items, {
      level: 'both',
      tags: ['closures', 'scope'],
      sort: 'newest',
      page: 1,
    });
    expect(r.items.map((x) => x.id)).toEqual(['c']);
  });

  it('combines level + tags', () => {
    const r = applyFilterSortPage(items, {
      level: 'senior',
      tags: ['types'],
      sort: 'oldest',
      page: 1,
    });
    expect(r.items.map((x) => x.id)).toEqual(['b', 'd']);
  });

  it('paginates with given pageSize', () => {
    const r = applyFilterSortPage(
      items,
      { level: 'both', tags: [], sort: 'newest', page: 2 },
      2,
    );
    expect(r.page).toBe(2);
    expect(r.pageCount).toBe(2);
    expect(r.items.map((x) => x.id)).toEqual(['c', 'a']);
  });

  it('clamps page above pageCount', () => {
    const r = applyFilterSortPage(
      items,
      { level: 'both', tags: [], sort: 'newest', page: 99 },
      2,
    );
    expect(r.page).toBe(2);
    expect(r.items).toHaveLength(2);
  });

  it('returns pageCount=1 for empty result', () => {
    const r = applyFilterSortPage(items, {
      level: 'both',
      tags: ['nonexistent'],
      sort: 'newest',
      page: 1,
    });
    expect(r.totalFiltered).toBe(0);
    expect(r.pageCount).toBe(1);
    expect(r.items).toEqual([]);
  });

  it('default page size is 20', () => {
    expect(PAGE_SIZE).toBe(20);
  });
});

describe('readFilterState', () => {
  it('returns defaults for empty params', () => {
    expect(readFilterState(new URLSearchParams())).toEqual({
      level: 'both',
      tags: [],
      sort: 'newest',
      page: 1,
    });
  });

  it('parses level, multi-tag, sort, page', () => {
    const params = new URLSearchParams();
    params.set('level', 'senior');
    params.append('tag', 'types');
    params.append('tag', 'variance');
    params.set('sort', 'oldest');
    params.set('page', '3');
    expect(readFilterState(params)).toEqual({
      level: 'senior',
      tags: ['types', 'variance'],
      sort: 'oldest',
      page: 3,
    });
  });

  it('falls back for invalid level/sort/page', () => {
    const params = new URLSearchParams();
    params.set('level', 'wizard');
    params.set('sort', 'banana');
    params.set('page', 'foo');
    expect(readFilterState(params)).toEqual({
      level: 'both',
      tags: [],
      sort: 'newest',
      page: 1,
    });
  });

  it('treats page<1 as 1', () => {
    const params = new URLSearchParams();
    params.set('page', '-3');
    expect(readFilterState(params).page).toBe(1);
  });
});

describe('writeFilterState', () => {
  it('omits all defaults', () => {
    const params = writeFilterState({
      level: 'both',
      tags: [],
      sort: 'newest',
      page: 1,
    });
    expect(params.toString()).toBe('');
  });

  it('writes non-default values, multi-tags, and page', () => {
    const params = writeFilterState({
      level: 'senior',
      tags: ['types', 'variance'],
      sort: 'oldest',
      page: 3,
    });
    expect(params.toString()).toBe(
      'level=senior&tag=types&tag=variance&sort=oldest&page=3',
    );
  });

  it('round-trips through readFilterState', () => {
    const original = {
      level: 'junior' as const,
      tags: ['closures'],
      sort: 'oldest' as const,
      page: 2,
    };
    expect(readFilterState(writeFilterState(original))).toEqual(original);
  });
});

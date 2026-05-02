import { describe, it, expect } from 'vitest';
import type { Level, PostFrontmatter } from '@/types';
import {
  applyFilterSortPage,
  effectiveSort,
  readFilterState,
  writeFilterState,
  PAGE_SIZE,
  type FilterState,
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

const baseFilter: FilterState = {
  level: 'both',
  tags: [],
  sort: 'newest',
  page: 1,
  q: '',
};

describe('applyFilterSortPage', () => {
  it('level=both returns all', () => {
    const r = applyFilterSortPage(items, baseFilter);
    expect(r.totalFiltered).toBe(4);
    expect(r.items.map((x) => x.id)).toEqual(['d', 'b', 'c', 'a']);
  });

  it('level=junior filters to junior posts', () => {
    const r = applyFilterSortPage(items, { ...baseFilter, level: 'junior' });
    expect(r.items.map((x) => x.id)).toEqual(['c', 'a']);
  });

  it('tags AND-match — post must have all selected tags', () => {
    const r = applyFilterSortPage(items, {
      ...baseFilter,
      tags: ['closures', 'scope'],
    });
    expect(r.items.map((x) => x.id)).toEqual(['c']);
  });

  it('combines level + tags', () => {
    const r = applyFilterSortPage(items, {
      ...baseFilter,
      level: 'senior',
      tags: ['types'],
      sort: 'oldest',
    });
    expect(r.items.map((x) => x.id)).toEqual(['b', 'd']);
  });

  it('paginates with given pageSize', () => {
    const r = applyFilterSortPage(items, { ...baseFilter, page: 2 }, 2);
    expect(r.page).toBe(2);
    expect(r.pageCount).toBe(2);
    expect(r.items.map((x) => x.id)).toEqual(['c', 'a']);
  });

  it('clamps page above pageCount', () => {
    const r = applyFilterSortPage(items, { ...baseFilter, page: 99 }, 2);
    expect(r.page).toBe(2);
    expect(r.items).toHaveLength(2);
  });

  it('returns pageCount=1 for empty result', () => {
    const r = applyFilterSortPage(items, {
      ...baseFilter,
      tags: ['nonexistent'],
    });
    expect(r.totalFiltered).toBe(0);
    expect(r.pageCount).toBe(1);
    expect(r.items).toEqual([]);
  });

  it('default page size is 20', () => {
    expect(PAGE_SIZE).toBe(20);
  });

  it('relevance sort orders by score map desc', () => {
    const scoreById = new Map<string, number>([
      ['a', 0.5],
      ['b', 9.0],
      ['c', 2.0],
      ['d', 0.1],
    ]);
    const r = applyFilterSortPage(items, baseFilter, PAGE_SIZE, {
      effectiveSort: 'relevance',
      scoreById,
    });
    expect(r.items.map((x) => x.id)).toEqual(['b', 'c', 'a', 'd']);
  });

  it('relevance falls back to date order without score map', () => {
    const r = applyFilterSortPage(items, baseFilter, PAGE_SIZE, {
      effectiveSort: 'relevance',
    });
    expect(r.items.map((x) => x.id)).toEqual(['d', 'b', 'c', 'a']);
  });
});

describe('readFilterState', () => {
  it('returns defaults for empty params', () => {
    expect(readFilterState(new URLSearchParams())).toEqual({
      level: 'both',
      tags: [],
      sort: 'newest',
      page: 1,
      q: '',
    });
  });

  it('parses level, multi-tag, sort, page, q', () => {
    const params = new URLSearchParams();
    params.set('level', 'senior');
    params.append('tag', 'types');
    params.append('tag', 'variance');
    params.set('sort', 'oldest');
    params.set('page', '3');
    params.set('q', 'closure');
    expect(readFilterState(params)).toEqual({
      level: 'senior',
      tags: ['types', 'variance'],
      sort: 'oldest',
      page: 3,
      q: 'closure',
    });
  });

  it('trims whitespace around q', () => {
    const params = new URLSearchParams();
    params.set('q', '  hello  ');
    expect(readFilterState(params).q).toBe('hello');
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
      q: '',
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
      q: '',
    });
    expect(params.toString()).toBe('');
  });

  it('writes non-default values, multi-tags, page, and q', () => {
    const params = writeFilterState({
      level: 'senior',
      tags: ['types', 'variance'],
      sort: 'oldest',
      page: 3,
      q: 'closure',
    });
    expect(params.toString()).toBe(
      'level=senior&tag=types&tag=variance&q=closure&sort=oldest&page=3',
    );
  });

  it('round-trips through readFilterState', () => {
    const original: FilterState = {
      level: 'junior',
      tags: ['closures'],
      sort: 'oldest',
      page: 2,
      q: 'closure',
    };
    expect(readFilterState(writeFilterState(original))).toEqual(original);
  });
});

describe('effectiveSort', () => {
  it('uses URL sort param verbatim when valid', () => {
    expect(effectiveSort({ ...baseFilter, q: 'closure' }, 'oldest')).toBe(
      'oldest',
    );
    expect(effectiveSort({ ...baseFilter }, 'oldest')).toBe('oldest');
  });

  it('defaults to relevance when q set and no sort param', () => {
    expect(effectiveSort({ ...baseFilter, q: 'closure' }, null)).toBe(
      'relevance',
    );
  });

  it('defaults to newest when q empty and no sort param', () => {
    expect(effectiveSort({ ...baseFilter, q: '' }, null)).toBe('newest');
  });

  it('falls back to newest when q empty and invalid sort param', () => {
    expect(effectiveSort({ ...baseFilter, q: '' }, 'bogus')).toBe('newest');
  });
});

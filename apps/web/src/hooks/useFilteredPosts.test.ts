import { describe, it, expect } from 'vitest';
import {
  effectiveSort,
  PAGE_SIZE,
  readFilterState,
  writeFilterState,
  type FilterState,
} from './useFilteredPosts';

const baseFilter: FilterState = {
  level: 'both',
  tags: [],
  sort: 'newest',
  page: 1,
  q: '',
};

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

describe('PAGE_SIZE', () => {
  it('is 20', () => {
    expect(PAGE_SIZE).toBe(20);
  });
});

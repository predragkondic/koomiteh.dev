import { describe, it, expect } from 'vitest';
import type { PostFrontmatter } from '@/types';
import { sortPosts } from './sort';

function p(id: string, updatedAt: string): PostFrontmatter {
  return {
    id,
    slug: id,
    question: id,
    language: 'typescript',
    level: 'junior',
    tags: [],
    createdAt: updatedAt,
    updatedAt,
  };
}

describe('sortPosts', () => {
  const items = [
    p('a', '2026-01-01'),
    p('b', '2026-03-01'),
    p('c', '2026-02-01'),
  ];

  it('newest sorts by updatedAt desc', () => {
    expect(sortPosts(items, 'newest').map((x) => x.id)).toEqual([
      'b',
      'c',
      'a',
    ]);
  });

  it('oldest sorts by updatedAt asc', () => {
    expect(sortPosts(items, 'oldest').map((x) => x.id)).toEqual([
      'a',
      'c',
      'b',
    ]);
  });

  it('relevance falls back to newest w/o search context', () => {
    expect(sortPosts(items, 'relevance').map((x) => x.id)).toEqual([
      'b',
      'c',
      'a',
    ]);
  });

  it('breaks ties deterministically by id', () => {
    const tied = [p('z', '2026-01-01'), p('a', '2026-01-01')];
    expect(sortPosts(tied, 'newest').map((x) => x.id)).toEqual(['a', 'z']);
    expect(sortPosts(tied, 'oldest').map((x) => x.id)).toEqual(['a', 'z']);
  });

  it('does not mutate input', () => {
    const orig = items.slice();
    sortPosts(items, 'oldest');
    expect(items).toEqual(orig);
  });
});

import { describe, it, expect } from 'vitest';
import type { Level, PostFrontmatter } from '@/types';
import { relatedByTags } from './related';

function p(
  id: string,
  tags: string[],
  updatedAt = '2026-01-01',
  level: Level = 'junior',
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

describe('relatedByTags', () => {
  it('returns empty when current has no tags', () => {
    const idx = [p('a', ['x'])];
    expect(relatedByTags(idx, 'cur', [])).toEqual([]);
  });

  it('excludes the current post', () => {
    const idx = [p('cur', ['x']), p('a', ['x'])];
    const r = relatedByTags(idx, 'cur', ['x']);
    expect(r.map((x) => x.id)).toEqual(['a']);
  });

  it('drops candidates with zero shared tags', () => {
    const idx = [p('a', ['x']), p('b', ['y'])];
    const r = relatedByTags(idx, 'cur', ['x']);
    expect(r.map((x) => x.id)).toEqual(['a']);
  });

  it('orders by shared-tag count desc', () => {
    const idx = [
      p('low', ['x']),
      p('high', ['x', 'y', 'z']),
      p('mid', ['x', 'y']),
    ];
    const r = relatedByTags(idx, 'cur', ['x', 'y', 'z']);
    expect(r.map((x) => x.id)).toEqual(['high', 'mid', 'low']);
  });

  it('caps at limit', () => {
    const idx = Array.from({ length: 10 }, (_, i) => p(`p${i}`, ['x']));
    const r = relatedByTags(idx, 'cur', ['x'], 5);
    expect(r).toHaveLength(5);
  });

  it('breaks ties by updatedAt desc then id asc', () => {
    const idx = [
      p('older', ['x'], '2026-01-01'),
      p('newest', ['x'], '2026-03-01'),
      p('mid-b', ['x'], '2026-02-01'),
      p('mid-a', ['x'], '2026-02-01'),
    ];
    const r = relatedByTags(idx, 'cur', ['x']);
    expect(r.map((x) => x.id)).toEqual(['newest', 'mid-a', 'mid-b', 'older']);
  });
});

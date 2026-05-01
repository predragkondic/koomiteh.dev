import { useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useGetIndexQuery } from '@/api/interviewApi';
import type { Level, PostFrontmatter } from '@/types';
import { DEFAULT_SORT, isSort, type Sort, sortPosts } from '@/utils/sort';

export const PAGE_SIZE = 20;

export type LevelFilter = Level | 'both';

export interface FilterState {
  level: LevelFilter;
  tags: string[];
  sort: Sort;
  page: number;
}

export interface FilteredResult {
  items: PostFrontmatter[];
  totalFiltered: number;
  page: number;
  pageCount: number;
}

export function applyFilterSortPage(
  items: readonly PostFrontmatter[],
  state: FilterState,
  pageSize = PAGE_SIZE,
): FilteredResult {
  const { level, tags, sort, page: requestedPage } = state;
  const filtered = items.filter((p) => {
    if (level !== 'both' && p.level !== level) return false;
    if (tags.length && !tags.every((t) => p.tags.includes(t))) return false;
    return true;
  });
  const sorted = sortPosts(filtered, sort);
  const totalFiltered = sorted.length;
  const pageCount = Math.max(1, Math.ceil(totalFiltered / pageSize));
  const page = Math.min(Math.max(1, requestedPage), pageCount);
  const start = (page - 1) * pageSize;
  return {
    items: sorted.slice(start, start + pageSize),
    totalFiltered,
    page,
    pageCount,
  };
}

export function writeFilterState(state: FilterState): URLSearchParams {
  const params = new URLSearchParams();
  if (state.level !== 'both') params.set('level', state.level);
  for (const t of state.tags) params.append('tag', t);
  if (state.sort !== DEFAULT_SORT) params.set('sort', state.sort);
  if (state.page > 1) params.set('page', String(state.page));
  return params;
}

export function readFilterState(params: URLSearchParams): FilterState {
  const levelRaw = params.get('level');
  const level: LevelFilter =
    levelRaw === 'junior' || levelRaw === 'senior' ? levelRaw : 'both';
  const tags = params.getAll('tag');
  const sortRaw = params.get('sort');
  const sort: Sort = isSort(sortRaw) ? sortRaw : DEFAULT_SORT;
  const pageRaw = Number(params.get('page') ?? '1');
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1;
  return { level, tags, sort, page };
}

export interface UseFilteredPostsResult extends FilteredResult {
  isIndexLoading: boolean;
  indexError: unknown;
  language: string;
  filter: FilterState;
  tagOptions: string[];
}

export function useFilteredPosts(): UseFilteredPostsResult {
  const { language = '' } = useParams();
  const [searchParams] = useSearchParams();
  const { data, isLoading, error } = useGetIndexQuery(language);

  const filter = useMemo(() => readFilterState(searchParams), [searchParams]);

  const result = useMemo(
    () => applyFilterSortPage(data ?? [], filter),
    [data, filter],
  );

  const tagOptions = useMemo(() => {
    if (!data) return [];
    const set = new Set<string>();
    for (const p of data) for (const t of p.tags) set.add(t);
    return Array.from(set).sort();
  }, [data]);

  return {
    ...result,
    isIndexLoading: isLoading,
    indexError: error,
    language,
    filter,
    tagOptions,
  };
}

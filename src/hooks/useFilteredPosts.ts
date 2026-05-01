import { useMemo } from 'react';
import { skipToken } from '@reduxjs/toolkit/query';
import { useParams, useSearchParams } from 'react-router-dom';
import { useGetIndexQuery, useGetSearchIndexQuery } from '@/api/interviewApi';
import type { Level, PostFrontmatter } from '@/types';
import { DEFAULT_SORT, isSort, type Sort, sortPosts } from '@/utils/sort';
import {
  loadSearchIndex,
  mergeHitsWithIndex,
  runSearch,
  type SearchHit,
} from '@/utils/search';

export const PAGE_SIZE = 20;

export type LevelFilter = Level | 'both';

export interface FilterState {
  level: LevelFilter;
  tags: string[];
  sort: Sort;
  page: number;
  q: string;
}

export interface FilteredResult {
  items: PostFrontmatter[];
  totalFiltered: number;
  page: number;
  pageCount: number;
}

interface ApplyExtras {
  scoreById?: ReadonlyMap<string, number>;
  effectiveSort?: Sort;
}

export function applyFilterSortPage(
  items: readonly PostFrontmatter[],
  state: FilterState,
  pageSize = PAGE_SIZE,
  extras: ApplyExtras = {},
): FilteredResult {
  const { level, tags, page: requestedPage } = state;
  const filtered = items.filter((p) => {
    if (level !== 'both' && p.level !== level) return false;
    if (tags.length && !tags.every((t) => p.tags.includes(t))) return false;
    return true;
  });
  const sort = extras.effectiveSort ?? state.sort;
  const sorted =
    sort === 'relevance' && extras.scoreById
      ? rankByScore(filtered, extras.scoreById)
      : sortPosts(filtered, sort);
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

function rankByScore(
  items: readonly PostFrontmatter[],
  scoreById: ReadonlyMap<string, number>,
): PostFrontmatter[] {
  return items.slice().sort((a, b) => {
    const sa = scoreById.get(a.id) ?? 0;
    const sb = scoreById.get(b.id) ?? 0;
    if (sb !== sa) return sb - sa;
    if (a.id === b.id) return 0;
    return a.id < b.id ? -1 : 1;
  });
}

export function writeFilterState(state: FilterState): URLSearchParams {
  const params = new URLSearchParams();
  if (state.level !== 'both') params.set('level', state.level);
  for (const t of state.tags) params.append('tag', t);
  if (state.q) params.set('q', state.q);
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
  const q = (params.get('q') ?? '').trim();
  return { level, tags, sort, page, q };
}

export function effectiveSort(
  filter: FilterState,
  rawSortParam: string | null,
): Sort {
  if (isSort(rawSortParam)) return rawSortParam;
  return filter.q ? 'relevance' : DEFAULT_SORT;
}

export interface UseFilteredPostsResult extends FilteredResult {
  isIndexLoading: boolean;
  indexError: unknown;
  isSearchLoading: boolean;
  searchError: unknown;
  language: string;
  filter: FilterState;
  effectiveSort: Sort;
  tagOptions: string[];
}

export function useFilteredPosts(): UseFilteredPostsResult {
  const { language = '' } = useParams();
  const [searchParams] = useSearchParams();
  const { data, isLoading, error } = useGetIndexQuery(language);

  const filter = useMemo(() => readFilterState(searchParams), [searchParams]);
  const rawSort = searchParams.get('sort');
  const effSort = useMemo(() => effectiveSort(filter, rawSort), [filter, rawSort]);

  const {
    data: searchJson,
    isLoading: isSearchLoading,
    error: searchError,
  } = useGetSearchIndexQuery(filter.q ? undefined : skipToken);

  const hits: SearchHit[] = useMemo(() => {
    if (!filter.q || !searchJson) return [];
    try {
      const idx = loadSearchIndex(searchJson);
      return runSearch(idx, filter.q);
    } catch {
      return [];
    }
  }, [filter.q, searchJson]);

  const visiblePosts = useMemo(() => {
    if (!data) return [];
    if (!filter.q) return data;
    if (searchError) return data;
    if (!searchJson) return [];
    const merged = mergeHitsWithIndex(hits, data);
    return merged.items;
  }, [data, filter.q, searchJson, searchError, hits]);

  const scoreById = useMemo(() => {
    if (!filter.q || hits.length === 0) return undefined;
    const m = new Map<string, number>();
    for (const h of hits) m.set(h.id, h.score);
    return m;
  }, [filter.q, hits]);

  const result = useMemo(
    () =>
      applyFilterSortPage(visiblePosts, filter, PAGE_SIZE, {
        scoreById,
        effectiveSort: effSort,
      }),
    [visiblePosts, filter, scoreById, effSort],
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
    isSearchLoading: filter.q ? isSearchLoading : false,
    searchError: filter.q ? searchError : undefined,
    language,
    filter,
    effectiveSort: effSort,
    tagOptions,
  };
}

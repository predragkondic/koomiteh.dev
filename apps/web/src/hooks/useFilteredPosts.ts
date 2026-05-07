import { useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  useGetTagsQuery,
  useSearchPostsQuery,
} from '@/api/interviewApi';
import type { Level, PostFrontmatter } from '@/types';
import { DEFAULT_SORT, isSort, type Sort } from '@/utils/sort';

export const PAGE_SIZE = 20;

export type LevelFilter = Level | 'both';

export interface FilterState {
  level: LevelFilter;
  tags: string[];
  sort: Sort;
  page: number;
  q: string;
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

export interface UseFilteredPostsResult {
  items: PostFrontmatter[];
  totalFiltered: number;
  page: number;
  pageCount: number;
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

  const filter = useMemo(() => readFilterState(searchParams), [searchParams]);
  const rawSort = searchParams.get('sort');
  const effSort = useMemo(() => effectiveSort(filter, rawSort), [filter, rawSort]);

  const searchArgs = useMemo(
    () => ({
      language: language || undefined,
      level: filter.level === 'both' ? undefined : filter.level,
      tag: filter.tags.length > 0 ? filter.tags : undefined,
      q: filter.q || undefined,
      sort: effSort,
      page: filter.page,
      pageSize: PAGE_SIZE,
    }),
    [language, filter, effSort],
  );

  const { data, isLoading, error } = useSearchPostsQuery(searchArgs);

  const { data: tagsData } = useGetTagsQuery(
    { language: language || undefined },
    { skip: !language },
  );

  const items = data?.items ?? [];
  const totalFiltered = data?.total ?? 0;
  const pageCount = data?.pageCount ?? 1;
  const page = data?.page ?? filter.page;

  const tagOptions = tagsData?.tags ?? [];

  const hasQuery = Boolean(filter.q);

  return {
    items,
    totalFiltered,
    page,
    pageCount: Math.max(1, pageCount),
    isIndexLoading: !hasQuery && isLoading,
    indexError: !hasQuery ? error : undefined,
    isSearchLoading: hasQuery && isLoading,
    searchError: hasQuery ? error : undefined,
    language,
    filter,
    effectiveSort: effSort,
    tagOptions,
  };
}

import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type {
  Manifest,
  PostDetail,
  PostListResponse,
  TagsResponse,
} from '@koomiteh/shared';
import { config } from '@/config';
import type { Sort } from '@/utils/sort';

export interface SearchPostsArgs {
  language?: string;
  level?: 'junior' | 'senior';
  tag?: readonly string[];
  q?: string;
  sort?: Sort;
  page?: number;
  pageSize?: number;
}

function toQueryParams(args: SearchPostsArgs): URLSearchParams {
  const params = new URLSearchParams();
  if (args.language) params.set('language', args.language);
  if (args.level) params.set('level', args.level);
  if (args.tag) for (const t of args.tag) params.append('tag', t);
  if (args.q) params.set('q', args.q);
  if (args.sort) params.set('sort', args.sort);
  if (args.page) params.set('page', String(args.page));
  if (args.pageSize) params.set('pageSize', String(args.pageSize));
  return params;
}

export const interviewApi = createApi({
  reducerPath: 'interviewApi',
  baseQuery: fetchBaseQuery({
    baseUrl: config.apiBaseUrl || '/api',
    credentials: 'include',
  }),
  endpoints: (build) => ({
    getManifest: build.query<Manifest, void>({
      query: () => '/posts/manifest',
    }),
    searchPosts: build.query<PostListResponse, SearchPostsArgs>({
      query: (args) => {
        const qs = toQueryParams(args).toString();
        return qs ? `/posts?${qs}` : '/posts';
      },
    }),
    getPost: build.query<PostDetail, { language: string; slug: string }>({
      query: ({ language, slug }) =>
        `/posts/by-slug/${encodeURIComponent(language)}/${encodeURIComponent(slug)}`,
    }),
    getTags: build.query<TagsResponse, { language?: string }>({
      query: ({ language }) =>
        language
          ? `/posts/tags?language=${encodeURIComponent(language)}`
          : '/posts/tags',
    }),
  }),
});

export const {
  useGetManifestQuery,
  useSearchPostsQuery,
  useGetPostQuery,
  useGetTagsQuery,
} = interviewApi;

import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type {
  AdminPostCreate,
  AdminPostDetail,
  AdminPostListResponse,
  AdminPostUpdate,
  GeneratePostRequest,
  GeneratePostResponse,
  SuggestTopicsRequest,
  SuggestTopicsResponse,
} from '@koomiteh/shared';
import { config } from '@/config';
import { interviewApi } from './interviewApi';

const publicPostTags = [
  { type: 'Post' as const, id: 'LIST' },
  'PostList' as const,
  'Manifest' as const,
  'Tags' as const,
];

export interface AdminListArgs {
  language?: string;
  level?: 'junior' | 'senior';
  q?: string;
  includeDeleted?: boolean;
  page?: number;
  pageSize?: number;
}

function toQueryParams(args: AdminListArgs): URLSearchParams {
  const params = new URLSearchParams();
  if (args.language) params.set('language', args.language);
  if (args.level) params.set('level', args.level);
  if (args.q) params.set('q', args.q);
  if (args.includeDeleted) params.set('includeDeleted', 'true');
  if (args.page) params.set('page', String(args.page));
  if (args.pageSize) params.set('pageSize', String(args.pageSize));
  return params;
}

export type AdminUserRole = 'user' | 'admin' | 'superadmin';

export interface AdminUserListItem {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  githubLogin: string;
  role: AdminUserRole;
  createdAt: string;
  suspendedAt: string | null;
}

export interface AdminUserListResponse {
  items: AdminUserListItem[];
  page: number;
  pageSize: number;
  total: number;
  pageCount: number;
}

export const adminApi = createApi({
  reducerPath: 'adminApi',
  baseQuery: fetchBaseQuery({
    baseUrl: config.apiBaseUrl || '/api',
    credentials: 'include',
  }),
  tagTypes: ['AdminPosts', 'AdminPost', 'AdminUsers'],
  endpoints: (build) => ({
    listAdminPosts: build.query<AdminPostListResponse, AdminListArgs>({
      query: (args) => {
        const qs = toQueryParams(args).toString();
        return qs ? `/admin/posts?${qs}` : '/admin/posts';
      },
      providesTags: ['AdminPosts'],
    }),
    getAdminPost: build.query<AdminPostDetail, string>({
      query: (id) => `/admin/posts/${encodeURIComponent(id)}`,
      providesTags: (_res, _err, id) => [{ type: 'AdminPost', id }],
    }),
    createAdminPost: build.mutation<AdminPostDetail, AdminPostCreate>({
      query: (body) => ({
        url: '/admin/posts',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['AdminPosts'],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(interviewApi.util.invalidateTags(publicPostTags));
        } catch {
          // mutation failed; leave caches as-is
        }
      },
    }),
    updateAdminPost: build.mutation<
      AdminPostDetail,
      { id: string; patch: AdminPostUpdate }
    >({
      query: ({ id, patch }) => ({
        url: `/admin/posts/${encodeURIComponent(id)}`,
        method: 'PATCH',
        body: patch,
      }),
      invalidatesTags: (_res, _err, { id }) => [
        'AdminPosts',
        { type: 'AdminPost', id },
      ],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(interviewApi.util.invalidateTags(publicPostTags));
        } catch {
          // mutation failed; leave caches as-is
        }
      },
    }),
    deleteAdminPost: build.mutation<{ ok: true; deleted: boolean }, string>({
      query: (id) => ({
        url: `/admin/posts/${encodeURIComponent(id)}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_res, _err, id) => [
        'AdminPosts',
        { type: 'AdminPost', id },
      ],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(interviewApi.util.invalidateTags(publicPostTags));
        } catch {
          // mutation failed; leave caches as-is
        }
      },
    }),
    restoreAdminPost: build.mutation<{ ok: true; deleted: boolean }, string>({
      query: (id) => ({
        url: `/admin/posts/${encodeURIComponent(id)}/restore`,
        method: 'POST',
      }),
      invalidatesTags: (_res, _err, id) => [
        'AdminPosts',
        { type: 'AdminPost', id },
      ],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(interviewApi.util.invalidateTags(publicPostTags));
        } catch {
          // mutation failed; leave caches as-is
        }
      },
    }),
    generatePost: build.mutation<GeneratePostResponse, GeneratePostRequest>({
      query: (body) => ({
        url: '/admin/posts/generate',
        method: 'POST',
        body,
      }),
    }),
    suggestTopics: build.mutation<SuggestTopicsResponse, SuggestTopicsRequest>({
      query: (body) => ({
        url: '/admin/posts/suggest-topics',
        method: 'POST',
        body,
      }),
    }),
    listAdminUsers: build.query<AdminUserListResponse, void>({
      query: () => '/admin/users',
      providesTags: ['AdminUsers'],
    }),
    suspendAdminUser: build.mutation<
      { ok: true; suspended: boolean },
      string
    >({
      query: (id) => ({
        url: `/admin/users/${encodeURIComponent(id)}/suspend`,
        method: 'POST',
      }),
      invalidatesTags: ['AdminUsers'],
    }),
    unsuspendAdminUser: build.mutation<
      { ok: true; suspended: boolean },
      string
    >({
      query: (id) => ({
        url: `/admin/users/${encodeURIComponent(id)}/unsuspend`,
        method: 'POST',
      }),
      invalidatesTags: ['AdminUsers'],
    }),
  }),
});

export const {
  useListAdminPostsQuery,
  useGetAdminPostQuery,
  useCreateAdminPostMutation,
  useUpdateAdminPostMutation,
  useDeleteAdminPostMutation,
  useRestoreAdminPostMutation,
  useGeneratePostMutation,
  useSuggestTopicsMutation,
  useListAdminUsersQuery,
  useSuspendAdminUserMutation,
  useUnsuspendAdminUserMutation,
} = adminApi;

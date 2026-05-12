import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type {
  AdminPostCreate,
  AdminPostDetail,
  AdminPostListResponse,
  AdminPostUpdate,
} from '@koomiteh/shared';
import { config } from '@/config';

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

export const adminApi = createApi({
  reducerPath: 'adminApi',
  baseQuery: fetchBaseQuery({
    baseUrl: config.apiBaseUrl || '/api',
    credentials: 'include',
  }),
  tagTypes: ['AdminPosts', 'AdminPost'],
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
} = adminApi;

import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { CommentListResponse } from '@koomiteh/shared';
import { config } from '@/config';

export interface CommentListArgs {
  postId: string;
  page?: number;
  pageSize?: number;
}

export const commentsApi = createApi({
  reducerPath: 'commentsApi',
  baseQuery: fetchBaseQuery({
    baseUrl: config.apiBaseUrl || '/api',
    credentials: 'include',
  }),
  tagTypes: ['CommentList'],
  endpoints: (build) => ({
    getComments: build.query<CommentListResponse, CommentListArgs>({
      query: ({ postId, page, pageSize }) => {
        const qs = new URLSearchParams();
        if (page) qs.set('page', String(page));
        if (pageSize) qs.set('pageSize', String(pageSize));
        const s = qs.toString();
        const base = `/posts/${encodeURIComponent(postId)}/comments`;
        return s ? `${base}?${s}` : base;
      },
      providesTags: (_result, _err, { postId }) => [
        { type: 'CommentList' as const, id: postId },
      ],
    }),
  }),
});

export const { useGetCommentsQuery } = commentsApi;

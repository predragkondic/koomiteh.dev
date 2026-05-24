import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type {
  CommentCreateInput,
  CommentDetail,
  CommentListResponse,
} from '@koomiteh/shared';
import { config } from '@/config';

export interface CommentListArgs {
  postId: string;
  page?: number;
  pageSize?: number;
}

export interface CreateCommentArgs {
  postId: string;
  input: CommentCreateInput;
}

export interface UpdateCommentArgs {
  postId: string;
  commentId: string;
  input: CommentCreateInput;
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
    createComment: build.mutation<CommentDetail, CreateCommentArgs>({
      query: ({ postId, input }) => ({
        url: `/posts/${encodeURIComponent(postId)}/comments`,
        method: 'POST',
        body: input,
      }),
      invalidatesTags: (_result, _err, { postId }) => [
        { type: 'CommentList' as const, id: postId },
      ],
    }),
    updateComment: build.mutation<CommentDetail, UpdateCommentArgs>({
      query: ({ commentId, input }) => ({
        url: `/comments/${encodeURIComponent(commentId)}`,
        method: 'PATCH',
        body: input,
      }),
      invalidatesTags: (_result, _err, { postId }) => [
        { type: 'CommentList' as const, id: postId },
      ],
    }),
  }),
});

export const {
  useGetCommentsQuery,
  useCreateCommentMutation,
  useUpdateCommentMutation,
} = commentsApi;

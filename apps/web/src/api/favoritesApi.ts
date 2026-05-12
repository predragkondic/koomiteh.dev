import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { PostListResponse } from '@koomiteh/shared';
import { config } from '@/config';

export type FavoriteIdsResponse = { ids: string[] };
export type ToggleResponse = { ok: true; favorited: boolean };

export interface MyFavoritesArgs {
  page?: number;
  pageSize?: number;
}

export const favoritesApi = createApi({
  reducerPath: 'favoritesApi',
  baseQuery: fetchBaseQuery({
    baseUrl: config.apiBaseUrl || '/api',
    credentials: 'include',
  }),
  tagTypes: ['FavoriteIds', 'MyFavorites'],
  endpoints: (build) => ({
    getFavoriteIds: build.query<FavoriteIdsResponse, void>({
      query: () => '/me/favorites/ids',
      providesTags: ['FavoriteIds'],
    }),
    getMyFavorites: build.query<PostListResponse, MyFavoritesArgs>({
      query: ({ page, pageSize } = {}) => {
        const qs = new URLSearchParams();
        if (page) qs.set('page', String(page));
        if (pageSize) qs.set('pageSize', String(pageSize));
        const s = qs.toString();
        return s ? `/me/favorites?${s}` : '/me/favorites';
      },
      providesTags: ['MyFavorites'],
    }),
    addFavorite: build.mutation<ToggleResponse, string>({
      query: (postId) => ({
        url: `/favorites/${encodeURIComponent(postId)}`,
        method: 'POST',
      }),
      invalidatesTags: ['MyFavorites', 'FavoriteIds'],
      async onQueryStarted(postId, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          favoritesApi.util.updateQueryData(
            'getFavoriteIds',
            undefined,
            (draft) => {
              if (!draft.ids.includes(postId)) draft.ids.push(postId);
            },
          ),
        );
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
    }),
    removeFavorite: build.mutation<ToggleResponse, string>({
      query: (postId) => ({
        url: `/favorites/${encodeURIComponent(postId)}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['MyFavorites', 'FavoriteIds'],
      async onQueryStarted(postId, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          favoritesApi.util.updateQueryData(
            'getFavoriteIds',
            undefined,
            (draft) => {
              draft.ids = draft.ids.filter((id) => id !== postId);
            },
          ),
        );
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
    }),
  }),
});

export const {
  useGetFavoriteIdsQuery,
  useGetMyFavoritesQuery,
  useAddFavoriteMutation,
  useRemoveFavoriteMutation,
} = favoritesApi;

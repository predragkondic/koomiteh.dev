import {
  createApi,
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from '@reduxjs/toolkit/query/react';
import { config } from '@/config';

export type Me = {
  id: string;
  githubLogin: string;
  displayName: string;
  avatarUrl: string | null;
  role: 'user' | 'admin' | 'superadmin';
};

export type MeResponse = { user: Me | null };

const rawBaseQuery = fetchBaseQuery({
  baseUrl: config.apiBaseUrl || '/api',
  credentials: 'include',
});

const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  const result = await rawBaseQuery(args, api, extraOptions);
  if (result.error?.status === 401) {
    api.dispatch(authApi.util.invalidateTags(['Me']));
  }
  return result;
};

export const authApi = createApi({
  reducerPath: 'authApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Me'],
  endpoints: (build) => ({
    getMe: build.query<MeResponse, void>({
      query: () => '/auth/me',
      providesTags: ['Me'],
    }),
    logout: build.mutation<{ ok: true }, void>({
      query: () => ({ url: '/auth/logout', method: 'POST' }),
      invalidatesTags: ['Me'],
    }),
  }),
});

export const { useGetMeQuery, useLogoutMutation } = authApi;

export function loginUrl(): string {
  return config.apiBaseUrl ? `${config.apiBaseUrl}/auth/github` : '/api/auth/github';
}

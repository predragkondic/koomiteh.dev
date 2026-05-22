import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { config } from '@/config';

export type PublicUserProfile = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  githubLogin: string | null;
  createdAt: string;
};

export const usersApi = createApi({
  reducerPath: 'usersApi',
  baseQuery: fetchBaseQuery({
    baseUrl: config.apiBaseUrl || '/api',
    credentials: 'include',
  }),
  tagTypes: ['UserProfile'],
  endpoints: (build) => ({
    getUserProfile: build.query<PublicUserProfile, string>({
      query: (id) => `/users/${encodeURIComponent(id)}`,
      providesTags: (_result, _err, id) => [{ type: 'UserProfile', id }],
    }),
  }),
});

export const { useGetUserProfileQuery } = usersApi;

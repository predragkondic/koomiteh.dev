import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';
import type { Manifest, Post, PostFrontmatter } from '@/types';

async function fetchJson<T>(url: string): Promise<
  | { data: T }
  | { error: { status: number; message: string } }
> {
  let res: Response;
  try {
    res = await fetch(url);
  } catch (e) {
    return {
      error: { status: 0, message: e instanceof Error ? e.message : 'Network error' },
    };
  }
  if (!res.ok) {
    return { error: { status: res.status, message: res.statusText } };
  }
  const contentType = res.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    return { error: { status: 404, message: 'Not JSON' } };
  }
  const data = (await res.json()) as T;
  return { data };
}

export const interviewApi = createApi({
  reducerPath: 'interviewApi',
  baseQuery: fakeBaseQuery(),
  endpoints: (build) => ({
    getManifest: build.query<Manifest, void>({
      async queryFn() {
        return fetchJson<Manifest>('/content/manifest.json');
      },
    }),
    getIndex: build.query<PostFrontmatter[], string>({
      async queryFn(language) {
        const result = await fetchJson<PostFrontmatter[]>(
          `/content/indexes/${language}.json`,
        );
        if ('error' in result && result.error.status === 404) {
          return { error: { status: 404, message: 'Unknown language' } };
        }
        return result;
      },
    }),
    getPost: build.query<Post, { language: string; slug: string }>({
      async queryFn({ language, slug }) {
        const indexResult = await fetchJson<PostFrontmatter[]>(
          `/content/indexes/${language}.json`,
        );
        if ('error' in indexResult) {
          if (indexResult.error.status === 404) {
            return { error: { status: 404, message: 'Unknown language' } };
          }
          return indexResult;
        }
        const entry = indexResult.data.find((p) => p.slug === slug);
        if (!entry) {
          return { error: { status: 404, message: 'Unknown slug' } };
        }
        return fetchJson<Post>(`/content/posts/${entry.id}.json`);
      },
    }),
  }),
});

export const { useGetManifestQuery, useGetIndexQuery, useGetPostQuery } =
  interviewApi;

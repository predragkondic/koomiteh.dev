import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';
import type { Post } from '@/types';

const STUB_POST: Post = {
  frontmatter: {
    id: 'typescript-junior-foo',
    slug: 'foo',
    question: 'Walking skeleton stub: does the wiring work?',
    language: 'typescript',
    level: 'junior',
    tags: ['skeleton', 'stub'],
    createdAt: '2026-04-30',
    updatedAt: '2026-04-30',
  },
  bodyHtml:
    '<p>This stub post is served by the RTK Query <code>getPost</code> endpoint to prove that the route, the store, and the data layer are wired correctly. Real content arrives in slice 2.</p>',
};

export const interviewApi = createApi({
  reducerPath: 'interviewApi',
  baseQuery: fakeBaseQuery(),
  endpoints: (build) => ({
    getPost: build.query<Post, { language: string; slug: string }>({
      async queryFn({ language, slug }) {
        if (language === 'typescript' && slug === 'foo') {
          return { data: STUB_POST };
        }
        return { error: { status: 404, message: 'Not found' } };
      },
    }),
  }),
});

export const { useGetPostQuery } = interviewApi;

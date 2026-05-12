import { z } from 'zod';

const TAG_RE = /^[a-z0-9-]+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const ISO_RE =
  /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{1,6})?(Z|[+-]\d{2}:\d{2}))?$/;

export const postLevelSchema = z.enum(['junior', 'senior']);
export type PostLevel = z.infer<typeof postLevelSchema>;

export const postFrontmatterSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  question: z.string().min(1),
  language: z.string().min(1),
  level: postLevelSchema,
  tags: z.array(z.string()),
  createdAt: z.string().regex(ISO_RE),
  updatedAt: z.string().regex(ISO_RE),
});
export type PostFrontmatter = z.infer<typeof postFrontmatterSchema>;

export const seedFrontmatterSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  question: z.string().min(1),
  language: z.string().min(1),
  level: postLevelSchema,
  tags: z.array(z.string().regex(TAG_RE, 'tag must match /^[a-z0-9-]+$/')).default([]),
  createdAt: z.string().regex(DATE_RE, 'createdAt must be YYYY-MM-DD'),
  updatedAt: z.string().regex(DATE_RE, 'updatedAt must be YYYY-MM-DD'),
});
export type SeedFrontmatter = z.infer<typeof seedFrontmatterSchema>;

export const postDetailSchema = z.object({
  frontmatter: postFrontmatterSchema,
  bodyMd: z.string(),
});
export type PostDetail = z.infer<typeof postDetailSchema>;

export const manifestLanguageSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  count: z.number().int().nonnegative(),
});
export type ManifestLanguage = z.infer<typeof manifestLanguageSchema>;

export const manifestSchema = z.object({
  languages: z.array(manifestLanguageSchema),
  totalCount: z.number().int().nonnegative(),
  builtAt: z.string(),
});
export type Manifest = z.infer<typeof manifestSchema>;

export const postListResponseSchema = z.object({
  items: z.array(postFrontmatterSchema),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  pageCount: z.number().int().nonnegative(),
});
export type PostListResponse = z.infer<typeof postListResponseSchema>;

export const tagsResponseSchema = z.object({
  tags: z.array(z.string()),
});
export type TagsResponse = z.infer<typeof tagsResponseSchema>;

export const favoritesListResponseSchema = postListResponseSchema;
export type FavoritesListResponse = z.infer<typeof favoritesListResponseSchema>;

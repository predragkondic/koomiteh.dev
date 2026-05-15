import { z } from 'zod';
import { postLevelSchema } from './frontmatter.js';

export const generatePostRequestSchema = z.object({
  topic: z.string().min(1).max(500),
  language: z.string().min(1),
  level: postLevelSchema,
});
export type GeneratePostRequest = z.infer<typeof generatePostRequestSchema>;

export const suggestTopicsRequestSchema = z.object({
  language: z.string().min(1),
  level: postLevelSchema,
});
export type SuggestTopicsRequest = z.infer<typeof suggestTopicsRequestSchema>;

export const suggestTopicsResponseSchema = z.object({
  topics: z.array(z.string().min(1)).min(3).max(5),
});
export type SuggestTopicsResponse = z.infer<typeof suggestTopicsResponseSchema>;

const TAG_RE = /^[a-z0-9-]+$/;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const generatePostResponseSchema = z.object({
  question: z.string().min(1).max(500),
  slug: z.string().min(1).max(120).regex(SLUG_RE),
  tags: z.array(z.string().regex(TAG_RE)).max(5),
  bodyMd: z.string().min(1),
  language: z.string().min(1),
  level: postLevelSchema,
});
export type GeneratePostResponse = z.infer<typeof generatePostResponseSchema>;

import { z } from 'zod';

export const commentAuthorSchema = z.object({
  id: z.string().uuid(),
  displayName: z.string(),
  avatarUrl: z.string().nullable(),
});
export type CommentAuthor = z.infer<typeof commentAuthorSchema>;

export const commentItemSchema = z.object({
  id: z.string().uuid(),
  bodyHtmlSafe: z.string(),
  bodyMd: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
  author: commentAuthorSchema.nullable(),
});
export type CommentItem = z.infer<typeof commentItemSchema>;

export const commentListResponseSchema = z.object({
  items: z.array(commentItemSchema),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  pageCount: z.number().int().nonnegative(),
});
export type CommentListResponse = z.infer<typeof commentListResponseSchema>;

export const commentCreateInputSchema = z.object({
  bodyMd: z
    .string()
    .min(1)
    .max(10000)
    .refine((s) => s.trim().length > 0, 'bodyMd must not be blank'),
});
export type CommentCreateInput = z.infer<typeof commentCreateInputSchema>;

export const commentDetailSchema = z.object({
  comment: z.object({
    id: z.string().uuid(),
    bodyHtmlSafe: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
  }),
});
export type CommentDetail = z.infer<typeof commentDetailSchema>;

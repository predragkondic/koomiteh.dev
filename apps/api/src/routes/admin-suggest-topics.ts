import { Hono } from 'hono';
import { suggestTopicsRequestSchema, isLanguageId } from '@koomiteh/shared';
import { requireAdmin } from '../middleware/auth-context.js';
import { suggestTopics } from '../services/topic-suggester.js';

export const adminSuggestTopicsRoute = new Hono();

adminSuggestTopicsRoute.use('*', requireAdmin);

adminSuggestTopicsRoute.post('/', async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'invalid_json' }, 400);
  }

  const parsed = suggestTopicsRequestSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'invalid_body', issues: parsed.error.issues }, 400);
  }
  const data = parsed.data;
  if (!isLanguageId(data.language)) {
    return c.json({ error: 'invalid_language' }, 400);
  }

  const apiKey = process.env.GEMINI_API_KEY ?? '';
  if (!apiKey) {
    return c.json({ error: 'generate_unavailable' }, 503);
  }

  const result = await suggestTopics(data, {
    apiKey,
    model: process.env.GEMINI_MODEL ?? 'gemini-2.5-flash',
  });

  switch (result.kind) {
    case 'success':
      return c.json(result.data, 200);
    case 'gemini_invalid_output':
      return c.json({ error: 'gemini_invalid_output' }, 502);
    case 'gemini_failed':
      return c.json({ error: 'gemini_failed' }, 502);
  }
});

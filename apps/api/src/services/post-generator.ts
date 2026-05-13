import { GoogleGenAI, Type } from '@google/genai';
import {
  generatePostResponseSchema,
  type GeneratePostRequest,
  type GeneratePostResponse,
} from '@koomiteh/shared';
import { SKILL_ASK } from '../skills/skill-ask.js';

const GENERATE_TIMEOUT_MS = 30_000;

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  required: ['question', 'tags', 'bodyMd'],
  properties: {
    question: { type: Type.STRING },
    tags: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      maxItems: 5,
    },
    bodyMd: { type: Type.STRING },
  },
};

export type PostGeneratorResult =
  | { kind: 'success'; data: GeneratePostResponse }
  | { kind: 'gemini_failed' }
  | { kind: 'gemini_invalid_output' };

interface ServiceConfig {
  apiKey: string;
  model: string;
}

function normalizeTag(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function slugifyQuestion(question: string): string {
  return question
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120);
}

export async function generatePostDraft(
  input: GeneratePostRequest,
  config: ServiceConfig,
): Promise<PostGeneratorResult> {
  const ai = new GoogleGenAI({ apiKey: config.apiKey });
  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    GENERATE_TIMEOUT_MS,
  );

  let raw: string | undefined;
  try {
    const response = await ai.models.generateContent({
      model: config.model,
      contents: `Topic: ${input.topic}\nLanguage: ${input.language}\nLevel: ${input.level}`,
      config: {
        systemInstruction: SKILL_ASK,
        responseMimeType: 'application/json',
        responseSchema: RESPONSE_SCHEMA,
        abortSignal: controller.signal,
      },
    });
    raw = response.text;
  } catch {
    clearTimeout(timeoutId);
    return { kind: 'gemini_failed' };
  }
  clearTimeout(timeoutId);

  if (!raw) return { kind: 'gemini_invalid_output' };

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch {
    return { kind: 'gemini_invalid_output' };
  }

  if (
    !parsedJson ||
    typeof parsedJson !== 'object' ||
    Array.isArray(parsedJson)
  ) {
    return { kind: 'gemini_invalid_output' };
  }
  const obj = parsedJson as Record<string, unknown>;
  const question = typeof obj.question === 'string' ? obj.question : '';
  const rawTags = Array.isArray(obj.tags) ? obj.tags : [];
  const bodyMd = typeof obj.bodyMd === 'string' ? obj.bodyMd : '';

  const draft = {
    question,
    slug: slugifyQuestion(question),
    tags: rawTags
      .filter((t): t is string => typeof t === 'string')
      .map(normalizeTag)
      .filter((t) => t.length > 0),
    bodyMd,
    language: input.language,
    level: input.level,
  };

  const validated = generatePostResponseSchema.safeParse(draft);
  if (!validated.success) {
    return { kind: 'gemini_invalid_output' };
  }
  return { kind: 'success', data: validated.data };
}

import { GoogleGenAI, Type } from '@google/genai';
import {
  suggestTopicsResponseSchema,
  type SuggestTopicsRequest,
  type SuggestTopicsResponse,
} from '@koomiteh/shared';
import { SKILL_SUGGEST_TOPIC } from '../skills/skill-suggest-topic.js';

const SUGGEST_TIMEOUT_MS = 30_000;

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  required: ['topics'],
  properties: {
    topics: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      minItems: 3,
      maxItems: 5,
    },
  },
};

export type TopicSuggesterResult =
  | { kind: 'success'; data: SuggestTopicsResponse }
  | { kind: 'gemini_failed' }
  | { kind: 'gemini_invalid_output' };

interface ServiceConfig {
  apiKey: string;
  model: string;
}

export async function suggestTopics(
  input: SuggestTopicsRequest,
  config: ServiceConfig,
): Promise<TopicSuggesterResult> {
  const ai = new GoogleGenAI({ apiKey: config.apiKey });
  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    SUGGEST_TIMEOUT_MS,
  );

  let raw: string | undefined;
  try {
    const response = await ai.models.generateContent({
      model: config.model,
      contents: `Language: ${input.language}\nLevel: ${input.level}`,
      config: {
        systemInstruction: SKILL_SUGGEST_TOPIC,
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
  const rawTopics = Array.isArray(obj.topics) ? obj.topics : [];

  const normalized: string[] = [];
  const seen = new Set<string>();
  for (const t of rawTopics) {
    if (typeof t !== 'string') continue;
    const trimmed = t.trim();
    if (trimmed.length === 0) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    normalized.push(trimmed);
    if (normalized.length >= 5) break;
  }

  if (normalized.length < 3) {
    return { kind: 'gemini_invalid_output' };
  }

  const validated = suggestTopicsResponseSchema.safeParse({ topics: normalized });
  if (!validated.success) {
    return { kind: 'gemini_invalid_output' };
  }
  return { kind: 'success', data: validated.data };
}

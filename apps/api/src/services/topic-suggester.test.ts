import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GoogleGenAI } from '@google/genai';
import { suggestTopics } from './topic-suggester.js';

vi.mock('@google/genai');

const generateContentMock = vi.fn();

beforeEach(() => {
  generateContentMock.mockReset();
  vi.mocked(GoogleGenAI).mockImplementation(function (
    this: { models: { generateContent: typeof generateContentMock } },
  ) {
    this.models = { generateContent: generateContentMock };
  } as unknown as typeof GoogleGenAI);
});

const config = { apiKey: 'test-key', model: 'gemini-test' };

describe('suggestTopics', () => {
  it('trims, dedupes case-insensitively, and caps at 5', async () => {
    generateContentMock.mockResolvedValueOnce({
      text: JSON.stringify({
        topics: [
          '  event loop  ',
          'Event Loop',
          'closures',
          'Closures',
          'prototype chain',
          'async iteration',
          'structural typing',
          'generics',
          '',
        ],
      }),
    });

    const result = await suggestTopics(
      { language: 'typescript', level: 'senior' },
      config,
    );

    expect(result.kind).toBe('success');
    if (result.kind === 'success') {
      expect(result.data.topics).toEqual([
        'event loop',
        'closures',
        'prototype chain',
        'async iteration',
        'structural typing',
      ]);
    }
  });

  it('returns gemini_invalid_output when fewer than 3 valid topics remain after dedup', async () => {
    generateContentMock.mockResolvedValueOnce({
      text: JSON.stringify({
        topics: ['Foo', 'foo', '   ', '', 'bar'],
      }),
    });

    const result = await suggestTopics(
      { language: 'typescript', level: 'junior' },
      config,
    );

    expect(result.kind).toBe('gemini_invalid_output');
  });

  it('returns gemini_failed when SDK throws', async () => {
    generateContentMock.mockRejectedValueOnce(new Error('upstream'));

    const result = await suggestTopics(
      { language: 'typescript', level: 'junior' },
      config,
    );

    expect(result.kind).toBe('gemini_failed');
  });

  it('returns gemini_invalid_output when response is malformed JSON', async () => {
    generateContentMock.mockResolvedValueOnce({
      text: 'not json',
    });

    const result = await suggestTopics(
      { language: 'typescript', level: 'junior' },
      config,
    );

    expect(result.kind).toBe('gemini_invalid_output');
  });

  it('returns 5 normalized topics on happy path', async () => {
    generateContentMock.mockResolvedValueOnce({
      text: JSON.stringify({
        topics: [
          'event loop',
          'closures',
          'prototype chain',
          'async iteration',
          'structural typing',
        ],
      }),
    });

    const result = await suggestTopics(
      { language: 'typescript', level: 'junior' },
      config,
    );

    expect(result.kind).toBe('success');
    if (result.kind === 'success') {
      expect(result.data.topics).toEqual([
        'event loop',
        'closures',
        'prototype chain',
        'async iteration',
        'structural typing',
      ]);
    }
  });
});

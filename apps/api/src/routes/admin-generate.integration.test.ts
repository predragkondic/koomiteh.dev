import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sql } from 'drizzle-orm';
import { posts, users } from '@koomiteh/shared';
import { GoogleGenAI } from '@google/genai';
import { db, pool } from '../db/client.js';
import { createApp } from '../app.js';
import { seedFromDir } from '../seed.js';
import {
  SESSION_COOKIE_NAME,
  createSession,
  generateSessionToken,
} from '../auth/sessions.js';

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

const here = path.dirname(fileURLToPath(import.meta.url));
const fixtureDir = path.resolve(here, '../test-fixtures/content');

const app = createApp();
const ORIGIN = 'http://localhost:5173';

type CallOptions = {
  cookie?: string;
  body?: unknown;
};

async function postGenerate<T = unknown>(
  opts: CallOptions = {},
): Promise<{ status: number; body: T }> {
  const headers: Record<string, string> = {
    Origin: ORIGIN,
    'Content-Type': 'application/json',
  };
  if (opts.cookie) headers.Cookie = opts.cookie;
  const res = await app.request('http://localhost/admin/posts/generate', {
    method: 'POST',
    headers,
    body: JSON.stringify(opts.body ?? {}),
  });
  const text = await res.text();
  const body = text ? (JSON.parse(text) as T) : ({} as T);
  return { status: res.status, body };
}

async function createTestUser(
  githubLogin: string,
  role: 'user' | 'admin' = 'user',
): Promise<string> {
  const rows = await db
    .insert(users)
    .values({
      githubId: Math.floor(Math.random() * 1_000_000_000),
      githubLogin,
      displayName: githubLogin,
      avatarUrl: null,
      role,
    })
    .returning({ id: users.id });
  return rows[0]!.id;
}

async function loginAs(userId: string): Promise<string> {
  const token = generateSessionToken();
  await createSession(token, userId);
  return `${SESSION_COOKIE_NAME}=${token}`;
}

beforeAll(async () => {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL must be set for integration tests');
  }
});

beforeEach(async () => {
  await db.execute(
    sql`TRUNCATE TABLE ${posts}, ${users} RESTART IDENTITY CASCADE`,
  );
  await seedFromDir(fixtureDir);
});

afterAll(async () => {
  await pool.end();
});

async function adminCookie(): Promise<string> {
  const id = await createTestUser(`admin-${Math.random()}`, 'admin');
  return loginAs(id);
}

async function userCookie(): Promise<string> {
  const id = await createTestUser(`user-${Math.random()}`, 'user');
  return loginAs(id);
}

describe('POST /admin/posts/generate (auth gate)', () => {
  it('401 without session', async () => {
    const { status, body } = await postGenerate<{ error: string }>();
    expect(status).toBe(401);
    expect(body.error).toBe('unauthorized');
  });

  it('403 for non-admin user', async () => {
    const cookie = await userCookie();
    const { status, body } = await postGenerate<{ error: string }>({
      cookie,
      body: { topic: 'closures', language: 'typescript', level: 'junior' },
    });
    expect(status).toBe(403);
    expect(body.error).toBe('forbidden');
  });
});

describe('POST /admin/posts/generate (body validation)', () => {
  it('400 invalid_body when fields are missing', async () => {
    const cookie = await adminCookie();
    const { status, body } = await postGenerate<{ error: string }>({
      cookie,
      body: { topic: 'closures' },
    });
    expect(status).toBe(400);
    expect(body.error).toBe('invalid_body');
  });

  it('400 invalid_language when language is not in LANGUAGES', async () => {
    const cookie = await adminCookie();
    const { status, body } = await postGenerate<{ error: string }>({
      cookie,
      body: { topic: 'borrow checker', language: 'rust', level: 'junior' },
    });
    expect(status).toBe(400);
    expect(body.error).toBe('invalid_language');
  });
});

describe('POST /admin/posts/generate (env gate)', () => {
  it('503 generate_unavailable when GEMINI_API_KEY is missing', async () => {
    const prev = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    try {
      const cookie = await adminCookie();
      const { status, body } = await postGenerate<{ error: string }>({
        cookie,
        body: { topic: 'closures', language: 'typescript', level: 'junior' },
      });
      expect(status).toBe(503);
      expect(body.error).toBe('generate_unavailable');
    } finally {
      if (prev !== undefined) process.env.GEMINI_API_KEY = prev;
    }
  });
});

describe('POST /admin/posts/generate (happy path)', () => {
  const ORIGINAL_KEY = process.env.GEMINI_API_KEY;

  beforeEach(() => {
    process.env.GEMINI_API_KEY = 'test-key';
  });

  afterAll(() => {
    if (ORIGINAL_KEY === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = ORIGINAL_KEY;
  });

  it('200 returns a valid draft for admin', async () => {
    generateContentMock.mockResolvedValueOnce({
      text: JSON.stringify({
        question: 'What is a closure in TypeScript?',
        tags: ['closures', 'functions'],
        bodyMd:
          '## Closure\n\nA closure is a function bundled with its surrounding lexical scope.',
      }),
    });
    const cookie = await adminCookie();
    const { status, body } = await postGenerate<{
      question: string;
      slug: string;
      tags: string[];
      bodyMd: string;
      language: string;
      level: string;
    }>({
      cookie,
      body: {
        topic: 'closures in TS',
        language: 'typescript',
        level: 'junior',
      },
    });
    expect(status).toBe(200);
    expect(body.question).toBe('What is a closure in TypeScript?');
    expect(body.slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    expect(body.tags).toEqual(['closures', 'functions']);
    expect(body.bodyMd).toContain('Closure');
    expect(body.language).toBe('typescript');
    expect(body.level).toBe('junior');
  });

  it('normalises tags to lowercase kebab-case (strips non-alphanumeric)', async () => {
    generateContentMock.mockResolvedValueOnce({
      text: JSON.stringify({
        question: 'Anything?',
        tags: ['JavaScript Closures', 'FP / Functional', '  Async/Await  '],
        bodyMd: 'short body',
      }),
    });
    const cookie = await adminCookie();
    const { status, body } = await postGenerate<{ tags: string[] }>({
      cookie,
      body: { topic: 'misc', language: 'typescript', level: 'junior' },
    });
    expect(status).toBe(200);
    expect(body.tags).toEqual([
      'javascript-closures',
      'fp-functional',
      'asyncawait',
    ]);
    body.tags.forEach((tag) => expect(tag).toMatch(/^[a-z0-9-]+$/));
  });

  it('derives slug deterministically from question (kebab-case)', async () => {
    generateContentMock.mockResolvedValueOnce({
      text: JSON.stringify({
        question: 'How does the JavaScript Event Loop work?',
        tags: ['event-loop'],
        bodyMd: 'A short answer about the event loop.',
      }),
    });
    const cookie = await adminCookie();
    const { status, body } = await postGenerate<{ slug: string }>({
      cookie,
      body: {
        topic: 'event loop',
        language: 'javascript',
        level: 'junior',
      },
    });
    expect(status).toBe(200);
    expect(body.slug).toBe('how-does-the-javascript-event-loop-work');
  });
});

describe('POST /admin/posts/generate (failure paths)', () => {
  const ORIGINAL_KEY = process.env.GEMINI_API_KEY;

  beforeEach(() => {
    process.env.GEMINI_API_KEY = 'test-key';
  });

  afterAll(() => {
    if (ORIGINAL_KEY === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = ORIGINAL_KEY;
  });

  it('502 gemini_failed when SDK throws', async () => {
    generateContentMock.mockRejectedValueOnce(
      new Error('upstream rate limit'),
    );
    const cookie = await adminCookie();
    const { status, body } = await postGenerate<{ error: string }>({
      cookie,
      body: { topic: 'closures', language: 'typescript', level: 'junior' },
    });
    expect(status).toBe(502);
    expect(body.error).toBe('gemini_failed');
  });

  it('502 gemini_invalid_output when SDK returns malformed JSON', async () => {
    generateContentMock.mockResolvedValueOnce({
      text: 'not actually json at all <html>',
    });
    const cookie = await adminCookie();
    const { status, body } = await postGenerate<{ error: string }>({
      cookie,
      body: { topic: 'closures', language: 'typescript', level: 'junior' },
    });
    expect(status).toBe(502);
    expect(body.error).toBe('gemini_invalid_output');
  });

  it('502 gemini_invalid_output when SDK returns JSON missing required fields', async () => {
    generateContentMock.mockResolvedValueOnce({
      text: JSON.stringify({ question: '', tags: [], bodyMd: '' }),
    });
    const cookie = await adminCookie();
    const { status, body } = await postGenerate<{ error: string }>({
      cookie,
      body: { topic: 'closures', language: 'typescript', level: 'junior' },
    });
    expect(status).toBe(502);
    expect(body.error).toBe('gemini_invalid_output');
  });
});

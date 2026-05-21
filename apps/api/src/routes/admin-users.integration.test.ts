import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { eq, sql } from 'drizzle-orm';
import { users } from '@koomiteh/shared';
import { db, pool } from '../db/client.js';
import { createApp } from '../app.js';
import {
  SESSION_COOKIE_NAME,
  createSession,
  generateSessionToken,
} from '../auth/sessions.js';

const app = createApp();
const ORIGIN = 'http://localhost:5173';

type CallOptions = {
  method?: 'GET' | 'POST';
  cookie?: string;
  body?: unknown;
};

async function call<T = unknown>(
  pathname: string,
  opts: CallOptions = {},
): Promise<{ status: number; body: T }> {
  const headers: Record<string, string> = { Origin: ORIGIN };
  if (opts.cookie) headers.Cookie = opts.cookie;
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  const res = await app.request(`http://localhost${pathname}`, {
    method: opts.method ?? 'GET',
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  const text = await res.text();
  const body = text ? (JSON.parse(text) as T) : ({} as T);
  return { status: res.status, body };
}

let userCounter = 0;
async function createTestUser(
  role: 'user' | 'admin' | 'superadmin' = 'user',
  overrides: { suspendedAt?: Date | null; displayName?: string } = {},
): Promise<string> {
  userCounter += 1;
  const githubLogin = `${role}-${userCounter}`;
  const rows = await db
    .insert(users)
    .values({
      githubId: Math.floor(Math.random() * 1_000_000_000),
      githubLogin,
      displayName: overrides.displayName ?? githubLogin,
      avatarUrl: null,
      role,
      ...(overrides.suspendedAt !== undefined && {
        suspendedAt: overrides.suspendedAt,
      }),
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
  await db.execute(sql`TRUNCATE TABLE ${users} RESTART IDENTITY CASCADE`);
  userCounter = 0;
});

afterAll(async () => {
  await pool.end();
});

type AdminUserItem = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  githubLogin: string;
  role: 'user' | 'admin' | 'superadmin';
  createdAt: string;
  suspendedAt: string | null;
};

type ListResponse = {
  items: AdminUserItem[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

describe('GET /admin/users', () => {
  it('401 without session', async () => {
    const { status } = await call('/admin/users');
    expect(status).toBe(401);
  });

  it('403 for plain user', async () => {
    const id = await createTestUser('user');
    const cookie = await loginAs(id);
    const { status, body } = await call<{ error: string }>('/admin/users', {
      cookie,
    });
    expect(status).toBe(403);
    expect(body.error).toBe('forbidden');
  });

  it('200 for admin returns all users (including admins & suspended)', async () => {
    const aliceId = await createTestUser('user');
    await db
      .update(users)
      .set({ suspendedAt: new Date('2026-04-01T00:00:00.000Z') })
      .where(eq(users.id, aliceId));
    await createTestUser('user');
    await createTestUser('admin');
    const callerId = await createTestUser('admin');
    const cookie = await loginAs(callerId);

    const { status, body } = await call<ListResponse>('/admin/users', {
      cookie,
    });

    expect(status).toBe(200);
    expect(body.total).toBe(4);
    expect(body.items).toHaveLength(4);
    const alice = body.items.find((u) => u.id === aliceId);
    expect(alice?.suspendedAt).toBe('2026-04-01T00:00:00.000Z');
    const someUser = body.items[0]!;
    expect(typeof someUser.displayName).toBe('string');
    expect(typeof someUser.role).toBe('string');
  });

  it('200 for superadmin', async () => {
    await createTestUser('user');
    const callerId = await createTestUser('superadmin');
    const cookie = await loginAs(callerId);

    const { status, body } = await call<ListResponse>('/admin/users', {
      cookie,
    });
    expect(status).toBe(200);
    expect(body.total).toBe(2);
  });
});

async function getSuspendedAt(userId: string): Promise<Date | null> {
  const rows = await db
    .select({ suspendedAt: users.suspendedAt })
    .from(users)
    .where(eq(users.id, userId));
  return rows[0]?.suspendedAt ?? null;
}

describe('POST /admin/users/:id/suspend', () => {
  it('401 without session', async () => {
    const target = await createTestUser('user');
    const { status } = await call(`/admin/users/${target}/suspend`, {
      method: 'POST',
    });
    expect(status).toBe(401);
  });

  it('403 for plain user', async () => {
    const target = await createTestUser('user');
    const cookieId = await createTestUser('user');
    const cookie = await loginAs(cookieId);
    const { status } = await call(`/admin/users/${target}/suspend`, {
      method: 'POST',
      cookie,
    });
    expect(status).toBe(403);
  });

  it('admin can suspend a plain user', async () => {
    const target = await createTestUser('user');
    const cookie = await loginAs(await createTestUser('admin'));
    const { status } = await call(`/admin/users/${target}/suspend`, {
      method: 'POST',
      cookie,
    });
    expect(status).toBe(200);
    expect(await getSuspendedAt(target)).not.toBeNull();
  });

  it('admin cannot suspend another admin (403)', async () => {
    const target = await createTestUser('admin');
    const cookie = await loginAs(await createTestUser('admin'));
    const { status, body } = await call<{ error: string }>(
      `/admin/users/${target}/suspend`,
      { method: 'POST', cookie },
    );
    expect(status).toBe(403);
    expect(body.error).toBe('forbidden');
    expect(await getSuspendedAt(target)).toBeNull();
  });

  it('admin cannot suspend a superadmin (403)', async () => {
    const target = await createTestUser('superadmin');
    const cookie = await loginAs(await createTestUser('admin'));
    const { status } = await call(`/admin/users/${target}/suspend`, {
      method: 'POST',
      cookie,
    });
    expect(status).toBe(403);
  });

  it('superadmin can suspend an admin', async () => {
    const target = await createTestUser('admin');
    const cookie = await loginAs(await createTestUser('superadmin'));
    const { status } = await call(`/admin/users/${target}/suspend`, {
      method: 'POST',
      cookie,
    });
    expect(status).toBe(200);
    expect(await getSuspendedAt(target)).not.toBeNull();
  });

  it('superadmin cannot suspend themselves (403)', async () => {
    const callerId = await createTestUser('superadmin');
    const cookie = await loginAs(callerId);
    const { status } = await call(`/admin/users/${callerId}/suspend`, {
      method: 'POST',
      cookie,
    });
    expect(status).toBe(403);
    expect(await getSuspendedAt(callerId)).toBeNull();
  });

  it('superadmin cannot suspend another superadmin (403)', async () => {
    const target = await createTestUser('superadmin');
    const cookie = await loginAs(await createTestUser('superadmin'));
    const { status } = await call(`/admin/users/${target}/suspend`, {
      method: 'POST',
      cookie,
    });
    expect(status).toBe(403);
    expect(await getSuspendedAt(target)).toBeNull();
  });

  it('404 for unknown user', async () => {
    const cookie = await loginAs(await createTestUser('admin'));
    const { status } = await call(
      '/admin/users/00000000-0000-0000-0000-000000000000/suspend',
      { method: 'POST', cookie },
    );
    expect(status).toBe(404);
  });
});

describe('POST /admin/users/:id/unsuspend', () => {
  it('admin can unsuspend a suspended user', async () => {
    const target = await createTestUser('user', { suspendedAt: new Date() });
    const cookie = await loginAs(await createTestUser('admin'));
    const { status } = await call(`/admin/users/${target}/unsuspend`, {
      method: 'POST',
      cookie,
    });
    expect(status).toBe(200);
    expect(await getSuspendedAt(target)).toBeNull();
  });

  it('admin cannot unsuspend an admin (403)', async () => {
    const target = await createTestUser('admin', { suspendedAt: new Date() });
    const cookie = await loginAs(await createTestUser('admin'));
    const { status } = await call(`/admin/users/${target}/unsuspend`, {
      method: 'POST',
      cookie,
    });
    expect(status).toBe(403);
    expect(await getSuspendedAt(target)).not.toBeNull();
  });

  it('superadmin can unsuspend an admin', async () => {
    const target = await createTestUser('admin', { suspendedAt: new Date() });
    const cookie = await loginAs(await createTestUser('superadmin'));
    const { status } = await call(`/admin/users/${target}/unsuspend`, {
      method: 'POST',
      cookie,
    });
    expect(status).toBe(200);
    expect(await getSuspendedAt(target)).toBeNull();
  });
});

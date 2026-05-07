import { eq } from 'drizzle-orm';
import { sha256 } from '@oslojs/crypto/sha2';
import {
  encodeBase32LowerCaseNoPadding,
  encodeHexLowerCase,
} from '@oslojs/encoding';
import { sessions, users, type User } from '@koomiteh/shared';
import { db } from '../db/client.js';

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;

export const SESSION_COOKIE_NAME = 'koomiteh_session';

export function generateSessionToken(): string {
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  return encodeBase32LowerCaseNoPadding(bytes);
}

function hashToken(token: string): string {
  return encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
}

export async function createSession(
  token: string,
  userId: string,
): Promise<{ id: string; userId: string; expiresAt: Date }> {
  const id = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.insert(sessions).values({ id, userId, expiresAt });
  return { id, userId, expiresAt };
}

export type SessionValidation =
  | { session: null; user: null }
  | { session: { id: string; userId: string; expiresAt: Date }; user: User };

export async function validateSessionToken(
  token: string,
): Promise<SessionValidation> {
  const id = hashToken(token);
  const rows = await db
    .select({ session: sessions, user: users })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.id, id))
    .limit(1);

  const row = rows[0];
  if (!row) return { session: null, user: null };
  if (row.user.deletedAt) {
    await db.delete(sessions).where(eq(sessions.id, id));
    return { session: null, user: null };
  }
  if (Date.now() >= row.session.expiresAt.getTime()) {
    await db.delete(sessions).where(eq(sessions.id, id));
    return { session: null, user: null };
  }

  // Sliding refresh: extend if past halfway point.
  const halfTtl = SESSION_TTL_MS / 2;
  if (Date.now() >= row.session.expiresAt.getTime() - halfTtl) {
    const newExpiresAt = new Date(Date.now() + SESSION_TTL_MS);
    await db
      .update(sessions)
      .set({ expiresAt: newExpiresAt })
      .where(eq(sessions.id, id));
    row.session.expiresAt = newExpiresAt;
  }

  return { session: row.session, user: row.user };
}

export async function invalidateSessionToken(token: string): Promise<void> {
  const id = hashToken(token);
  await db.delete(sessions).where(eq(sessions.id, id));
}

import { Hono } from 'hono';
import { getCookie, deleteCookie } from 'hono/cookie';
import { GitHub, generateState, OAuth2RequestError } from 'arctic';
import { eq } from 'drizzle-orm';
import { users, type User } from '@koomiteh/shared';
import { env } from '../env.js';
import { db } from '../db/client.js';
import { logger } from '../logger.js';
import {
  SESSION_COOKIE_NAME,
  createSession,
  generateSessionToken,
  invalidateSessionToken,
} from '../auth/sessions.js';
import {
  STATE_COOKIE,
  clearSessionCookie,
  setSessionCookie,
  setStateCookie,
} from '../auth/cookies.js';
import { authContext } from '../middleware/auth-context.js';

function getGithubClient(): GitHub {
  if (!env.github.clientId || !env.github.clientSecret) {
    throw new Error('GitHub OAuth not configured');
  }
  return new GitHub(
    env.github.clientId,
    env.github.clientSecret,
    `${env.apiBaseUrl}/auth/github/callback`,
  );
}

type GitHubProfile = {
  id: number;
  login: string;
  name: string | null;
  avatar_url: string | null;
};

async function fetchGithubUser(accessToken: string): Promise<GitHubProfile> {
  const res = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'User-Agent': 'koomiteh.dev',
    },
  });
  if (!res.ok) {
    throw new Error(`GitHub user fetch failed: ${res.status}`);
  }
  return (await res.json()) as GitHubProfile;
}

async function upsertUser(profile: GitHubProfile): Promise<User> {
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.githubId, profile.id))
    .limit(1);

  const displayName = profile.name?.trim() || profile.login;

  if (existing[0]) {
    const updated = await db
      .update(users)
      .set({
        githubLogin: profile.login,
        displayName,
        avatarUrl: profile.avatar_url,
      })
      .where(eq(users.id, existing[0].id))
      .returning();
    return updated[0]!;
  }

  const inserted = await db
    .insert(users)
    .values({
      githubId: profile.id,
      githubLogin: profile.login,
      displayName,
      avatarUrl: profile.avatar_url,
    })
    .returning();
  return inserted[0]!;
}

export const authRoute = new Hono();

authRoute.get('/github', (c) => {
  let github: GitHub;
  try {
    github = getGithubClient();
  } catch {
    return c.json({ error: 'oauth_not_configured' }, 503);
  }
  const state = generateState();
  const url = github.createAuthorizationURL(state, ['read:user']);
  setStateCookie(c, state);
  return c.redirect(url.toString());
});

authRoute.get('/github/callback', async (c) => {
  const code = c.req.query('code');
  const state = c.req.query('state');
  const storedState = getCookie(c, STATE_COOKIE);
  deleteCookie(c, STATE_COOKIE, { path: '/' });

  if (!code || !state || !storedState || state !== storedState) {
    return c.json({ error: 'invalid_state' }, 400);
  }

  let github: GitHub;
  try {
    github = getGithubClient();
  } catch {
    return c.json({ error: 'oauth_not_configured' }, 503);
  }

  try {
    const tokens = await github.validateAuthorizationCode(code);
    const profile = await fetchGithubUser(tokens.accessToken());
    const user = await upsertUser(profile);

    const token = generateSessionToken();
    const session = await createSession(token, user.id);
    setSessionCookie(c, token, session.expiresAt);

    return c.redirect(env.appBaseUrl);
  } catch (err) {
    if (err instanceof OAuth2RequestError) {
      logger.warn({ err }, 'oauth2 request error');
      return c.json({ error: 'oauth_failed' }, 400);
    }
    throw err;
  }
});

authRoute.post('/logout', authContext, async (c) => {
  const token = getCookie(c, SESSION_COOKIE_NAME);
  if (token) {
    await invalidateSessionToken(token);
  }
  clearSessionCookie(c);
  return c.json({ ok: true });
});

authRoute.get('/me', authContext, (c) => {
  const user = c.get('user');
  if (!user) return c.json({ user: null });
  return c.json({
    user: {
      id: user.id,
      githubLogin: user.githubLogin,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      role: user.role,
    },
  });
});

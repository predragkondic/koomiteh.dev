import { Hono } from 'hono';
import { requireAuth } from '../middleware/auth-context.js';
import { myFavoritesRoute } from './favorites.js';

export const meRoute = new Hono();

meRoute.get('/profile', requireAuth, (c) => {
  const user = c.get('user')!;
  return c.json({
    id: user.id,
    githubLogin: user.githubLogin,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
  });
});

meRoute.route('/', myFavoritesRoute);

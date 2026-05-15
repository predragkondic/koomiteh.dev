import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { pinoLogger } from 'hono-pino';
import { env } from './env.js';
import { logger } from './logger.js';
import { Sentry } from './sentry.js';
import { requestId } from './middleware/request-id.js';
import { originCheck } from './middleware/origin-check.js';
import { healthRoute } from './routes/health.js';
import { authRoute } from './routes/auth.js';
import { postsRoute } from './routes/posts.js';
import { favoritesRoute, myFavoritesRoute } from './routes/favorites.js';
import { adminRoute } from './routes/admin.js';
import { adminGenerateRoute } from './routes/admin-generate.js';
import { adminSuggestTopicsRoute } from './routes/admin-suggest-topics.js';

export function createApp() {
  const app = new Hono();

  app.use('*', requestId());

  app.use(
    '*',
    pinoLogger({
      pino: logger,
      http: { referRequestIdKey: 'requestId' },
    }),
  );

  app.use(
    '*',
    cors({
      origin: env.webOrigins,
      credentials: true,
      allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'X-Request-ID'],
    }),
  );

  app.use('*', originCheck(env.webOrigins));

  app.route('/health', healthRoute);
  app.route('/auth', authRoute);
  app.route('/posts', postsRoute);
  app.route('/favorites', favoritesRoute);
  app.route('/me', myFavoritesRoute);
  app.route('/admin', adminRoute);
  app.route('/admin/posts/generate', adminGenerateRoute);
  app.route('/admin/posts/suggest-topics', adminSuggestTopicsRoute);

  app.onError((err, c) => {
    const reqId = c.get('requestId');
    logger.error({ err, requestId: reqId }, 'unhandled error');
    Sentry.captureException(err, { tags: { requestId: reqId } });
    return c.json({ error: 'internal_error', requestId: reqId }, 500);
  });

  return app;
}

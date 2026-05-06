import { serve } from '@hono/node-server';
import { initSentry } from './sentry.js';
import { createApp } from './app.js';
import { env } from './env.js';
import { logger } from './logger.js';

initSentry();

const app = createApp();

serve({ fetch: app.fetch, port: env.port }, (info) => {
  logger.info(
    { port: info.port, nodeEnv: env.nodeEnv, builtAt: env.builtAt },
    'api listening',
  );
});

const shutdown = (signal: string) => {
  logger.info({ signal }, 'shutting down');
  process.exit(0);
};
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

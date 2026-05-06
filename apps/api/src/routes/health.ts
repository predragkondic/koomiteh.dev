import { Hono } from 'hono';
import { sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import { env } from '../env.js';
import { logger } from '../logger.js';

export const healthRoute = new Hono().get('/', async (c) => {
  let dbStatus: 'ok' | 'error' = 'ok';
  try {
    await db.execute(sql`SELECT 1`);
  } catch (err) {
    dbStatus = 'error';
    logger.error({ err }, 'health: db ping failed');
  }
  return c.json({
    db: dbStatus,
    builtAt: env.builtAt,
  });
});

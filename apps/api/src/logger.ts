import { pino } from 'pino';
import { env, isProd } from './env.js';

export const logger = pino({
  level: env.logLevel,
  ...(isProd
    ? {}
    : {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'SYS:HH:MM:ss.l' },
        },
      }),
});

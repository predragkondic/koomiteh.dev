import * as Sentry from '@sentry/react';
import { config } from './config';

export function initSentry() {
  if (!config.sentryDsn) return;
  Sentry.init({
    dsn: config.sentryDsn,
    environment: config.mode,
    tracesSampleRate: config.isDev ? 0 : 0.1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
  });
}

export { Sentry };

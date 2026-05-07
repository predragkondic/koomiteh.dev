const required = ['DATABASE_URL'] as const;
const optional = [
  'SENTRY_DSN',
  'NODE_ENV',
  'PORT',
  'WEB_ORIGIN',
  'LOG_LEVEL',
  'BUILT_AT',
  'GITHUB_CLIENT_ID',
  'GITHUB_CLIENT_SECRET',
  'APP_BASE_URL',
  'API_BASE_URL',
  'SESSION_COOKIE_DOMAIN',
  'SESSION_COOKIE_SECURE',
] as const;

type RequiredKey = (typeof required)[number];
type OptionalKey = (typeof optional)[number];

function read<K extends RequiredKey>(key: K): string;
function read<K extends OptionalKey>(key: K, fallback: string): string;
function read(key: string, fallback?: string): string {
  const value = process.env[key];
  if (value && value.length > 0) return value;
  if (fallback !== undefined) return fallback;
  throw new Error(`Missing required env var: ${key}`);
}

const webOriginsRaw = read(
  'WEB_ORIGIN',
  'https://koomiteh.dev,http://localhost:5173',
);

const nodeEnv = read('NODE_ENV', 'development');
const isProdEnv = nodeEnv === 'production';

export const env = {
  databaseUrl: read('DATABASE_URL'),
  sentryDsn: process.env.SENTRY_DSN ?? '',
  nodeEnv,
  port: Number(read('PORT', '3000')),
  webOrigins: webOriginsRaw.split(',').map((s) => s.trim()).filter(Boolean),
  logLevel: read('LOG_LEVEL', 'info'),
  builtAt: read('BUILT_AT', new Date().toISOString()),
  github: {
    clientId: read('GITHUB_CLIENT_ID', ''),
    clientSecret: read('GITHUB_CLIENT_SECRET', ''),
  },
  appBaseUrl: read(
    'APP_BASE_URL',
    isProdEnv ? 'https://koomiteh.dev' : 'http://localhost:5173',
  ),
  apiBaseUrl: read(
    'API_BASE_URL',
    isProdEnv ? 'https://api.koomiteh.dev' : 'http://localhost:3000',
  ),
  sessionCookie: {
    domain: read('SESSION_COOKIE_DOMAIN', ''),
    secure:
      read('SESSION_COOKIE_SECURE', isProdEnv ? 'true' : 'false') === 'true',
  },
};

export const isProd = isProdEnv;

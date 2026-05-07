const required = ['DATABASE_URL'] as const;
const optional = [
  'SENTRY_DSN',
  'NODE_ENV',
  'PORT',
  'WEB_ORIGIN',
  'LOG_LEVEL',
  'BUILT_AT',
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

export const env = {
  databaseUrl: read('DATABASE_URL'),
  sentryDsn: process.env.SENTRY_DSN ?? '',
  nodeEnv: read('NODE_ENV', 'development'),
  port: Number(read('PORT', '3000')),
  webOrigins: webOriginsRaw.split(',').map((s) => s.trim()).filter(Boolean),
  logLevel: read('LOG_LEVEL', 'info'),
  builtAt: read('BUILT_AT', new Date().toISOString()),
};

export const isProd = env.nodeEnv === 'production';

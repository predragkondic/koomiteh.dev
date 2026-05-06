export const config = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? '',
  sentryDsn: import.meta.env.VITE_SENTRY_DSN ?? '',
  mode: import.meta.env.MODE,
  isDev: import.meta.env.DEV,
};

export function apiUrl(path: string): string {
  if (config.apiBaseUrl) return `${config.apiBaseUrl}${path}`;
  return `/api${path}`;
}

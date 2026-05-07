import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import { apiUrl } from '@/config';

type Status =
  | { kind: 'loading' }
  | { kind: 'ok'; builtAt: string; db: 'ok' | 'error' }
  | { kind: 'fail'; reason: string };

const STORAGE_KEY = 'koomiteh:dev-health-banner-hidden';

export function DevHealthBanner() {
  const [status, setStatus] = useState<Status>({ kind: 'loading' });
  const [hidden, setHidden] = useState(
    () => localStorage.getItem(STORAGE_KEY) === '1',
  );

  useEffect(() => {
    const ctrl = new AbortController();
    fetch(apiUrl('/health'), { signal: ctrl.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const body = (await res.json()) as { db: 'ok' | 'error'; builtAt: string };
        setStatus({ kind: 'ok', builtAt: body.builtAt, db: body.db });
      })
      .catch((err: unknown) => {
        if (ctrl.signal.aborted) return;
        setStatus({
          kind: 'fail',
          reason: err instanceof Error ? err.message : 'unknown',
        });
      });
    return () => ctrl.abort();
  }, []);

  if (hidden) return null;

  const hide = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    setHidden(true);
  };

  const palette =
    status.kind === 'ok' && status.db === 'ok'
      ? { bg: '#0f5132', fg: '#d1e7dd' }
      : status.kind === 'loading'
        ? { bg: '#664d03', fg: '#fff3cd' }
        : { bg: '#842029', fg: '#f8d7da' };

  const label =
    status.kind === 'loading'
      ? 'API: checking…'
      : status.kind === 'ok'
        ? `API ok · db ${status.db} · built ${status.builtAt}`
        : `API unreachable: ${status.reason}`;

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 2000,
        bgcolor: palette.bg,
        color: palette.fg,
        fontFamily: 'monospace',
        fontSize: 12,
        px: 2,
        py: 0.5,
        display: 'flex',
        gap: 2,
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <span>[dev] {label}</span>
      <button
        onClick={hide}
        style={{
          background: 'transparent',
          color: palette.fg,
          border: `1px solid ${palette.fg}`,
          borderRadius: 4,
          padding: '2px 8px',
          cursor: 'pointer',
          fontSize: 11,
        }}
      >
        dismiss
      </button>
    </Box>
  );
}

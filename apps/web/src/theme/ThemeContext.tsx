import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import GlobalStyles from '@mui/material/GlobalStyles';
import { theme } from './theme';

type Mode = 'light' | 'dark';

const STORAGE_KEY = 'koomiteh-theme';

interface ThemeContextValue {
  mode: Mode;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readInitialMode(): Mode {
  if (typeof window === 'undefined') return 'light';
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<Mode>(readInitialMode);

  useEffect(() => {
    document.documentElement.setAttribute('data-color-scheme', mode);
    window.localStorage.setItem(STORAGE_KEY, mode);
  }, [mode]);

  const toggle = useCallback(() => {
    setMode((m) => (m === 'light' ? 'dark' : 'light'));
  }, []);

  const value = useMemo(() => ({ mode, toggle }), [mode, toggle]);

  return (
    <ThemeContext.Provider value={value}>
      <ThemeProvider theme={theme} defaultMode={mode}>
        <CssBaseline />
        <GlobalStyles
          styles={{
            'pre.shiki': {
              padding: '1rem',
              borderRadius: 8,
              overflowX: 'auto',
            },
            'pre.shiki, pre.shiki span': {
              color: 'var(--shiki-light)',
              backgroundColor: 'var(--shiki-light-bg)',
            },
            '[data-color-scheme="dark"] pre.shiki, [data-color-scheme="dark"] pre.shiki span':
              {
                color: 'var(--shiki-dark)',
                backgroundColor: 'var(--shiki-dark-bg)',
              },
          }}
        />
        {children}
      </ThemeProvider>
    </ThemeContext.Provider>
  );
}

export function useThemeMode(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useThemeMode must be used within AppThemeProvider');
  }
  return ctx;
}

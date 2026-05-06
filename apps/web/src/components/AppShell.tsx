import { useEffect, useMemo, useState } from 'react';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { Link as RouterLink, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CommandPalette } from '@/features/interview/CommandPalette';
import { LanguageToggle } from './LanguageToggle';
import { ThemeToggle } from './ThemeToggle';

function detectShortcutHint(): string {
  if (typeof navigator === 'undefined') return 'Ctrl K';
  const ua = navigator.userAgent;
  return /Mac|iPhone|iPad|iPod/.test(ua) ? '⌘ K' : 'Ctrl K';
}

export function AppShell() {
  const { t } = useTranslation();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const shortcut = useMemo(detectShortcutHint, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((p) => !p);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="sticky" color="default" elevation={0}>
        <Toolbar sx={{ gap: 2 }}>
          <Typography
            component={RouterLink}
            to="/"
            variant="h6"
            sx={{
              textDecoration: 'none',
              color: 'inherit',
              fontWeight: 700,
              letterSpacing: '-0.02em',
            }}
          >
            {t('appName')}
          </Typography>
          <Box sx={{ flex: 1 }} />
          <Button
            variant="outlined"
            size="small"
            color="inherit"
            onClick={() => setPaletteOpen(true)}
            aria-label={t('search.openLabel')}
            aria-keyshortcuts={shortcut.replace(' ', '+')}
            sx={{
              textTransform: 'none',
              justifyContent: 'space-between',
              minWidth: 200,
              color: 'text.secondary',
              borderColor: 'divider',
              gap: 2,
            }}
          >
            <span>{t('search.placeholder')}</span>
            <Box
              component="span"
              sx={{
                fontFamily: 'monospace',
                fontSize: '0.75rem',
                color: 'text.disabled',
              }}
            >
              {shortcut}
            </Box>
          </Button>
          <LanguageToggle />
          <ThemeToggle />
        </Toolbar>
      </AppBar>
      <Container component="main" sx={{ py: 4, flex: 1 }}>
        <Outlet />
      </Container>
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
      />
    </Box>
  );
}

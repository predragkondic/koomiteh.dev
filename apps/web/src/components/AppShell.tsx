import { useEffect, useState } from 'react';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { Link as RouterLink, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CommandPalette } from '@/features/interview/CommandPalette';
import { useGetMeQuery } from '@/api/authApi';
import { LanguageToggle } from './LanguageToggle';
import { ThemeToggle } from './ThemeToggle';
import { AuthMenu } from './AuthMenu';
import { SearchTrigger } from './SearchTrigger';

export function AppShell() {
  const { t } = useTranslation();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const { data: me } = useGetMeQuery();
  const isAdmin = me?.user?.role === 'admin';

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
          {isAdmin && (
            <Button
              component={RouterLink}
              to="/admin"
              size="small"
              color="inherit"
              sx={{ textTransform: 'none' }}
            >
              {t('admin:title')}
            </Button>
          )}
          <SearchTrigger onClick={() => setPaletteOpen(true)} withShortcutHint />
          <LanguageToggle />
          <ThemeToggle />
          <AuthMenu />
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

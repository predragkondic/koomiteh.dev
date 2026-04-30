import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import { Link as RouterLink, Outlet } from 'react-router-dom';
import { ThemeToggle } from './ThemeToggle';

export function AppShell() {
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
            skillup.dev
          </Typography>
          <Box sx={{ flex: 1 }} />
          <ThemeToggle />
        </Toolbar>
      </AppBar>
      <Container component="main" sx={{ py: 4, flex: 1 }}>
        <Outlet />
      </Container>
    </Box>
  );
}

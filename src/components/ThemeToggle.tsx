import IconButton from '@mui/material/IconButton';
import { useThemeMode } from '@/theme/ThemeContext';

export function ThemeToggle() {
  const { mode, toggle } = useThemeMode();
  return (
    <IconButton
      aria-label={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={toggle}
      size="small"
      color="inherit"
    >
      {mode === 'dark' ? '☀' : '☾'}
    </IconButton>
  );
}

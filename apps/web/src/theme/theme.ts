import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  cssVariables: {
    colorSchemeSelector: 'data-color-scheme',
  },
  colorSchemes: {
    light: true,
    dark: true,
  },
  shape: { borderRadius: 8 },
  typography: {
    fontFamily:
      "'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
});

import { alpha, createTheme } from '@mui/material/styles';

// Type augmentations for palette.level.*, palette.language.*, palette.surface.*,
// and typography.fontFamilyMono live in `./mui.d.ts` — picked up automatically
// by tsc, no runtime import needed. (Filename must NOT be `theme.d.ts`: a
// `.d.ts` sibling of a `.ts` of the same name is treated as that module's
// generated declarations and its `declare module` blocks are ignored.)

// ────────────────────────────────────────────────────────────────────────────
// Tokens
// Mirrors `design-system/tokens.css`. Keep names in sync when adding tokens —
// the design-system page is the source of truth for visual review.
// ────────────────────────────────────────────────────────────────────────────

const FONT_SANS =
  "'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
const FONT_MONO =
  "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace";

/** Brand accent — magenta. The one loud color. */
const ACCENT = '#FF2E88';

const radius = {
  xs: 2,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  pill: 9999,
} as const;

const spacing = 4; // base unit; MUI multiplier (theme.spacing(1) = 4px).

// ── Light scheme ──────────────────────────────────────────────────────────
const light = {
  palette: {
    primary: {
      main: ACCENT,
      light: '#ff80ad',
      dark: '#e10073',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#5b5b62',
      light: '#7a7a82',
      dark: '#3f3f46',
      contrastText: '#ffffff',
    },
    background: {
      default: 'oklch(0.985 0.003 270)',
      paper: '#ffffff',
    },
    divider: 'oklch(0.90 0.004 270)',
    text: {
      primary: 'oklch(0.17 0.005 270)',
      secondary: 'oklch(0.42 0.006 270)',
      disabled: 'oklch(0.72 0.006 270)',
    },
    success: { main: '#1f8950', light: '#4cc28a', dark: '#0f5a32', contrastText: '#ffffff' },
    warning: { main: '#c98a1f', light: '#e7ab44', dark: '#8a5e0f', contrastText: '#ffffff' },
    error:   { main: '#d5483b', light: '#e96a59', dark: '#9d2e22', contrastText: '#ffffff' },
    info:    { main: '#2a7da1', light: '#62a8ce', dark: '#1a5570', contrastText: '#ffffff' },

    // Domain — level
    level: {
      junior: {
        main: 'oklch(0.50 0.14 155)',
        soft: 'oklch(0.88 0.06 155 / 0.50)',
        contrastText: '#ffffff',
      },
      senior: {
        main: 'oklch(0.50 0.16 285)',
        soft: 'oklch(0.90 0.07 285 / 0.50)',
        contrastText: '#ffffff',
      },
    },

    // Domain — language
    language: {
      typescript: {
        main: 'oklch(0.50 0.15 245)',
        soft: 'oklch(0.92 0.06 245 / 0.50)',
        contrastText: '#ffffff',
      },
      javascript: {
        main: 'oklch(0.55 0.14 90)',
        soft: 'oklch(0.94 0.08 90 / 0.55)',
        contrastText: '#000000',
      },
    },

    // App-specific surface helpers (use via theme.palette.surface.*)
    surface: {
      canvas: 'oklch(0.985 0.003 270)',
      sunken: 'oklch(0.96 0.004 270)',
      elevated: '#ffffff',
      borderSubtle: 'oklch(0.94 0.003 270)',
      borderStrong: 'oklch(0.80 0.005 270)',
    },
  },
};

// ── Dark scheme ───────────────────────────────────────────────────────────
const dark = {
  palette: {
    primary: {
      main: ACCENT,
      light: '#ff80ad',
      dark: '#c80064',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#b3b3b6',
      light: '#d4d4d6',
      dark: '#85858a',
      contrastText: '#1a1a1d',
    },
    background: {
      default: 'oklch(0.16 0.005 270)',
      paper: 'oklch(0.205 0.005 270)',
    },
    divider: 'oklch(0.30 0.006 270)',
    text: {
      primary: 'oklch(0.97 0.004 270)',
      secondary: 'oklch(0.72 0.006 270)',
      disabled: 'oklch(0.40 0.006 270)',
    },
    success: { main: '#4cc28a', light: '#7adcae', dark: '#1f8950', contrastText: '#0e2d1c' },
    warning: { main: '#e7ab44', light: '#f3c479', dark: '#a07418', contrastText: '#2b1d05' },
    error:   { main: '#e96a59', light: '#f3917f', dark: '#a73e30', contrastText: '#2b0f0b' },
    info:    { main: '#62a8ce', light: '#8dc4df', dark: '#2a7da1', contrastText: '#0a1a23' },

    level: {
      junior: {
        main: 'oklch(0.74 0.14 155)',
        soft: 'oklch(0.32 0.06 155 / 0.30)',
        contrastText: 'oklch(0.10 0.02 155)',
      },
      senior: {
        main: 'oklch(0.72 0.16 285)',
        soft: 'oklch(0.32 0.08 285 / 0.30)',
        contrastText: 'oklch(0.10 0.02 285)',
      },
    },

    language: {
      typescript: {
        main: 'oklch(0.68 0.15 245)',
        soft: 'oklch(0.30 0.08 245 / 0.30)',
        contrastText: 'oklch(0.10 0.02 245)',
      },
      javascript: {
        main: 'oklch(0.82 0.15 90)',
        soft: 'oklch(0.32 0.08 90 / 0.30)',
        contrastText: 'oklch(0.10 0.02 90)',
      },
    },

    surface: {
      canvas: 'oklch(0.16 0.005 270)',
      sunken: 'oklch(0.135 0.005 270)',
      elevated: 'oklch(0.245 0.005 270)',
      borderSubtle: 'oklch(0.25 0.005 270)',
      borderStrong: 'oklch(0.42 0.008 270)',
    },
  },
};

// ────────────────────────────────────────────────────────────────────────────
// Theme
// ────────────────────────────────────────────────────────────────────────────

export const theme = createTheme({
  cssVariables: {
    colorSchemeSelector: 'data-color-scheme',
  },
  colorSchemes: {
    light,
    dark,
  },
  shape: {
    borderRadius: radius.md,
  },
  spacing,
  typography: {
    fontFamily: FONT_SANS,
    fontFamilyMono: FONT_MONO,
    fontWeightRegular: 400,
    fontWeightMedium: 500,
    fontWeightBold: 600,

    h1: {
      fontFamily: FONT_SANS,
      fontSize: '3rem', // 48px — hero display
      fontWeight: 600,
      lineHeight: 1.05,
      letterSpacing: '-0.03em',
    },
    h2: {
      fontFamily: FONT_SANS,
      fontSize: '2rem', // 32px
      fontWeight: 600,
      lineHeight: 1.12,
      letterSpacing: '-0.025em',
    },
    h3: {
      fontFamily: FONT_SANS,
      fontSize: '1.375rem', // 22px
      fontWeight: 600,
      lineHeight: 1.25,
      letterSpacing: '-0.02em',
    },
    h4: {
      fontFamily: FONT_SANS,
      fontSize: '1.0625rem', // 17px
      fontWeight: 500,
      lineHeight: 1.35,
      letterSpacing: '-0.015em',
    },
    h5: {
      fontFamily: FONT_SANS,
      fontSize: '0.9375rem',
      fontWeight: 500,
      lineHeight: 1.4,
      letterSpacing: '-0.01em',
    },
    h6: {
      fontFamily: FONT_SANS,
      fontSize: '0.875rem',
      fontWeight: 500,
      lineHeight: 1.4,
      letterSpacing: '-0.005em',
    },
    body1: {
      fontFamily: FONT_SANS,
      fontSize: '0.9375rem', // 15px
      lineHeight: 1.55,
      letterSpacing: '-0.005em',
    },
    body2: {
      fontFamily: FONT_SANS,
      fontSize: '0.8125rem', // 13px
      lineHeight: 1.5,
    },
    caption: {
      fontFamily: FONT_MONO,
      fontSize: '0.6875rem', // 11px
      fontWeight: 500,
      letterSpacing: '0.08em',
      lineHeight: 1.4,
      textTransform: 'uppercase',
    },
    overline: {
      fontFamily: FONT_MONO,
      fontSize: '0.625rem',
      fontWeight: 500,
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
    },
    button: {
      fontFamily: FONT_SANS,
      fontWeight: 500,
      letterSpacing: '-0.005em',
      textTransform: 'none',
    },
  },

  components: {
    // Surfaces

    MuiCssBaseline: {
      styleOverrides: {
        body: {
          fontFeatureSettings: '"ss01", "ss02", "cv11"',
          textRendering: 'optimizeLegibility',
          WebkitFontSmoothing: 'antialiased',
        },
      },
    },

    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none', // kill the default dark-mode tint overlay
        },
      },
    },

    MuiAppBar: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: ({ theme: t }) => ({
          backgroundColor: t.palette.background.default,
          backgroundImage: 'none',
          borderBottom: `1px solid ${t.palette.divider}`,
        }),
      },
    },

    MuiToolbar: {
      styleOverrides: { root: { minHeight: 56 } },
    },

    MuiCard: {
      defaultProps: { variant: 'outlined' },
      styleOverrides: {
        root: ({ theme: t }) => ({
          borderRadius: radius.md,
          borderColor: t.palette.divider,
          backgroundImage: 'none',
          transition: 'border-color 120ms ease, background-color 120ms ease',
          '&:hover': {
            borderColor: t.palette.surface.borderStrong,
          },
        }),
      },
    },

    MuiCardActionArea: {
      styleOverrides: {
        focusHighlight: { display: 'none' },
      },
    },

    MuiDivider: {
      styleOverrides: {
        root: ({ theme: t }) => ({
          borderColor: t.palette.surface.borderSubtle,
        }),
      },
    },

    // Buttons

    MuiButton: {
      defaultProps: { disableElevation: true, disableRipple: false },
      styleOverrides: {
        root: {
          borderRadius: radius.md,
          textTransform: 'none',
          fontWeight: 500,
        },
        sizeSmall: { paddingInline: 10, height: 28, fontSize: '0.78125rem' },
        sizeMedium: { paddingInline: 14, height: 36, fontSize: '0.84375rem' },
        sizeLarge: { paddingInline: 18, height: 44, fontSize: '0.9375rem' },
        outlined: ({ theme: t }) => ({
          borderColor: t.palette.divider,
          '&:hover': {
            borderColor: t.palette.surface.borderStrong,
            backgroundColor: t.palette.background.paper,
          },
        }),
        text: ({ theme: t }) => ({
          color: t.palette.text.secondary,
          '&:hover': {
            backgroundColor: t.palette.background.paper,
            color: t.palette.text.primary,
          },
        }),
      },
    },

    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: radius.sm,
          padding: "2px 8px",
        },
      },
    },

    // Toggle group (Junior / Senior / Beide)

    MuiToggleButtonGroup: {
      styleOverrides: {
        root: ({ theme: t }) => ({
          backgroundColor: t.palette.background.default,
          border: `1px solid ${t.palette.divider}`,
          borderRadius: radius.md,
          padding: 2,
          gap: 2,
        }),
        grouped: {
          border: 0,
          '&:not(:first-of-type), &:first-of-type': {
            borderRadius: radius.sm,
          },
        },
      },
    },

    MuiToggleButton: {
      styleOverrides: {
        root: ({ theme: t }) => ({
          border: 0,
          height: 30,
          paddingInline: 12,
          fontFamily: FONT_SANS,
          fontWeight: 500,
          fontSize: '0.78125rem',
          textTransform: 'none',
          letterSpacing: '-0.005em',
          color: t.palette.text.secondary,
          borderRadius: radius.sm,
          '&:hover': {
            color: t.palette.text.primary,
            backgroundColor: 'transparent',
          },
          '&.Mui-selected': {
            backgroundColor: t.palette.background.paper,
            color: t.palette.text.primary,
            boxShadow: '0 1px 0 rgba(0,0,0,0.04)',
            '&:hover': {
              backgroundColor: t.palette.background.paper,
            },
          },
        }),
      },
    },

    // Chips

    MuiChip: {
      styleOverrides: {
        sizeSmall: { height: 22, fontSize: '0.6875rem' },
        // Neutral (no `color` prop, or color="default"): use our surface ramp.
        // Scoped to colorDefault so color="success"/"primary"/etc. keep their
        // natural MUI styling.
        colorDefault: ({ theme: t }) => ({
          backgroundColor: t.palette.surface.elevated,
          borderColor: t.palette.divider,
          color: t.palette.text.secondary,
        }),
        outlined: { backgroundColor: 'transparent' },
        deleteIcon: { fontSize: 14 },
      },
    },

    // Inputs

    MuiTextField: {
      defaultProps: { variant: 'outlined', size: 'small' },
    },

    MuiOutlinedInput: {
      styleOverrides: {
        root: ({ theme: t }) => ({
          borderRadius: radius.md,
          backgroundColor: t.palette.background.default,
          fontFamily: FONT_SANS,
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: t.palette.divider,
            transition: 'border-color 120ms ease',
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: t.palette.surface.borderStrong,
          },
          '&.Mui-focused': {
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: t.palette.primary.main,
              borderWidth: 1,
            },
            boxShadow: `0 0 0 3px ${alpha(t.palette.primary.main, 0.22)}`,
          },
        }),
        input: { paddingBlock: 10 },
      },
    },

    MuiInputLabel: {
      styleOverrides: {
        root: ({ theme: t }) => ({
          fontFamily: FONT_MONO,
          fontSize: '0.71875rem',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: t.palette.text.disabled,
          '&.Mui-focused': { color: t.palette.primary.main },
        }),
        outlined: {
          // Pull the floated label up so it sits above the input border cleanly.
          '&.MuiInputLabel-shrink': {
            transform: 'translate(14px, -8px) scale(0.85)',
          },
        },
      },
    },

    MuiAutocomplete: {
      styleOverrides: {
        paper: ({ theme: t }) => ({
          backgroundColor: t.palette.surface.elevated,
          border: `1px solid ${t.palette.divider}`,
          borderRadius: radius.md,
          boxShadow: '0 8px 24px -10px rgba(0,0,0,0.45)',
        }),
      },
    },

    // Menus / Dialogs / Tooltips

    MuiMenu: {
      styleOverrides: {
        paper: ({ theme: t }) => ({
          backgroundColor: t.palette.surface.elevated,
          border: `1px solid ${t.palette.divider}`,
          borderRadius: radius.md,
          boxShadow: '0 8px 24px -10px rgba(0,0,0,0.45)',
          padding: 4,
        }),
        list: { padding: 0 },
      },
    },

    MuiMenuItem: {
      styleOverrides: {
        root: ({ theme: t }) => ({
          borderRadius: radius.sm,
          fontSize: '0.84375rem',
          paddingBlock: 8,
          paddingInline: 10,
          '&:hover': { backgroundColor: t.palette.background.paper },
        }),
      },
    },

    MuiDialog: {
      styleOverrides: {
        paper: ({ theme: t }) => ({
          backgroundColor: t.palette.surface.elevated,
          backgroundImage: 'none',
          borderRadius: radius.lg,
          border: `1px solid ${t.palette.divider}`,
          boxShadow: '0 24px 56px -20px rgba(0,0,0,0.55)',
        }),
      },
    },

    MuiTooltip: {
      styleOverrides: {
        tooltip: ({ theme: t }) => ({
          backgroundColor: t.palette.surface.elevated,
          color: t.palette.text.primary,
          border: `1px solid ${t.palette.divider}`,
          borderRadius: radius.sm,
          fontSize: '0.71875rem',
          fontFamily: FONT_MONO,
          paddingBlock: 4,
          paddingInline: 8,
        }),
        arrow: ({ theme: t }) => ({ color: t.palette.surface.elevated }),
      },
    },

    // Feedback

    MuiAlert: {
      styleOverrides: {
        root: ({ theme: t }) => ({
          borderRadius: radius.md,
          border: `1px solid ${t.palette.divider}`,
          backgroundColor: t.palette.background.paper,
          fontSize: '0.84375rem',
        }),
        icon: { alignSelf: 'center' },
      },
    },

    MuiSkeleton: {
      styleOverrides: {
        root: { borderRadius: radius.sm },
      },
    },

    MuiPagination: {
      defaultProps: { shape: 'rounded' },
    },

    MuiPaginationItem: {
      styleOverrides: {
        root: ({ theme: t }) => ({
          fontFamily: FONT_MONO,
          fontWeight: 500,
          borderRadius: radius.sm,
          '&.Mui-selected': {
            backgroundColor: t.palette.primary.main,
            color: t.palette.primary.contrastText,
            '&:hover': { backgroundColor: t.palette.primary.dark },
          },
        }),
      },
    },

    // List (used in CommandPalette)

    MuiListItemButton: {
      styleOverrides: {
        root: ({ theme: t }) => ({
          borderRadius: radius.sm,
          '&.Mui-selected': {
            backgroundColor: t.palette.background.default,
            outline: `1px solid ${alpha(t.palette.primary.main, 0.45)}`,
            '&:hover': { backgroundColor: t.palette.background.default },
          },
        }),
      },
    },
  },
});

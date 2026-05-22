import { createTheme } from '@mui/material/styles';

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

const FONT_SANS = "'Roboto', sans-serif";
const FONT_HEADING =  "'Aleo', serif";
const FONT_MONO =
  "'JetBrains Mono', monospace";

/** Brand accent — magenta. The one loud color. */
const ACCENT = '#c71d31ff';

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
      light: '#e54e60ff',
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
      default: '#F9FAFC',
      paper: '#ffffff',
    },
    divider: '#DDDEE1',
    text: {
      primary: '#0E0F12',
      secondary: '#4C4D50',
      disabled: '#A3A4A8',
    },
    input: {
      background: "#f0f0f0",
    },
    success: { main: '#1f8950', light: '#4cc28a', dark: '#0f5a32', contrastText: '#ffffff' },
    warning: { main: '#c98a1f', light: '#e7ab44', dark: '#8a5e0f', contrastText: '#ffffff' },
    error:   { main: '#d5483b', light: '#e96a59', dark: '#9d2e22', contrastText: '#ffffff' },
    info:    { main: '#2a7da1', light: '#62a8ce', dark: '#1a5570', contrastText: '#ffffff' },

    // Domain — level
    level: {
      junior: {
        main: '#00793D',
        soft: 'rgba(185, 228, 198, 0.5)',
        contrastText: '#ffffff',
      },
      senior: {
        main: '#5D4FB9',
        soft: 'rgba(216, 216, 255, 0.5)',
        contrastText: '#ffffff',
      },
    },

    // Domain — language
    language: {
      typescript: {
        main: '#0068B2',
        soft: 'rgba(196, 234, 255, 0.5)',
        contrastText: '#ffffff',
      },
      javascript: {
        main: '#916B00',
        soft: 'rgba(255, 234, 174, 0.55)',
        contrastText: '#000000',
      },
    },

    // App-specific surface helpers (use via theme.palette.surface.*)
    surface: {
      canvas: '#F9FAFC',
      sunken: '#F1F2F4',
      elevated: '#ffffff',
      borderSubtle: '#EAEBED',
      borderStrong: '#BCBEC1',
      dialogWrapper: 'rgba(211, 211, 211, 0.8)',
    },
  },
};

// ── Dark scheme ───────────────────────────────────────────────────────────
const dark = {
  palette: {
    primary: {
      main: ACCENT,
      light: '#e54e60ff',
      dark: '#df243aff',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#b3b3b6',
      light: '#d4d4d6',
      dark: '#85858a',
      contrastText: '#1a1a1d',
    },
    background: {
      default: '#0C0D0F',
      paper: '#161719',
    },
    divider: '#2D2E31',
    text: {
      primary: '#F4F5F8',
      secondary: '#A3A4A8',
      disabled: '#8a8a8a',
    },
        input: {
      background: "#131314",
    },
    success: { main: '#4cc28a', light: '#7adcae', dark: '#1f8950', contrastText: '#0e2d1c' },
    warning: { main: '#e7ab44', light: '#f3c479', dark: '#a07418', contrastText: '#2b1d05' },
    error:   { main: '#e96a59', light: '#f3917f', dark: '#a73e30', contrastText: '#2b0f0b' },
    info:    { main: '#62a8ce', light: '#8dc4df', dark: '#2a7da1', contrastText: '#0a1a23' },
    level: {
      junior: {
        main: '#55C483',
        soft: 'rgba(21, 60, 37, 0.3)',
        contrastText: '#010502',
      },
      senior: {
        main: '#9C93FF',
        soft: 'rgba(47, 43, 89, 0.3)',
        contrastText: '#030308',
      },
    },

    language: {
      typescript: {
        main: '#339FEE',
        soft: 'rgba(0, 48, 83, 0.3)',
        contrastText: '#010408',
      },
      javascript: {
        main: '#EABF3A',
        soft: 'rgba(67, 48, 0, 0.3)',
        contrastText: '#050300',
      },
    },

    surface: {
      canvas: '#0C0D0F',
      sunken: '#07080A',
      elevated: '#1F2023',
      borderSubtle: '#212224',
      borderStrong: '#4B4D52',
      dialogWrapper: 'rgba(41, 41, 41, 0.6)',
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
    fontWeightLight: 400,
    fontWeightMedium: 500,
    fontWeightBold: 600,
    fontSize: 14,

    h1: {
      fontFamily: FONT_HEADING,
      fontWeight: 600,
      lineHeight: 1.05,

    },
    h2: {
      fontFamily: FONT_HEADING,
      // fontSize: '2rem', // 32px
      fontWeight: 600,
      lineHeight: 1.12,        

    },
    h3: {
      fontFamily: FONT_HEADING,
      // fontSize: '1.375rem', // 22px
      fontWeight: 600,
      lineHeight: 1.25,
    },
    h4: {
      fontFamily: FONT_SANS,
      // fontSize: '1.375rem', // 17px
      fontWeight: 500,
      lineHeight: 1.35,
    },
    h5: {
      fontFamily: FONT_SANS,
      // fontSize: '0.9375rem',
      fontWeight: 500,
      lineHeight: 1.4,
    },
    h6: {
      fontFamily: FONT_SANS,
      // fontSize: '0.875rem',
      fontWeight: 500,
      lineHeight: 1.4,
    },
    body1: {
      fontFamily: FONT_SANS,
      lineHeight: 1.5,
      fontWeight: 400,
      fontSize: "1.15rem",

    },
    body2: {
      fontFamily: FONT_SANS,
      // fontSize: '0.9375rem', // 15px      
      lineHeight: 1.5,
    },
    caption: {
      fontFamily: FONT_MONO,
      // fontSize: '0.6875rem', // 11px
      fontWeight: 500,
      letterSpacing: '0.08em',
      lineHeight: 1.4,
      textTransform: 'uppercase',
    },
    overline: {
      fontFamily: FONT_MONO,
      // fontSize: '0.625rem',
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
      styleOverrides: (t) => ({
        body: {
          fontFeatureSettings: '"ss01", "ss02", "cv11"',
          textRendering: 'optimizeLegibility',
          WebkitFontSmoothing: 'antialiased',
        },
        '.nav-rail': {
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          paddingInline: t.spacing(2),
          paddingBlock: t.spacing(3),
          display: 'flex',
          flexDirection: 'column',
        },
        '.nav-rail.nav-rail--collapsed': {
          paddingInline: 0,
        },
      }),
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
          backgroundColor: t.vars.palette.background.default,
          backgroundImage: 'none',
          borderBottom: `1px solid ${t.vars.palette.divider}`,
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
          borderColor: t.vars.palette.divider,
          backgroundImage: 'none',
          transition: 'border-color 120ms ease, background-color 120ms ease',
          '&:hover': {
            borderColor: t.vars.palette.surface.borderStrong,
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
          borderColor: t.vars.palette.surface.borderSubtle,
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
        sizeSmall: { paddingInline: 10, height: 28 },// fontSize: '0.78125rem' },
        sizeMedium: { paddingInline: 14, height: 36},// fontSize: '0.84375rem' },
        sizeLarge: { paddingInline: 18, height: 44}, // fontSize: '0.9375rem' },
        outlined: ({ theme: t }) => ({
          borderColor: t.vars.palette.divider,
          '&:hover': {
            borderColor: t.vars.palette.surface.borderStrong,
            backgroundColor: t.vars.palette.background.paper,
          },
        }),
        text: ({ theme: t }) => ({
          color: t.vars.palette.text.secondary,
          '&:hover': {
            backgroundColor: t.vars.palette.background.paper,
            color: t.vars.palette.text.primary,
          },
        }),
      },
    },

    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: radius.sm,
          padding: "4px 6px",
        },
      },
    },

    // Toggle group (Junior / Senior / Beide)

    MuiToggleButtonGroup: {
      styleOverrides: {
        root: ({ theme: t }) => ({
          backgroundColor: t.vars.palette.background.default,
          border: `1px solid ${t.vars.palette.divider}`,
          borderRadius: radius.md,
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
          // fontSize: '0.78125rem',
          textTransform: 'none',
          letterSpacing: '-0.005em',
          color: t.vars.palette.text.secondary,
          borderRadius: radius.sm,
          '&:hover': {
            color: t.vars.palette.text.primary,
            backgroundColor: 'transparent',
          },
          '&.Mui-selected': {
            backgroundColor: t.vars.palette.background.paper,
            color: t.vars.palette.text.primary,
            boxShadow: '0 1px 0 rgba(0,0,0,0.04)',
            '&:hover': {
              backgroundColor: t.vars.palette.background.paper,
            },
          },
        }),
      },
    },

    // Chips

    MuiChip: {
      variants: [
        {
          props: { variant: 'tag' },
          style: ({ theme: t }) => ({

            // fontSize: '0.71875rem',
            backgroundColor: `rgba(${t.vars.palette.primary.mainChannel} / 0.10)`,
            border: `1px solid rgba(${t.vars.palette.primary.mainChannel} / 0.22)`,
            color:
              t.palette.mode === 'dark' ? '#FF8ABA' : t.vars.palette.primary.dark,
            '& .MuiChip-deleteIcon': {
              // fontSize: 14,
              color: t.vars.palette.text.disabled,
              marginRight: 4,
            },
          }),
        },
        {
          props: { variant: 'level', color: 'junior' },
          style: ({ theme: t }) => ({            
            backgroundColor: t.vars.palette.level.junior.soft,
            color: t.vars.palette.level.junior.main,
            border: `1px solid color-mix(in oklab, ${t.vars.palette.level.junior.main} 35%, transparent)`,
            '& .MuiChip-label': {
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            },
          }),
        },
        {
          props: { variant: 'level', color: 'senior' },
          style: ({ theme: t }) => ({
            // fontSize: '0.75rem',
            backgroundColor: t.vars.palette.level.senior.soft,
            color: t.vars.palette.level.senior.main,
            border: `1px solid color-mix(in oklab, ${t.vars.palette.level.senior.main} 35%, transparent)`,
            '& .MuiChip-label': {
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            },
          }),
        },
        {
          props: { variant: 'status', color: 'active' },
          style: ({ theme: t }) => ({
            // fontSize: '0.75rem',
            backgroundColor: `color-mix(in oklab, ${t.vars.palette.success.main} 18%, transparent)`,
            color: t.vars.palette.success.main,
            border: `1px solid color-mix(in oklab, ${t.vars.palette.success.main} 35%, transparent)`,
          }),
        },
        {
          props: { variant: 'status', color: 'draft' },
          style: ({ theme: t }) => ({
            // fontSize: '0.75rem',
            backgroundColor: `color-mix(in oklab, ${t.vars.palette.warning.main} 18%, transparent)`,
            color: t.vars.palette.warning.main,
            border: `1px solid color-mix(in oklab, ${t.vars.palette.warning.main} 35%, transparent)`,
          }),
        },
        {
          props: { variant: 'status', color: 'deleted' },
          style: ({ theme: t }) => ({
            // fontSize: '0.75rem',
            backgroundColor: `color-mix(in oklab, ${t.vars.palette.error.main} 18%, transparent)`,
            color: t.vars.palette.error.main,
            border: `1px solid color-mix(in oklab, ${t.vars.palette.error.main} 35%, transparent)`,
          }),
        },
      ],
      styleOverrides: {
        root: {                                  
          height: 22,
          letterSpacing: 0.85,
          borderRadius: radius.pill,
          fontWeight: 500,
          '& .MuiChip-label': { paddingInline: 8 },
        },
        sizeSmall: { height: 22, 
          // fontSize: '0.6875rem' 
        },
        // Neutral (no `color` prop, or color="default"): use our surface ramp.
        // Scoped to colorDefault so color="success"/"primary"/etc. keep their
        // natural MUI styling.
        colorDefault: ({ theme: t }) => ({
          backgroundColor: t.vars.palette.surface.elevated,
          borderColor: t.vars.palette.divider,
          color: t.vars.palette.text.secondary,
        }),
        outlined: { backgroundColor: 'transparent' },
        deleteIcon: { 
          // fontSize: 14 
          },
      },
    },

    MuiFormHelperText: {
      styleOverrides: {
        root: ({ theme: t }) => ({
          fontFamily: t.typography.fontFamilyMono,
          // fontSize: '0.65625rem',
          letterSpacing: '0.02em',
          color: t.vars.palette.text.disabled,
          marginTop: 4,
          marginLeft: 0,
        }),
      },
    },

    // Inputs

    MuiTextField: {
      defaultProps: { variant: 'outlined', size: 'small', },
    },

    MuiOutlinedInput: {
      styleOverrides: {
        root: ({ theme: t }) => ({
          borderRadius: radius.md,
          backgroundColor: t.vars.palette.input.background,
          fontFamily: FONT_SANS,
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: t.vars.palette.divider,
            transition: 'border-color 120ms ease',
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: t.vars.palette.surface.borderStrong,
          },
          '&.Mui-focused': {
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: t.vars.palette.primary.main,
              borderWidth: 1,
            },
            boxShadow: `0 0 0 3px rgba(${t.vars.palette.primary.mainChannel} / 0.22)`,
          },
        }),
        input: { paddingBlock: 10 },
      },
    },

    MuiInputLabel: {
      styleOverrides: {
        root: ({ theme: t }) => ({
          fontFamily: FONT_MONO,
          // fontSize: '0.71875rem',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: t.vars.palette.text.disabled,
          '&.Mui-focused': { color: t.vars.palette.primary.main },
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
          backgroundColor: t.vars.palette.surface.elevated,
          border: `1px solid ${t.vars.palette.divider}`,
          borderRadius: radius.md,
          boxShadow: '0 8px 24px -10px rgba(0,0,0,0.45)',
        }),
      },
    },

    // Menus / Dialogs / Tooltips

    MuiMenu: {
      styleOverrides: {
        paper: ({ theme: t }) => ({
          backgroundColor: t.vars.palette.surface.elevated,
          border: `1px solid ${t.vars.palette.divider}`,
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
          // fontSize: '0.84375rem',
          paddingBlock: 8,
          paddingInline: 10,
          '&:hover': { backgroundColor: t.vars.palette.background.paper },
        }),
      },
    },

    MuiDialog: {
      styleOverrides: {
        root: ({ theme: t }) => ({
            backgroundColor: t.vars.palette.surface.dialogWrapper,
        }),
        paper: ({ theme: t }) => ({
          position: 'absolute',
          top: '10%',
        
          backgroundImage: 'none',
          borderRadius: radius.lg,
          border: `1px solid ${t.vars.palette.surface.borderStrong}`,
          boxShadow: '0 24px 56px -20px rgba(0,0,0,0.55)',
        }),
      },
    },

    MuiDialogTitle: {
      styleOverrides: {
        root: {
          fontFamily: FONT_SANS,
          // fontSize: '16px',
          fontWeight: 600,
          lineHeight: 1.4,
          paddingTop: 16,
          paddingBottom: 8,
          paddingInline: 20,
          paddingRight: 44,
        },
      },
    },

    MuiDialogContent: {
      styleOverrides: {
        root: ({ theme: t }) => ({
          color: t.vars.palette.text.secondary,
          paddingInline: 20,
          paddingBottom: 20,
          paddingTop: 4,
          // fontSize: '0.875rem',
          lineHeight: 1.5,
        }),
      },
    },

    MuiDialogActions: {
      styleOverrides: {
        root: ({ theme: t }) => ({
          backgroundColor: t.vars.palette.AppBar.darkBg,
          borderTop: `1px solid ${t.vars.palette.divider}`,
          padding: 12,
          gap: 8,
          ['& .MuiButton-root.MuiButton-contained']: { color: t.vars.palette.text.primaryChannel },
        }),
      },
    },

    MuiTooltip: {
      styleOverrides: {
        tooltip: ({ theme: t }) => ({
          backgroundColor: t.vars.palette.surface.elevated,
          color: t.vars.palette.text.primary,
          border: `1px solid ${t.vars.palette.divider}`,
          borderRadius: radius.sm,
          // fontSize: '0.71875rem',
          fontFamily: FONT_MONO,
          paddingBlock: 4,
          paddingInline: 8,
        }),
        arrow: ({ theme: t }) => ({ color: t.vars.palette.surface.elevated }),
      },
    },

    // Feedback

    MuiAlert: {
      styleOverrides: {
        root: ({ theme: t }) => ({
          borderRadius: radius.md,
          border: `1px solid ${t.vars.palette.divider}`,
          backgroundColor: t.vars.palette.background.paper,
          // fontSize: '0.84375rem',
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
          fontFamily: FONT_SANS,
          // fontSize: '0.8125rem',
          fontWeight: 500,
          minWidth: 28,
          height: 28,
          borderRadius: radius.sm,
          '&.Mui-selected': {
            backgroundColor: t.vars.palette.primary.main,
            color: t.vars.palette.primary.contrastText,
            '&:hover': { backgroundColor: t.vars.palette.primary.dark },
          },
        }),
      },
    },

    MuiTableSortLabel: {
      styleOverrides: {
        root: ({ theme: t }) => ({
          '&.Mui-active, &.Mui-active .MuiTableSortLabel-icon': {
            color: t.vars.palette.primary.main,
          },
        }),
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: ({ theme: t }) => ({
          borderRadius: radius.sm,
          '&.Mui-selected': {
            backgroundColor: t.vars.palette.background.default,
            outline: `1px solid rgba(${t.vars.palette.primary.mainChannel} / 0.45)`,
            '&:hover': { backgroundColor: t.vars.palette.background.default },
          },
          // Sidebar nav rail — see docs/handoff/design_handoff_sidebar
          '.nav-rail &': {
            marginBottom: 6,
            height: 32,
            paddingInline: 10,
            borderRadius: 6,
            gap: 10,
            color: t.vars.palette.text.secondary,
            position: 'relative',
            transition: 'background-color 120ms ease, color 120ms ease',
            '& .MuiListItemIcon-root': {
              minWidth: 0,
              color: t.vars.palette.text.disabled,
            },

            '&:hover': {
              backgroundColor: `color-mix(in oklab, ${t.vars.palette.text.primary} 4%, transparent)`,
              color: t.vars.palette.text.primary,
            },
            '&:hover .MuiListItemIcon-root': {
              color: t.vars.palette.text.secondary,
            },

            '&.Mui-selected': {
              backgroundColor: `color-mix(in oklab, ${t.vars.palette.primary.main} 12%, transparent)`,
              color: t.vars.palette.text.primary,
              outline: 'none',
              '&:hover': {
                backgroundColor: `color-mix(in oklab, ${t.vars.palette.primary.main} 16%, transparent)`,
              },
            },
            '&.Mui-selected .MuiListItemIcon-root': {
              color: t.vars.palette.primary.main,
            },

            '&.Mui-selected::before': {
              content: '""',
              position: 'absolute',
              left: -10,
              top: 6,
              bottom: 6,
              width: 3,
              borderRadius: '0 3px 3px 0',
              backgroundColor: t.vars.palette.primary.main,
            },
          },

          '.nav-rail--nested .MuiListItemButton-root': {
            height: 28,
          },

          '.nav-rail--nested .MuiListItemButton-root.Mui-selected::before': {
            left: -19,
          },
        }),
      },
    },
    MuiTableRow:  {
      styleOverrides: {
        hover: ({ theme: t }) => ({
          '&:hover .MuiTableCell-root': {
            backgroundColor: t.vars.palette.grey[500],
          },
        }),
    }
  },

    MuiList: {
      styleOverrides: {
        root: {

          '&.nav-rail--nested': { 
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            gap: '1px',
            paddingTop: '2px',
            paddingBottom: '4px',
            paddingLeft: '20px',
            marginLeft: '4px',
            '&::before': {
              content: '""',
              position: 'absolute',
              left: 13,
              top: 4,
              bottom: 4,
              width: 1,
            },
          },
        },
      },
    },

    MuiSvgIcon: {
      styleOverrides: {
        root: ({ theme: t }) => ({
          '&.nav-rail-chevron': {
            width: 18,
            height: 18,
            display: 'grid',
            placeItems: 'center',
            color: t.vars.palette.text.disabled,
            transition: 'transform 150ms ease',
          },
          '&.nav-rail-chevron.nav-rail-chevron--open': {
            transform: 'rotate(90deg)',
          },
        }),
      },
    },
},
});

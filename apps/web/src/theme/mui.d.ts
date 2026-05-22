// MUI module augmentation for koomiteh.dev domain palette tokens.
//
// Why this file exists:
// - `palette.level.junior / .senior` and `palette.language.typescript / .javascript`
//   are domain-specific, not in MUI's default Palette interface. Without this
//   augmentation, accessing them via `useTheme()` is `any` / a type error.
// - `palette.surface.*` adds the surface ramp (canvas, sunken, elevated,
//   borderSubtle, borderStrong) the design system defines beyond MUI's default
//   `background.default` / `background.paper`.
// - `typography.fontFamilyMono` exposes the JetBrains Mono stack on the theme
//   so components don't have to hard-code `fontFamily: 'monospace'`.
//
// Constraints (see CONTEXT.md):
// - This is the single place these names live, on the type side. The values
//   live in `theme.ts`. Drift between them is a build break.
// - If a new language or level is added, extend both this file and `theme.ts`
//   in the same PR.

import '@mui/material/styles';
import '@mui/material/Chip';

declare module '@mui/material/styles' {
  // Each domain entry shares the standard MUI PaletteColor shape (main/dark/
  // light/contrastText) plus a custom `soft` channel used for chip backgrounds.
  interface DomainPaletteColor {
    main: string;
    soft: string;
    contrastText: string;
  }
  interface SurfacePalette {
    /** page background — same value as palette.background.default */
    canvas: string;
    /** code blocks, recessed panels */
    sunken: string;
    /** menus, palette, popovers — same as palette.background.paper */
    elevated: string;
    /** interior dividers, hairlines inside cards */
    borderSubtle: string;
    /** hover/focus rest state on outlined surfaces */
    borderStrong: string;
    dialogWrapper: string;
  }

  interface Palette {
    input: {
      background: string;
    };
    level: {
      junior: DomainPaletteColor;
      senior: DomainPaletteColor;
    };
    language: {
      typescript: DomainPaletteColor;
      javascript: DomainPaletteColor;
    };
    surface: SurfacePalette;
  }

  interface PaletteOptions {
    input?: {
      background?: string;
    };
    level?: {
      junior?: Partial<DomainPaletteColor>;
      senior?: Partial<DomainPaletteColor>;
    };
    language?: {
      typescript?: Partial<DomainPaletteColor>;
      javascript?: Partial<DomainPaletteColor>;
    };
    surface?: Partial<SurfacePalette>;
  }

  // Typography
  interface TypographyVariants {
    fontFamilyMono: string;
  }
  interface TypographyVariantsOptions {
    fontFamilyMono?: string;
  }
}

declare module '@mui/material/Chip' {
  interface ChipPropsVariantOverrides {
    tag: true;
    level: true;
    status: true;
  }
  interface ChipPropsColorOverrides {
    junior: true;
    senior: true;
    active: true;
    draft: true;
    deleted: true;
  }
}

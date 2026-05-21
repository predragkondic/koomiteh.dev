import type { Theme } from '@mui/material/styles';
import type { SxProps } from '@mui/material/styles';

/** Submenu strip: slightly elevated in dark, slightly sunken in light. */
export function navSubmenuSx(): SxProps<Theme> {
  return (t) => ({
    pl: 2,
    bgcolor:
      t.palette.mode === 'dark'
        ? t.palette.surface.elevated
        : t.palette.surface.sunken,
  });
}

export function navItemButtonSx(
  selected: boolean,
  nested = false,
): SxProps<Theme> {
  return (t) => {
    const selectedBg = nested
      ? t.palette.background.paper
      : t.palette.mode === 'dark'
        ? t.palette.surface.elevated
        : t.palette.surface.sunken;

    const hoverBg = nested
      ? t.palette.background.paper
      : t.palette.mode === 'dark'
        ? `color-mix(in oklab, ${t.palette.surface.elevated} 70%, transparent)`
        : t.palette.surface.sunken;

    return {
      borderRadius: 0,
      mx: 0,
      px: 2,
      py: 1.25,
      minHeight: 44,
      '&.Mui-selected': {
        backgroundColor: selected ? selectedBg : 'transparent',
        outline: 'none',
        borderRight: selected
          ? `4px solid ${t.palette.primary.main}`
          : undefined,
        '&:hover': {
          backgroundColor: selected ? selectedBg : hoverBg,
        },
      },
      '&:hover': {
        backgroundColor: hoverBg,
      },
    };
  };
}

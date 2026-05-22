import type { SxProps } from '@mui/material/styles';
import type { Theme } from '@mui/material/styles';

/** Sub-tree container + vertical guide (prototype sidebar-A). */
export const NAV_SUBMENU_SX: SxProps<Theme> = {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    gap: '1px',
    py: '2px',
    pb: '4px',
    pl: '22px',
    ml: '4px',
    '&::before': {
      content: '""',
      position: 'absolute',
      left: 13,
      top: 4,
      bottom: 4,
      width: 1,
    },
};

export const NAV_RAIL_SCROLL_SX: SxProps<Theme> = {
  flex: 1,
  overflowY: 'auto',
  overflowX: 'hidden',
  px: 2.5,
  py: 3.5,
  display: 'flex',
  flexDirection: 'column',
  gap: 3.5,
};

export const NAV_RAIL_CHEVRON_SX = (open: boolean): SxProps<Theme> => ({
  width: 12,
  height: 12,
  display: 'grid',
  placeItems: 'center',
  color: 'text.disabled',
  transform: open ? 'rotate(90deg)' : 'none',
  transition: 'transform 150ms ease',
});


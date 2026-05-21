import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import { useLocation } from 'react-router-dom';
import { useGetMeQuery } from '@/api/authApi';
import {
  buildNavItems,
  getAppNavMode,
  type NavItem,
} from './appNavConfig';
import { NavListItems, SIDEBAR_WIDTH } from './NavListItems';

interface AppSidebarProps {
  items?: NavItem[];
}

export function AppSidebar({ items: itemsProp }: AppSidebarProps) {
  const { pathname } = useLocation();
  const { data } = useGetMeQuery();
  const mode = getAppNavMode(pathname);
  const items = itemsProp ?? buildNavItems(mode, data?.user);

  return (
    <Drawer
      variant="permanent"
      sx={{
        display: { xs: 'none', md: 'block' },
        width: SIDEBAR_WIDTH,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: SIDEBAR_WIDTH,
          boxSizing: 'border-box',
          position: 'relative',
          borderRight: 1,
          borderColor: 'divider',
          bgcolor: 'background.default',
        },
      }}
    >
      <Box sx={{ pt: 1, pb: 1 }}>
        <NavListItems items={items} />
      </Box>
    </Drawer>
  );
}

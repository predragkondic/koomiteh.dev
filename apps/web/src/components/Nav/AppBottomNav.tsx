import BottomNavigation from '@mui/material/BottomNavigation';
import BottomNavigationAction from '@mui/material/BottomNavigationAction';
import Paper from '@mui/material/Paper';
import LogoutIcon from '@mui/icons-material/Logout';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useGetMeQuery, useLogoutMutation } from '@/api/authApi';
import {
  buildNavItems,
  flattenNavItemsForMobile,
  getAppNavMode,
  type NavItem,
  type NavLabelNs,
} from './appNavConfig';

interface AppBottomNavProps {
  items?: NavItem[];
}

function useNavLabel() {
  const { t } = useTranslation();
  return (key: string, ns: NavLabelNs) =>
    ns === 'admin' ? t(`admin:${key}`) : t(key);
}

export function AppBottomNav({ items: itemsProp }: AppBottomNavProps) {
  const { pathname } = useLocation();
  const label = useNavLabel();
  const { data } = useGetMeQuery();
  const [logout, { isLoading: isLoggingOut }] = useLogoutMutation();
  const mode = getAppNavMode(pathname);
  const items = flattenNavItemsForMobile(
    itemsProp ?? buildNavItems(mode, data?.user),
  );

  if (items.length === 0) return null;

  const activeKey =
    items.find((item) => item.kind === 'link' && item.isActive(pathname))
      ?.key ?? false;

  return (
    <Paper
      elevation={8}
      sx={{
        display: { xs: 'block', md: 'none' },
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: (theme) => theme.zIndex.appBar,
        borderTop: 1,
        borderColor: 'divider',
      }}
    >
      <BottomNavigation value={activeKey} showLabels>
        {items.map((item) => {
          if (item.kind === 'logout') {
            return (
              <BottomNavigationAction
                key={item.key}
                label={label(item.labelKey, item.labelNs)}
                icon={<LogoutIcon />}
                disabled={isLoggingOut}
                onClick={() => logout()}
              />
            );
          }

          return (
            <BottomNavigationAction
              key={item.key}
              label={label(item.labelKey, item.labelNs)}
              value={item.key}
              component={RouterLink}
              to={item.to}
            />
          );
        })}
      </BottomNavigation>
    </Paper>
  );
}

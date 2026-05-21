import { Fragment, useState } from 'react';
import Collapse from '@mui/material/Collapse';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLogoutMutation } from '@/api/authApi';
import type { NavItem, NavLabelNs } from './appNavConfig';
import { navItemButtonSx, navSubmenuSx } from './navItemSx';

const SIDEBAR_WIDTH = 220;

export { SIDEBAR_WIDTH };

function useNavLabel() {
  const { t } = useTranslation();
  return (key: string, ns: NavLabelNs) =>
    ns === 'admin' ? t(`admin:${key}`) : t(key);
}

interface NavListItemsProps {
  items: NavItem[];
  dense?: boolean;
}

export function NavListItems({ items, dense = false }: NavListItemsProps) {
  const label = useNavLabel();
  const { pathname } = useLocation();
  const [logout, { isLoading: isLoggingOut }] = useLogoutMutation();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggleExpanded = (key: string) => {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <List dense={dense} disablePadding>
      {items.map((item) => {
        if (item.kind === 'logout') {
          return (
            <ListItemButton
              key={item.key}
              disabled={isLoggingOut}
              onClick={() => logout()}
              sx={navItemButtonSx(false)}
            >
              <ListItemText primary={label(item.labelKey, item.labelNs)} />
            </ListItemButton>
          );
        }

        const active = item.isActive(pathname);
        const hasChildren = Boolean(item.children?.length);
        const isOpen = expanded[item.key] ?? active;

        return (
          <Fragment key={item.key}>
            <ListItemButton
              component={RouterLink}
              to={item.to}
              selected={active}
              sx={navItemButtonSx(active)}
            >
              <ListItemText primary={label(item.labelKey, item.labelNs)} />
              {hasChildren ? (
                <IconButton
                  size="small"
                  aria-label={isOpen ? 'Collapse' : 'Expand'}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleExpanded(item.key);
                  }}
                  sx={{ borderRadius: 0 }}
                >
                  {isOpen ? (
                    <ExpandLess fontSize="small" />
                  ) : (
                    <ExpandMore fontSize="small" />
                  )}
                </IconButton>
              ) : null}
            </ListItemButton>
            {hasChildren && item.children ? (
              <Collapse in={isOpen} timeout="auto" unmountOnExit>
                <List disablePadding sx={navSubmenuSx()}>
                  {item.children.map((child) => {
                    const childActive = child.isActive(pathname);
                    return (
                      <ListItemButton
                        key={child.key}
                        component={RouterLink}
                        to={child.to}
                        selected={childActive}
                        sx={navItemButtonSx(childActive, true)}
                      >
                        <ListItemText
                          primary={label(child.labelKey, child.labelNs)}
                        />
                      </ListItemButton>
                    );
                  })}
                </List>
              </Collapse>
            ) : null}
          </Fragment>
        );
      })}
    </List>
  );
}

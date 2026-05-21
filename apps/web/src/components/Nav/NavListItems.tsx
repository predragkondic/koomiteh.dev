import { Fragment, useState } from "react";
import ChevronRightOutlined from "@mui/icons-material/ChevronRightOutlined";
import Box from "@mui/material/Box";
import Collapse from "@mui/material/Collapse";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import { Link as RouterLink, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useLogoutMutation } from "@/api/authApi";
import type { NavItem, NavLabelNs } from "./appNavConfig";
import { NavIcon } from "./navIcons";
import {
  NAV_RAIL_CHEVRON_SX,
  NAV_RAIL_SCROLL_SX,
  NAV_SUBMENU_SX,
} from "./navItemSx";

export const SIDEBAR_WIDTH = 240;

const NAV_COLLAPSED_STORAGE_KEY = "nav.collapsed";

function loadCollapsed(): Record<string, true> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(NAV_COLLAPSED_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    const result: Record<string, true> = {};
    for (const [key, value] of Object.entries(
      parsed as Record<string, unknown>,
    )) {
      if (value === true) result[key] = true;
    }
    return result;
  } catch {
    return {};
  }
}

function saveCollapsed(state: Record<string, true>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      NAV_COLLAPSED_STORAGE_KEY,
      JSON.stringify(state),
    );
  } catch {
    // ignore storage errors (private mode, quota, etc.)
  }
}

function useNavLabel() {
  const { t } = useTranslation(["common", "admin"]);
  return (key: string, ns: NavLabelNs) => t(`${ns}:${key}`);
}

interface NavListItemsProps {
  items: NavItem[];
}

export function NavListItems({ items }: NavListItemsProps) {
  const label = useNavLabel();
  const { pathname } = useLocation();
  const [logout, { isLoading: isLoggingOut }] = useLogoutMutation();
  const [collapsed, setCollapsed] =
    useState<Record<string, true>>(loadCollapsed);

  const toggleExpanded = (key: string) => {
    setCollapsed((prev) => {
      const next = { ...prev };
      if (next[key]) {
        delete next[key];
      } else {
        next[key] = true;
      }
      saveCollapsed(next);
      return next;
    });
  };

  const renderTrailing = (item: NavItem, isOpen: boolean) => {
    if (item.kind !== "link") return null;

    if (item.children?.length) {
      return (
        <IconButton
          size="small"
          aria-label={isOpen ? "Collapse" : "Expand"}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleExpanded(item.key);
          }}
          sx={{ p: 0, color: "inherit" }}
        >
          <ChevronRightOutlined sx={NAV_RAIL_CHEVRON_SX(isOpen)} />
        </IconButton>
      );
    }

    if (item.key === "admin") {
      return <ChevronRightOutlined sx={NAV_RAIL_CHEVRON_SX(false)} />;
    }

    return null;
  };

  const renderItem = (item: NavItem, nested = false) => {
    if (item.kind === "logout") {
      return (
        <ListItemButton
          key={item.key}
          disabled={isLoggingOut}
          onClick={() => logout()}
        >
          <ListItemIcon>
            <NavIcon navKey={item.key} />
          </ListItemIcon>
          <ListItemText primary={label(item.labelKey, item.labelNs)} />
        </ListItemButton>
      );
    }

    const active = item.isActive(pathname);
    const hasChildren = Boolean(item.children?.length);
    const isOpen = !collapsed[item.key];

    return (
      <Fragment key={item.key}>
        <ListItemButton component={RouterLink} to={item.to} selected={active}>
          <ListItemIcon>
            <NavIcon navKey={item.key} nested={nested} />
          </ListItemIcon>
          <ListItemText primary={label(item.labelKey, item.labelNs)} />
          {renderTrailing(item, isOpen)}
        </ListItemButton>
        {hasChildren && item.children ? (
          <Collapse in={isOpen} timeout="auto" unmountOnExit>
            <List
              disablePadding
              className="nav-rail--nested"
              sx={NAV_SUBMENU_SX}
            >
              {item.children.map((child) => {
                const childActive = child.isActive(pathname);
                return (
                  <ListItemButton
                    key={child.key}
                    component={RouterLink}
                    to={child.to}
                    selected={childActive}
                  >
                    <ListItemIcon>
                      <NavIcon navKey={child.key} nested />
                    </ListItemIcon>
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
  };

  return (
    <Box className="nav-rail" sx={NAV_RAIL_SCROLL_SX}>
      <List disablePadding className="nav-rail" component="nav">
        {items.map((item) => renderItem(item))}
      </List>
    </Box>
  );
}

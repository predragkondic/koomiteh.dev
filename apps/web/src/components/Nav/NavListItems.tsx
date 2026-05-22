import { Fragment, useEffect, useState } from "react";
import ChevronRightOutlined from "@mui/icons-material/ChevronRightOutlined";
import Box from "@mui/material/Box";
import Collapse from "@mui/material/Collapse";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Tooltip from "@mui/material/Tooltip";
import { Link as RouterLink, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useLogoutMutation } from "@/api/authApi";
import type { NavItem, NavLabelNs } from "./appNavConfig";
import { NavIcon } from "./navIcons";

const chevronClass = (open: boolean) =>
  `nav-rail-chevron${open ? " nav-rail-chevron--open" : ""}`;

export const SIDEBAR_WIDTH = 280;
export const SIDEBAR_COLLAPSED_WIDTH = 64;

function useNavLabel() {
  const { t } = useTranslation(["common", "admin"]);
  return (key: string, ns: NavLabelNs) => t(`${ns}:${key}`);
}

interface NavListItemsProps {
  items: NavItem[];
  collapsed?: boolean;
}

export function NavListItems({ items, collapsed = false }: NavListItemsProps) {
  const label = useNavLabel();
  const { pathname } = useLocation();
  const [logout, { isLoading: isLoggingOut }] = useLogoutMutation();
  const [overrides, setOverrides] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    setOverrides(new Set());
  }, [pathname]);

  const toggleOverride = (key: string) => {
    setOverrides((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const collapsedButtonSx = collapsed
    ? { justifyContent: "center", px: 1 }
    : undefined;
  const collapsedIconSx = collapsed
    ? { minWidth: 0, justifyContent: "center" }
    : undefined;

  const renderTrailing = (item: NavItem, isOpen: boolean) => {
    if (collapsed) return null;
    if (item.kind !== "link") return null;

    if (item.children?.length) {
      return (
        <IconButton
          size="small"
          aria-label={isOpen ? "Collapse" : "Expand"}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleOverride(item.key);
          }}
          sx={{ p: 0, color: "inherit" }}
        >
          <ChevronRightOutlined className={chevronClass(isOpen)} />
        </IconButton>
      );
    }

    if (item.key === "admin") {
      return <ChevronRightOutlined className={chevronClass(false)} />;
    }

    return null;
  };

  const wrapTooltip = (node: React.ReactElement, title: string) =>
    collapsed ? (
      <Tooltip title={title} placement="right">
        {node}
      </Tooltip>
    ) : (
      node
    );

  const renderItem = (item: NavItem, nested = false) => {
    if (item.kind === "logout") {
      const itemLabel = label(item.labelKey, item.labelNs);
      const button = (
        <ListItemButton
          disabled={isLoggingOut}
          onClick={() => logout()}
          sx={collapsedButtonSx}
        >
          <ListItemIcon sx={collapsedIconSx}>
            <NavIcon navKey={item.key} />
          </ListItemIcon>
          {!collapsed && <ListItemText primary={itemLabel} />}
        </ListItemButton>
      );
      return (
        <Fragment key={item.key}>
          {collapsed ? (
            <Tooltip title={itemLabel} placement="right">
              <span>{button}</span>
            </Tooltip>
          ) : (
            button
          )}
        </Fragment>
      );
    }

    const active = item.isActive(pathname);
    const hasChildren = Boolean(item.children?.length);
    const hasActiveChild = Boolean(
      item.children?.some((child) => child.isActive(pathname)),
    );
    const autoOpen = active || hasActiveChild;
    const isOpen = overrides.has(item.key) ? !autoOpen : autoOpen;
    const itemLabel = label(item.labelKey, item.labelNs);

    const button = (
      <ListItemButton
        component={RouterLink}
        to={item.to}
        selected={active}
        sx={collapsedButtonSx}
      >
        <ListItemIcon sx={collapsedIconSx}>
          <NavIcon navKey={item.key} nested={nested} />
        </ListItemIcon>
        {!collapsed && <ListItemText primary={itemLabel} />}
        {renderTrailing(item, isOpen)}
      </ListItemButton>
    );

    return (
      <Fragment key={item.key}>
        {wrapTooltip(button, itemLabel)}
        {!collapsed && hasChildren && item.children ? (
          <Collapse in={isOpen} timeout="auto" unmountOnExit>
            <List disablePadding className="nav-rail--nested">
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
    <Box
      className={`nav-rail${collapsed ? " nav-rail--collapsed" : ""}`}
    >
      <List disablePadding component="nav">
        {items.map((item) => renderItem(item))}
      </List>
    </Box>
  );
}

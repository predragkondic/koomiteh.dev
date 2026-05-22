import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import MenuOpen from "@mui/icons-material/MenuOpen";
import Menu from "@mui/icons-material/Menu";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useGetMeQuery } from "@/api/authApi";
import { buildNavItems, getAppNavMode } from "./appNavConfig";
import {
  NavListItems,
  SIDEBAR_COLLAPSED_WIDTH,
  SIDEBAR_WIDTH,
} from "./NavListItems";
import { Divider, Stack } from "@mui/material";
import { LanguageToggle } from "../LanguageToggle";
import { ThemeToggle } from "../ThemeToggle";

export interface AppSidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

const SIDEBAR_COLLAPSED_STORAGE_KEY = "nav.sidebar.collapsed";

function loadCollapsed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function saveCollapsed(collapsed: boolean) {
  if (typeof window === "undefined") return;
  try {
    if (collapsed) {
      window.localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, "1");
    } else {
      window.localStorage.removeItem(SIDEBAR_COLLAPSED_STORAGE_KEY);
    }
  } catch {
    // ignore storage errors (private mode, quota, etc.)
  }
}

export function AppSidebar({
  mobileOpen = false,
  onMobileClose,
}: AppSidebarProps = {}) {
  const { pathname } = useLocation();
  const { data } = useGetMeQuery();
  const { t } = useTranslation();
  const mode = getAppNavMode(pathname);
  const items = buildNavItems(mode, data?.user);
  const [collapsed, setCollapsed] = useState<boolean>(loadCollapsed);

  useEffect(() => {
    if (mobileOpen) onMobileClose?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const toggle = () => {
    setCollapsed((prev) => {
      const next = !prev;
      saveCollapsed(next);
      return next;
    });
  };

  const width = collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH;
  const toggleLabel = collapsed
    ? t("nav.expandSidebar")
    : t("nav.collapseSidebar");
  const closeLabel = t("nav.menuLabel");

  const renderContent = (variant: "permanent" | "temporary") => {
    const isMobile = variant === "temporary";
    const isCollapsed = isMobile ? false : collapsed;
    const handleClick = isMobile ? onMobileClose : toggle;
    const label = isMobile ? closeLabel : toggleLabel;
    return (
      <>
        <Stack
          direction={"row"}
          sx={{
            justifyContent: isCollapsed ? "center" : "space-between",
            alignItems: "center",
            pt: 2,
            pb: 1,
            pr: isCollapsed ? 0 : 2
          }}>
          {!isCollapsed && (
            <Box>
              <LanguageToggle />
              <ThemeToggle />
            </Box>
          )}
          <Box>
            <Tooltip title={label} placement="right">
              <IconButton
                size="small"
                onClick={handleClick}
                aria-label={label}
                aria-expanded={isMobile ? mobileOpen : !collapsed}
                sx={{
                  color: "text.secondary",
                  "&:hover": {
                    color: "text.primary",
                    backgroundColor: "transparent",
                  },
                }}
              >
                {isCollapsed ? <Menu /> : <MenuOpen />}
              </IconButton>
            </Tooltip>
          </Box>
        </Stack>
        <Divider />
        <NavListItems items={items} collapsed={isCollapsed} />
      </>
    );
  };

  return (
    <>
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: "none", md: "block" },
          width,
          flexShrink: 0,
          overflow: "hidden",
          transition: (theme) =>
            theme.transitions.create("width", {
              duration: theme.transitions.duration.shorter,
            }),
          "& .MuiDrawer-paper": {
            width,
            boxSizing: "border-box",
            position: "relative",
            borderRight: 1,
            borderColor: "divider",
            bgcolor: "background.default",
            pl: collapsed ? 0 : 4,
            display: "flex",
            flexDirection: "column",
            overflowX: "hidden",
            transition: (theme) =>
              theme.transitions.create(["width", "padding-left"], {
                duration: theme.transitions.duration.shorter,
              }),
          },
        }}
      >
        {renderContent("permanent")}
      </Drawer>
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onMobileClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: "block", md: "none" },
          "& .MuiDrawer-paper": {
            width: SIDEBAR_WIDTH,
            boxSizing: "border-box",
            bgcolor: "background.default",
            pl: 4,
            display: "flex",
            flexDirection: "column",
          },
        }}
      >
        {renderContent("temporary")}
      </Drawer>
    </>
  );
}

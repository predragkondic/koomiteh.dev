import { useEffect, useState } from "react";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Toolbar from "@mui/material/Toolbar";
import { Link as RouterLink, Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CommandPalette } from "@/features/interview/CommandPalette";
import logoUrl from "@/assets/koomiteh-logo.svg";
import logoFilledUrl from "@/assets/koomiteh-logo-filled.svg";
import { LanguageToggle } from "./LanguageToggle";
import { ThemeToggle } from "./ThemeToggle";
import { AuthMenu } from "./AuthMenu";
import { SearchTrigger } from "./SearchTrigger";
import { MobileToolbar } from "./MobileToolbar";
import { useThemeMode } from "@/theme/ThemeContext";
import { AppSidebar } from "./Nav/AppSidebar";
import { AppBottomNav } from "./Nav/AppBottomNav";
import { Button } from "@mui/material";
import { useGetMeQuery } from "@/api/authApi";
import { isStaffRole } from "@/lib/userRole";

const BOTTOM_NAV_HEIGHT = 56;

export function AppShell() {
  const { t } = useTranslation();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const { mode } = useThemeMode();
  const { data: me } = useGetMeQuery();
  const isAdmin = isStaffRole(me?.user?.role);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((p) => !p);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <AppBar position="sticky" color="default" elevation={0}>
        <Toolbar sx={{ gap: 2, maxWidth: 1220, m: "0 auto", width: "100%" }}>
          <Box
            sx={{
              display: { xs: "none", md: "flex" },
              alignItems: "center",
              gap: 2,
              width: "100%",
            }}
          >
            <Box
              component={RouterLink}
              to="/"
              sx={{
                display: "inline-flex",
                alignItems: "center",
                textDecoration: "none",
                color: "inherit",
                p: 2,
              }}
            >
              <Box
                component="img"
                src={mode === "dark" ? logoFilledUrl : logoUrl}
                alt={t("appName")}
                sx={{ height: 54, display: "block" }}
              />
            </Box>
            <Box sx={{ flex: 1 }} />{" "}
            {isAdmin && (
              <Button
                component={RouterLink}
                to="/admin"
                size="small"
                color="inherit"
                sx={{ textTransform: "none" }}
              >
                {t("admin:title")}
              </Button>
            )}
            <SearchTrigger
              onClick={() => setPaletteOpen(true)}
              withShortcutHint
            />
            <LanguageToggle />
            <ThemeToggle />
            <AuthMenu />
          </Box>
          <Box sx={{ display: { xs: "flex", md: "none" }, width: "100%" }}>
            <MobileToolbar setPaletteOpen={setPaletteOpen} />
          </Box>
        </Toolbar>
      </AppBar>
      <Box sx={{ display: "flex", flex: 1, minHeight: 0 }}>
        <AppSidebar />
        <Box
          component="main"
          sx={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            pb: {
              xs: `${BOTTOM_NAV_HEIGHT}px`,
              md: 0,
            },
          }}
        >
          <Container sx={{ py: 4, flex: 1, maxWidth: 1220 }}>
            <Outlet />
          </Container>
        </Box>
      </Box>
      <AppBottomNav />
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
      />
    </Box>
  );
}

export { BOTTOM_NAV_HEIGHT };

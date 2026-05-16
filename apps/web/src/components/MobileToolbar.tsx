import {
  useState,
  type Dispatch,
  type MouseEvent,
  type SetStateAction,
} from "react";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import MenuIcon from "@mui/icons-material/Menu";
import { Link as RouterLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { loginUrl, useGetMeQuery, useLogoutMutation } from "@/api/authApi";
import logoUrl from "@/assets/koomiteh-logo.svg";
import { LanguageToggle } from "./LanguageToggle";
import { SearchTrigger } from "./SearchTrigger";
import { ThemeToggle } from "./ThemeToggle";

export interface MobileToolbarProps {
  setPaletteOpen: Dispatch<SetStateAction<boolean>>;
}

export function MobileToolbar({ setPaletteOpen }: MobileToolbarProps) {
  const { t } = useTranslation();
  const { data } = useGetMeQuery();
  const user = data?.user;
  const isAdmin = user?.role === "admin";
  const [logout, { isLoading: isLoggingOut }] = useLogoutMutation();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  const handleOpen = (e: MouseEvent<HTMLElement>) => setAnchor(e.currentTarget);
  const handleClose = () => setAnchor(null);
  const handleLogout = async () => {
    handleClose();
    await logout();
  };

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, width: "100%" }}>
      <Box
        component={RouterLink}
        to="/"
        sx={{
          display: "inline-flex",
          alignItems: "center",
          textDecoration: "none",
          color: "inherit",
        }}
      >
        <Box
          component="img"
          src={logoUrl}
          alt={t("appName")}
          sx={{ height: 28, width: "auto", display: "block" }}
        />
      </Box>
      <Box sx={{ flex: 1 }} />
      <SearchTrigger onClick={() => setPaletteOpen(true)} />
      <IconButton
        size="small"
        color="inherit"
        onClick={handleOpen}
        aria-label={t("nav.menuLabel")}
        aria-haspopup="menu"
        aria-expanded={Boolean(anchor)}
      >
        <MenuIcon fontSize="small" />
      </IconButton>
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        {user && (
          <MenuItem
            component={RouterLink}
            to="/me/favorites"
            onClick={handleClose}
          >
            <ListItemText>{t("favorites.navLabel")}</ListItemText>
          </MenuItem>
        )}
        {isAdmin && (
          <MenuItem component={RouterLink} to="/admin" onClick={handleClose}>
            <ListItemText>{t("admin:title")}</ListItemText>
          </MenuItem>
        )}
        <Divider />
        <MenuItem
          disableRipple
          onClick={(e) => e.stopPropagation()}
          sx={{ display: "flex", gap: 1, justifyContent: "space-between" }}
        >
          <LanguageToggle />
          <ThemeToggle />
        </MenuItem>
        <Divider />
        {user ? (
          <MenuItem onClick={handleLogout} disabled={isLoggingOut}>
            <ListItemText>{t("auth.logout")}</ListItemText>
          </MenuItem>
        ) : (
          <MenuItem component="a" href={loginUrl()} onClick={handleClose}>
            <ListItemText>{t("auth.login")}</ListItemText>
          </MenuItem>
        )}
      </Menu>
    </Box>
  );
}

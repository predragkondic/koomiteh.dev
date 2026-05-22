import type { ReactElement } from "react";
import Box from "@mui/material/Box";
import ArrowBackOutlined from "@mui/icons-material/ArrowBackOutlined";
import LogoutOutlined from "@mui/icons-material/LogoutOutlined";
import ManageAccounts from "@mui/icons-material/ManageAccounts";
import PersonOutlineOutlined from "@mui/icons-material/PersonOutlineOutlined";
import SettingsOutlined from "@mui/icons-material/SettingsOutlined";
import ShieldOutlined from "@mui/icons-material/ShieldOutlined";
import StarBorderOutlined from "@mui/icons-material/StarBorderOutlined";
import MenuBookIcon from "@mui/icons-material/MenuBook";

const NAV_ICONS: Record<string, ReactElement> = {
  posts: <MenuBookIcon />,
  profile: <PersonOutlineOutlined />,
  favorites: <StarBorderOutlined />,
  settings: <SettingsOutlined />,
  admin: <ShieldOutlined />,
  users: <ManageAccounts />,
  exit: <ArrowBackOutlined />,
  logout: <LogoutOutlined />,
};

export function NavIcon({
  navKey,
  nested = false,
}: {
  navKey: string;
  nested?: boolean;
}) {
  const icon = NAV_ICONS[navKey];
  if (!icon) return null;
  const size = nested ? 22 : 24;
  return (
    <Box
      sx={{
        width: size,
        height: size,
        display: "grid",
        placeItems: "center",
        color: "inherit",
        "& svg": { fontSize: size },
      }}
    >
      {icon}
    </Box>
  );
}

/** Bottom nav: default MUI icon sizing. */
export function getNavIcon(key: string): ReactElement | null {
  return NAV_ICONS[key] ?? null;
}

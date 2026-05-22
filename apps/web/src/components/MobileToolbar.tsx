import type { Dispatch, SetStateAction } from "react";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";

import MenuIcon from "@mui/icons-material/Menu";
import { useTranslation } from "react-i18next";
import logoUrl from "@/assets/koomiteh-logo-filled.svg";
import { SearchTrigger } from "./SearchTrigger";
import Stack from "@mui/material/Stack";

export interface MobileToolbarProps {
  setPaletteOpen: Dispatch<SetStateAction<boolean>>;
  onOpenNav: () => void;
}

export function MobileToolbar({
  setPaletteOpen,
  onOpenNav,
}: MobileToolbarProps) {
  const { t } = useTranslation();

  return (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      width="100%"
    >
      <Box>
        <IconButton
          size="small"
          color="inherit"
          onClick={onOpenNav}
          aria-label={t("nav.menuLabel")}
          aria-haspopup="menu"
        >
          <MenuIcon fontSize="small" />
        </IconButton>
        <SearchTrigger onClick={() => setPaletteOpen(true)} />
      </Box>
      <Box
        component="img"
        src={logoUrl}
        alt={t("appName")}
        sx={{ height: 42, display: "block", mr: 3 }}
      />
    </Stack>
  );
}

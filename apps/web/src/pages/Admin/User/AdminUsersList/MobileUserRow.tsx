import { type MouseEvent } from "react";
import { Link as RouterLink } from "react-router-dom";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { useTranslation } from "react-i18next";
import type { AdminUserListItem } from "@/api/adminApi";

interface MobileUserRowProps {
  user: AdminUserListItem;
  locale: string;
  menuOpen: boolean;
  onOpenMenu: (el: HTMLElement) => void;
}

export function MobileUserRow({
  user,
  locale,
  menuOpen,
  onOpenMenu,
}: MobileUserRowProps) {
  const { t } = useTranslation("admin");
  const isSuspended = user.suspendedAt !== null;
  const memberSince = new Intl.DateTimeFormat(locale).format(
    new Date(user.createdAt),
  );

  const handleKebab = (e: MouseEvent<HTMLElement>) => {
    onOpenMenu(e.currentTarget);
  };

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        px: 2,
        py: "14px",
        borderBottom: 1,
        borderColor: "divider",
        backgroundColor: menuOpen ? "action.hover" : "transparent",
        opacity: isSuspended ? 0.7 : 1,
      }}
    >
      <Avatar
        src={user.avatarUrl ?? undefined}
        alt={user.displayName}
        sx={{ width: 32, height: 32, flexShrink: 0 }}
      >
        {user.displayName.slice(0, 1).toUpperCase()}
      </Avatar>
      <Box
        component={RouterLink}
        to={`/users/${user.id}`}
        sx={{
          flex: 1,
          minWidth: 0,
          textDecoration: "none",
          color: "inherit",
        }}
      >
        <Typography
          variant="body1"
          sx={{
            fontWeight: 500,
            lineHeight: 1.35,
            color: "text.primary",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {user.displayName}
        </Typography>
        <Stack
          direction="row"
          spacing={1}
          sx={{
            alignItems: "center",
            mt: "4px",
            color: "text.disabled",
          }}
        >
          <Typography variant="caption">
            <Box component="span">{t(`users.roles.${user.role}`)}</Box>
            <Box component="span" sx={{ opacity: 0.5 }}>
              ·
            </Box>
            <Box component="span">{memberSince}</Box>
            {isSuspended && (
              <>
                <Box component="span" sx={{ opacity: 0.5 }}>
                  ·
                </Box>
                <Box component="span" sx={{ color: "error.main" }}>
                  {t("users.statusSuspended")}
                </Box>
              </>
            )}
          </Typography>
        </Stack>
      </Box>
      <IconButton
        onClick={handleKebab}
        aria-label={t("users.a11y.actions")}
        sx={{
          width: 28,
          height: 28,
          mt: 0,
          p: 0,
          color: "text.secondary",
          borderRadius: 1,
        }}
      >
        <MoreVertIcon />
      </IconButton>
    </Box>
  );
}

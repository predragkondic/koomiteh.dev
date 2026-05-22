import Chip from "@mui/material/Chip";
import { useTranslation } from "react-i18next";
import type { AdminUserRole } from "@/api/adminApi";

export function RoleChip({ role }: { role: AdminUserRole }) {
  const { t } = useTranslation("admin");
  const palette: Record<AdminUserRole, { bg: string; fg: string }> = {
    user: { bg: "surface.elevated", fg: "text.secondary" },
    admin: { bg: "primary.main", fg: "primary.contrastText" },
    superadmin: { bg: "secondary.main", fg: "secondary.contrastText" },
  };
  const { bg, fg } = palette[role];
  return (
    <Chip
      size="small"
      label={t(`users.roles.${role}`)}
      sx={{
        fontWeight: 500,
        backgroundColor: bg,
        color: fg,
      }}
    />
  );
}

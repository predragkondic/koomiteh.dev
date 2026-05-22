import { Link as RouterLink } from "react-router-dom";
import Avatar from "@mui/material/Avatar";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import TableCell from "@mui/material/TableCell";
import TableRow from "@mui/material/TableRow";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import BlockIcon from "@mui/icons-material/Block";
import CheckCircleIcon from "@mui/icons-material/CheckCircleOutlined";
import VisibilityIcon from "@mui/icons-material/VisibilityOutlined";
import { useTranslation } from "react-i18next";
import type { AdminUserListItem } from "@/api/adminApi";
import { RoleChip } from "./RoleChip";
import { StatusChip } from "../../../components/StatusChip";

interface UserRowProps {
  row: AdminUserListItem;
  locale: string;
  canAct: boolean;
  busySuspend: boolean;
  busyUnsuspend: boolean;
  onSuspend: () => void;
  onUnsuspend: () => void;
}

export function UserRow({
  row,
  locale,
  canAct,
  busySuspend,
  busyUnsuspend,
  onSuspend,
  onUnsuspend,
}: UserRowProps) {
  const { t } = useTranslation("admin");
  const isSuspended = row.suspendedAt !== null;
  const memberSince = new Intl.DateTimeFormat(locale).format(
    new Date(row.createdAt),
  );

  return (
    <TableRow
      hover
      sx={isSuspended ? { backgroundColor: "action.hover" } : undefined}
    >
      <TableCell>
        <Stack
          direction="row"
          spacing={1.5}
          sx={{
            alignItems: "center",
          }}
        >
          <Avatar
            src={row.avatarUrl ?? undefined}
            alt={row.displayName}
            sx={{ width: 28, height: 28 }}
          >
            {row.displayName.slice(0, 1).toUpperCase()}
          </Avatar>
          <Typography
            variant="body1"
            sx={{
              fontWeight: 500,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              ...(isSuspended && { color: "text.disabled" }),
            }}
            title={row.displayName}
          >
            {row.displayName}
          </Typography>
        </Stack>
      </TableCell>
      <TableCell>
        <RoleChip role={row.role} />
      </TableCell>
      <TableCell>
        <StatusChip
          variant={isSuspended ? "suspended" : "active"}
          labelKey={
            isSuspended ? "users.statusSuspended" : "users.statusActive"
          }
        />
      </TableCell>
      <TableCell>
        <Typography
          variant="body2"
          sx={{
            color: isSuspended ? "text.disabled" : "text.secondary",
            whiteSpace: "nowrap",
          }}
        >
          {memberSince}
        </Typography>
      </TableCell>
      <TableCell align="right">
        <Stack
          direction="row"
          spacing={0.25}
          sx={{
            display: "inline-flex",
            p: "2px",
            border: 1,
            borderColor: "transparent",
            borderRadius: 1,
          }}
        >
          <Tooltip title={t("users.actions.viewProfile")}>
            <span>
              <IconButton
                size="small"
                component={RouterLink}
                to={`/users/${row.id}`}
                aria-label={t("users.actions.viewProfile")}
              >
                <VisibilityIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          {isSuspended ? (
            <Tooltip
              title={
                canAct
                  ? t("users.actions.unsuspend")
                  : t("users.actionDisabled")
              }
            >
              <span>
                <IconButton
                  size="small"
                  color="success"
                  onClick={onUnsuspend}
                  disabled={!canAct || busyUnsuspend}
                  aria-label={t("users.actions.unsuspend")}
                >
                  {busyUnsuspend ? (
                    <CircularProgress size={14} />
                  ) : (
                    <CheckCircleIcon fontSize="small" />
                  )}
                </IconButton>
              </span>
            </Tooltip>
          ) : (
            <Tooltip
              title={
                canAct ? t("users.actions.suspend") : t("users.actionDisabled")
              }
            >
              <span>
                <IconButton
                  size="small"
                  color="error"
                  onClick={onSuspend}
                  disabled={!canAct || busySuspend}
                  aria-label={t("users.actions.suspend")}
                >
                  {busySuspend ? (
                    <CircularProgress size={14} />
                  ) : (
                    <BlockIcon fontSize="small" />
                  )}
                </IconButton>
              </span>
            </Tooltip>
          )}
        </Stack>
      </TableCell>
    </TableRow>
  );
}

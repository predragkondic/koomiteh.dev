import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Skeleton from "@mui/material/Skeleton";
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import BlockIcon from "@mui/icons-material/Block";
import CheckCircleIcon from "@mui/icons-material/CheckCircleOutlined";
import VisibilityIcon from "@mui/icons-material/VisibilityOutlined";
import { useTranslation } from "react-i18next";
import {
  useListAdminUsersQuery,
  useSuspendAdminUserMutation,
  useUnsuspendAdminUserMutation,
  type AdminUserListItem,
  type AdminUserRole,
} from "@/api/adminApi";
import { useGetMeQuery } from "@/api/authApi";
import { useConfirm } from "@/components/ConfirmProvider";
import DefaultPage from "../../../Layout/DefaultPage";
import { DesktopView } from "./DesktopView";
import { MobileUserRow } from "./MobileUserRow";
import { canActOn } from "./helpers";

export default function AdminUsersListPage() {
  const { t, i18n } = useTranslation("admin");
  const confirm = useConfirm();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const navigate = useNavigate();
  const locale = i18n.resolvedLanguage ?? i18n.language;

  const { data: me } = useGetMeQuery();
  const actor = me?.user
    ? { id: me.user.id, role: me.user.role as AdminUserRole }
    : undefined;

  const { data, isLoading, error, refetch } = useListAdminUsersQuery();
  const [suspend, suspendState] = useSuspendAdminUserMutation();
  const [unsuspend, unsuspendState] = useUnsuspendAdminUserMutation();

  const [menu, setMenu] = useState<{
    anchorEl: HTMLElement;
    userId: string;
  } | null>(null);
  const openMenu = (userId: string, el: HTMLElement) =>
    setMenu({ anchorEl: el, userId });
  const closeMenu = () => setMenu(null);

  const activeUser = menu
    ? data?.items.find((u) => u.id === menu.userId)
    : undefined;

  async function handleSuspend(target: AdminUserListItem) {
    const ok = await confirm({
      title: t("users.confirmSuspend.title"),
      content: t("users.confirmSuspend.content"),
      confirmLabel: t("users.confirmSuspend.confirmLabel"),
      variant: "destructive",
    });
    if (!ok) return;
    await suspend(target.id)
      .unwrap()
      .catch(() => null);
  }

  async function handleUnsuspend(target: AdminUserListItem) {
    await unsuspend(target.id)
      .unwrap()
      .catch(() => null);
  }

  if (isMobile) {
    return (
      <DefaultPage titleKey="users.title" titleNs="admin">
        <MobileView
          items={data?.items ?? null}
          isLoading={isLoading}
          error={Boolean(error)}
          onRetry={() => refetch()}
          locale={locale}
          actor={actor}
          menu={menu}
          onOpenMenu={openMenu}
          onCloseMenu={closeMenu}
          activeUser={activeUser}
          onView={(target) => {
            closeMenu();
            navigate(`/users/${target.id}`);
          }}
          onSuspend={async (target) => {
            closeMenu();
            await handleSuspend(target);
          }}
          onUnsuspend={async (target) => {
            closeMenu();
            await handleUnsuspend(target);
          }}
        />
      </DefaultPage>
    );
  }

  return (
    <DesktopView
      data={data}
      isLoading={isLoading}
      error={Boolean(error)}
      onRetry={() => refetch()}
      locale={locale}
      actor={actor}
      onSuspend={handleSuspend}
      onUnsuspend={handleUnsuspend}
      isBusySuspend={(id) =>
        suspendState.isLoading && suspendState.originalArgs === id
      }
      isBusyUnsuspend={(id) =>
        unsuspendState.isLoading && unsuspendState.originalArgs === id
      }
    />
  );
}

interface MobileViewProps {
  items: AdminUserListItem[] | null;
  isLoading: boolean;
  error: boolean;
  onRetry: () => void;
  locale: string;
  actor: { id: string; role: AdminUserRole } | undefined;
  menu: { anchorEl: HTMLElement; userId: string } | null;
  onOpenMenu: (userId: string, el: HTMLElement) => void;
  onCloseMenu: () => void;
  activeUser: AdminUserListItem | undefined;
  onView: (target: AdminUserListItem) => void;
  onSuspend: (target: AdminUserListItem) => void;
  onUnsuspend: (target: AdminUserListItem) => void;
}

function MobileView({
  items,
  isLoading,
  error,
  onRetry,
  locale,
  actor,
  menu,
  onOpenMenu,
  onCloseMenu,
  activeUser,
  onView,
  onSuspend,
  onUnsuspend,
}: MobileViewProps) {
  const { t } = useTranslation("admin");
  const activeIsSuspended =
    activeUser !== undefined && activeUser.suspendedAt !== null;
  const activeCanAct = activeUser ? canActOn(actor, activeUser) : false;

  return (
    <Box>
      {isLoading && (
        <Box
          sx={{ borderTop: 1, borderColor: "divider" }}
          aria-busy
          aria-label={t("users.loading")}
        >
          {Array.from({ length: 4 }).map((_, i) => (
            <Box
              key={i}
              sx={{
                display: "flex",
                alignItems: "flex-start",
                gap: "12px",
                px: 2,
                py: "14px",
                borderBottom: 1,
                borderColor: "divider",
              }}
            >
              <Skeleton variant="circular" width={32} height={32} />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Skeleton variant="text" width="60%" height={18} />
                <Skeleton variant="text" width="35%" height={14} />
              </Box>
            </Box>
          ))}
        </Box>
      )}
      {error && (
        <Box sx={{ px: 2, py: 2 }}>
          <Alert
            severity="error"
            action={
              <Button color="inherit" size="small" onClick={onRetry}>
                {t("common:actions.retry")}
              </Button>
            }
          >
            {t("users.loadError")}
          </Alert>
        </Box>
      )}
      {items && items.length === 0 && (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            py: 6,
            borderTop: 1,
            borderColor: "divider",
          }}
        >
          <Typography
            variant="body2"
            sx={{
              color: "text.secondary",
            }}
          >
            {t("users.empty")}
          </Typography>
        </Box>
      )}
      {items && items.length > 0 && (
        <Box sx={{ borderTop: 1, borderColor: "divider" }}>
          {items.map((user) => (
            <MobileUserRow
              key={user.id}
              user={user}
              locale={locale}
              menuOpen={menu?.userId === user.id}
              onOpenMenu={(el) => onOpenMenu(user.id, el)}
            />
          ))}
        </Box>
      )}
      <Menu
        anchorEl={menu?.anchorEl ?? null}
        open={Boolean(menu)}
        onClose={onCloseMenu}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <MenuItem
          onClick={() => activeUser && onView(activeUser)}
          sx={{ gap: "10px" }}
        >
          <VisibilityIcon sx={{ fontSize: "medium" }} />
          {t("users.actions.viewProfile")}
        </MenuItem>
        <Divider sx={{ my: "4px" }} />
        {activeIsSuspended ? (
          <MenuItem
            disabled={!activeCanAct}
            onClick={() => activeUser && onUnsuspend(activeUser)}
            sx={{ gap: "10px", color: "success.main" }}
          >
            <CheckCircleIcon sx={{ fontSize: "medium" }} />
            {t("users.actions.unsuspend")}
          </MenuItem>
        ) : (
          <MenuItem
            disabled={!activeCanAct}
            onClick={() => activeUser && onSuspend(activeUser)}
            sx={{ gap: "10px", color: "error.main" }}
          >
            <BlockIcon sx={{ fontSize: "medium" }} />
            {t("users.actions.suspend")}
          </MenuItem>
        )}
      </Menu>
    </Box>
  );
}

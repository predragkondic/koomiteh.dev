import { useMemo, useState, type MouseEvent } from "react";
import {
  Link as RouterLink,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import Alert from "@mui/material/Alert";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Pagination from "@mui/material/Pagination";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TableSortLabel from "@mui/material/TableSortLabel";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import BlockIcon from "@mui/icons-material/Block";
import CheckCircleIcon from "@mui/icons-material/CheckCircleOutlined";
import MoreVertIcon from "@mui/icons-material/MoreVert";
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
import DefaultPage from "./Layout/DefaultPage";

type SortKey = "displayName" | "role" | "memberSince" | "status";
type SortDir = "asc" | "desc";

const SORT_KEYS: ReadonlyArray<SortKey> = [
  "displayName",
  "role",
  "memberSince",
  "status",
];

const PAGE_SIZE = 10;

function isSortKey(v: string | null): v is SortKey {
  return v !== null && (SORT_KEYS as readonly string[]).includes(v);
}

function userStatus(row: AdminUserListItem): "active" | "suspended" {
  return row.suspendedAt !== null ? "suspended" : "active";
}

function compareRows(a: AdminUserListItem, b: AdminUserListItem, key: SortKey) {
  if (key === "memberSince") {
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  }
  const av =
    key === "status"
      ? userStatus(a)
      : key === "displayName"
        ? a.displayName
        : a.role;
  const bv =
    key === "status"
      ? userStatus(b)
      : key === "displayName"
        ? b.displayName
        : b.role;
  return av.localeCompare(bv, undefined, { sensitivity: "base" });
}

function canActOn(
  actor: { id: string; role: AdminUserRole | undefined } | undefined,
  target: AdminUserListItem,
): boolean {
  if (!actor || !actor.role) return false;
  if (actor.id === target.id) return false;
  if (actor.role === "admin") return target.role === "user";
  if (actor.role === "superadmin") {
    return target.role === "user" || target.role === "admin";
  }
  return false;
}

export function AdminUsersListPage() {
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

interface DesktopViewProps {
  data: { items: AdminUserListItem[] } | undefined;
  isLoading: boolean;
  error: boolean;
  onRetry: () => void;
  locale: string;
  actor: { id: string; role: AdminUserRole } | undefined;
  onSuspend: (target: AdminUserListItem) => void;
  onUnsuspend: (target: AdminUserListItem) => void;
  isBusySuspend: (id: string) => boolean;
  isBusyUnsuspend: (id: string) => boolean;
}

function DesktopView({
  data,
  isLoading,
  error,
  onRetry,
  locale,
  actor,
  onSuspend,
  onUnsuspend,
  isBusySuspend,
  isBusyUnsuspend,
}: DesktopViewProps) {
  const { t } = useTranslation("admin");
  const [searchParams, setSearchParams] = useSearchParams();

  const sortKey: SortKey = (() => {
    const raw = searchParams.get("sort");
    return isSortKey(raw) ? raw : "memberSince";
  })();
  const sortDir: SortDir = searchParams.get("dir") === "asc" ? "asc" : "desc";
  const [page, setPage] = useState(1);

  function setSort(key: SortKey, nextDir: SortDir | null) {
    const next = new URLSearchParams(searchParams);
    if (nextDir === null) {
      next.delete("sort");
      next.delete("dir");
    } else {
      next.set("sort", key);
      next.set("dir", nextDir);
    }
    setSearchParams(next, { replace: true });
    setPage(1);
  }

  function cycleSort(key: SortKey) {
    if (sortKey !== key) return setSort(key, "asc");
    if (sortDir === "asc") return setSort(key, "desc");
    return setSort(key, null);
  }

  const items = data?.items ?? [];
  const sortedItems = useMemo(() => {
    const sign = sortDir === "asc" ? 1 : -1;
    return [...items].sort((a, b) => sign * compareRows(a, b, sortKey));
  }, [items, sortKey, sortDir]);

  const totalShown = sortedItems.length;
  const totalAll = items.length;
  const pageCount = Math.max(1, Math.ceil(totalShown / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageItems = sortedItems.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  return (
    <DefaultPage titleKey="users.title" titleNs="admin">
      {error && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
          action={
            <Button color="inherit" size="small" onClick={onRetry}>
              {t("common:actions.retry")}
            </Button>
          }
        >
          {t("users.loadError")}
        </Alert>
      )}
      <Card variant="outlined" sx={{ overflow: "hidden" }}>
        <Table sx={{ tableLayout: "fixed" }}>
          <colgroup>
            <col />
            <col style={{ width: 130 }} />
            <col style={{ width: 130 }} />
            <col style={{ width: 130 }} />
            <col style={{ width: 140 }} />
          </colgroup>
          <TableHead>
            <TableRow sx={{ backgroundColor: "surface.elevated" }}>
              {(
                [
                  ["displayName", t("users.columns.user")],
                  ["role", t("users.columns.role")],
                  ["status", t("users.columns.status")],
                  ["memberSince", t("users.columns.memberSince")],
                ] as Array<[SortKey, string]>
              ).map(([key, label]) => (
                <TableCell key={key}>
                  <TableSortLabel
                    active={sortKey === key}
                    direction={sortKey === key ? sortDir : "asc"}
                    onClick={() => cycleSort(key)}
                    aria-label={t("users.a11y.sortBy", { column: label })}
                    sx={{
                      color: "text.secondary",
                      "&:hover": { color: "text.primary" },
                      "&.Mui-active:hover": { color: "primary.main" },
                      "& .MuiTableSortLabel-icon": {
                        color: "inherit !important",
                      },
                    }}
                  >
                    {label}
                  </TableSortLabel>
                </TableCell>
              ))}
              <TableCell align="right" sx={{ textAlign: "center" }}>
                {t("users.columns.actions")}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading &&
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={`sk-${i}`}>
                  {Array.from({ length: 5 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton variant="text" height={22} />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            {!isLoading && pageItems.length === 0 && (
              <TableRow>
                <TableCell colSpan={5}>
                  <Stack
                    sx={{
                      alignItems: "center",
                      py: 14,
                      gap: 1,
                      color: "text.disabled",
                      fontSize: 13.5
                    }}>
                    <Typography variant="body2">{t("users.empty")}</Typography>
                  </Stack>
                </TableCell>
              </TableRow>
            )}
            {!isLoading &&
              pageItems.map((row) => (
                <UserRow
                  key={row.id}
                  row={row}
                  locale={locale}
                  canAct={canActOn(actor, row)}
                  busySuspend={isBusySuspend(row.id)}
                  busyUnsuspend={isBusyUnsuspend(row.id)}
                  onSuspend={() => onSuspend(row)}
                  onUnsuspend={() => onUnsuspend(row)}
                />
              ))}
          </TableBody>
        </Table>

        <Stack
          direction="row"
          sx={{
            alignItems: "center",
            justifyContent: "space-between",
            px: 4,
            py: 3,
            borderTop: 1,
            borderColor: "divider",
            bgcolor: "surface.elevated"
          }}>
          <Typography variant="body2" sx={{
            color: "text.disabled"
          }}>
            {t("users.pager.info", { shown: totalShown, total: totalAll })}
          </Typography>
          {pageCount > 1 && (
            <Pagination
              size="small"
              shape="rounded"
              count={pageCount}
              page={currentPage}
              onChange={(_, p) => setPage(p)}
            />
          )}
        </Stack>
      </Card>
    </DefaultPage>
  );
}

interface UserRowProps {
  row: AdminUserListItem;
  locale: string;
  canAct: boolean;
  busySuspend: boolean;
  busyUnsuspend: boolean;
  onSuspend: () => void;
  onUnsuspend: () => void;
}

function UserRow({
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
        <Stack direction="row" spacing={1.5} sx={{
          alignItems: "center"
        }}>
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
        <StatusChip suspended={isSuspended} />
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

function RoleChip({ role }: { role: AdminUserRole }) {
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
        height: 22,
        fontSize: "0.75rem",
        fontWeight: 500,
        backgroundColor: bg,
        color: fg,
      }}
    />
  );
}

function StatusChip({ suspended }: { suspended: boolean }) {
  const { t } = useTranslation("admin");
  if (suspended) {
    return (
      <Chip
        variant="outlined"
        size="small"
        label={t("users.statusSuspended")}
        sx={{
          borderStyle: "dashed",
          height: 22,
          fontSize: "0.75rem",
          fontWeight: 500,
          color: "text.disabled",
        }}
      />
    );
  }
  return (
    <Chip
      variant="status"
      color="active"
      size="small"
      label={t("users.statusActive")}
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
          <Typography variant="body2" sx={{
            color: "text.secondary"
          }}>
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
          <VisibilityIcon sx={{ fontSize: 16 }} />
          {t("users.actions.viewProfile")}
        </MenuItem>
        <Divider sx={{ my: "4px" }} />
        {activeIsSuspended ? (
          <MenuItem
            disabled={!activeCanAct}
            onClick={() => activeUser && onUnsuspend(activeUser)}
            sx={{ gap: "10px", color: "success.main" }}
          >
            <CheckCircleIcon sx={{ fontSize: 16 }} />
            {t("users.actions.unsuspend")}
          </MenuItem>
        ) : (
          <MenuItem
            disabled={!activeCanAct}
            onClick={() => activeUser && onSuspend(activeUser)}
            sx={{ gap: "10px", color: "error.main" }}
          >
            <BlockIcon sx={{ fontSize: 16 }} />
            {t("users.actions.suspend")}
          </MenuItem>
        )}
      </Menu>
    </Box>
  );
}

interface MobileUserRowProps {
  user: AdminUserListItem;
  locale: string;
  menuOpen: boolean;
  onOpenMenu: (el: HTMLElement) => void;
}

function MobileUserRow({
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
          variant="body2"
          sx={{
            fontSize: 14,
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
            fontFamily: "fontFamilyMono",
            fontSize: "10.5px",
            color: "text.disabled"
          }}>
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
        <MoreVertIcon sx={{ fontSize: 18 }} />
      </IconButton>
    </Box>
  );
}

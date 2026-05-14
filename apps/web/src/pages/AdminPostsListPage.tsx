import { useEffect, useMemo, useState, type MouseEvent } from "react";
import {
  Link as RouterLink,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import Fab from "@mui/material/Fab";
import FormControlLabel from "@mui/material/FormControlLabel";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Pagination from "@mui/material/Pagination";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
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
import AddIcon from "@mui/icons-material/Add";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import DeleteIcon from "@mui/icons-material/DeleteOutline";
import EditIcon from "@mui/icons-material/EditOutlined";
import FilterListIcon from "@mui/icons-material/FilterList";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import RestoreIcon from "@mui/icons-material/RestoreOutlined";
import VisibilityIcon from "@mui/icons-material/VisibilityOutlined";
import { useTranslation } from "react-i18next";
import type { AdminPostListItem } from "@koomiteh/shared";
import {
  useDeleteAdminPostMutation,
  useListAdminPostsQuery,
  useRestoreAdminPostMutation,
} from "@/api/adminApi";

type SortKey = "question" | "language" | "level" | "status" | "updated";
type SortDir = "asc" | "desc";

const SORT_KEYS: ReadonlyArray<SortKey> = [
  "question",
  "language",
  "level",
  "status",
  "updated",
];

const PAGE_SIZE = 10;
const SHOW_DELETED_KEY = "admin.allPosts.showDeleted";

function isSortKey(v: string | null): v is SortKey {
  return v !== null && (SORT_KEYS as readonly string[]).includes(v);
}

function postStatus(row: AdminPostListItem): "active" | "deleted" {
  return row.deletedAt !== null ? "deleted" : "active";
}

function compareRows(a: AdminPostListItem, b: AdminPostListItem, key: SortKey) {
  if (key === "updated") {
    return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
  }
  const av =
    key === "status" ? postStatus(a) : String(a[key as keyof typeof a] ?? "");
  const bv =
    key === "status" ? postStatus(b) : String(b[key as keyof typeof b] ?? "");
  return av.localeCompare(bv, undefined, { sensitivity: "base" });
}

export function AdminPostsListPage() {
  const { t, i18n } = useTranslation("admin");
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const navigate = useNavigate();

  const [includeDeleted, setIncludeDeleted] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(SHOW_DELETED_KEY) === "1";
  });
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(SHOW_DELETED_KEY, includeDeleted ? "1" : "0");
  }, [includeDeleted]);

  const { data, isLoading, error, refetch } = useListAdminPostsQuery({
    includeDeleted,
    pageSize: 100,
  });
  const [deletePost, deleteState] = useDeleteAdminPostMutation();
  const [restorePost, restoreState] = useRestoreAdminPostMutation();
  const locale = i18n.resolvedLanguage ?? i18n.language;

  const [menu, setMenu] = useState<{
    anchorEl: HTMLElement;
    postId: string;
  } | null>(null);
  const openMenu = (postId: string, el: HTMLElement) =>
    setMenu({ anchorEl: el, postId });
  const closeMenu = () => setMenu(null);

  const activePost = menu
    ? data?.items.find((p) => p.id === menu.postId)
    : undefined;

  async function handleDelete(id: string) {
    if (!window.confirm(t("confirmDelete"))) return;
    await deletePost(id)
      .unwrap()
      .catch(() => null);
  }

  async function handleRestore(id: string) {
    await restorePost(id)
      .unwrap()
      .catch(() => null);
  }

  if (isMobile) {
    return (
      <MobileView
        items={data?.items ?? null}
        isLoading={isLoading}
        error={Boolean(error)}
        onRetry={() => refetch()}
        includeDeleted={includeDeleted}
        onToggleDeleted={setIncludeDeleted}
        locale={locale}
        menu={menu}
        onOpenMenu={openMenu}
        onCloseMenu={closeMenu}
        activePost={activePost}
        onEdit={(id) => {
          closeMenu();
          navigate(`/admin/posts/${encodeURIComponent(id)}/edit`);
        }}
        onView={(post) => {
          closeMenu();
          navigate(`/interview/${post.language}/${post.slug}`);
        }}
        onDelete={async (id) => {
          closeMenu();
          await handleDelete(id);
        }}
        onRestore={async (id) => {
          closeMenu();
          await handleRestore(id);
        }}
      />
    );
  }

  return (
    <DesktopView
      data={data}
      isLoading={isLoading}
      error={Boolean(error)}
      onRetry={() => refetch()}
      includeDeleted={includeDeleted}
      onToggleDeleted={setIncludeDeleted}
      locale={locale}
      onDelete={handleDelete}
      onRestore={handleRestore}
      isDeleting={(id) =>
        deleteState.isLoading && deleteState.originalArgs === id
      }
      isRestoring={(id) =>
        restoreState.isLoading && restoreState.originalArgs === id
      }
    />
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Desktop branch
// ────────────────────────────────────────────────────────────────────────────

interface DesktopViewProps {
  data: { items: AdminPostListItem[] } | undefined;
  isLoading: boolean;
  error: boolean;
  onRetry: () => void;
  includeDeleted: boolean;
  onToggleDeleted: (v: boolean) => void;
  locale: string;
  onDelete: (id: string) => void;
  onRestore: (id: string) => void;
  isDeleting: (id: string) => boolean;
  isRestoring: (id: string) => boolean;
}

function DesktopView({
  data,
  isLoading,
  error,
  onRetry,
  includeDeleted,
  onToggleDeleted,
  locale,
  onDelete,
  onRestore,
  isDeleting,
  isRestoring,
}: DesktopViewProps) {
  const { t } = useTranslation("admin");
  const [searchParams, setSearchParams] = useSearchParams();

  const sortKey: SortKey | null = (() => {
    const raw = searchParams.get("sort");
    return isSortKey(raw) ? raw : "updated";
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
    if (!sortKey) return items;
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
    <Box
      sx={{
        maxWidth: 1280,
        mx: "auto",
        width: "100%",
        pt: 9,
        pb: 20,
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 2 }}
      >
        <Typography variant="h2" component="h1">
          {t("list.title")}
        </Typography>
        <Stack direction="row" spacing={2}>
          <Tooltip title={t("list.aiButton")}>
            <Fab
              size="small"
              aria-label={t("list.aiButton")}
              component={RouterLink}
              to="/admin/posts/generate"
              sx={{
                minHeight: "unset",
                p: 0,
                borderRadius: "999px",
                backgroundColor: "secondary.main",
                color: "secondary.contrastText",
                "&:hover": { backgroundColor: "secondary.light" },
              }}
            >
              <AutoAwesomeIcon fontSize="small" />
            </Fab>
          </Tooltip>
          <Tooltip title={t("list.newButton")}>
            <Fab
              size="small"
              color="primary"
              aria-label={t("list.newButton")}
              component={RouterLink}
              to="/admin/posts/new"
            >
              <AddIcon />
            </Fab>
          </Tooltip>
        </Stack>
      </Stack>

      <Stack direction="row" sx={{ mb: 5.5 }}>
        <FormControlLabel
          control={
            <Switch
              color="primary"
              checked={includeDeleted}
              onChange={(_, v) => onToggleDeleted(v)}
            />
          }
          label={t("list.showDeleted")}
        />
      </Stack>

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
          {t("list.loadError")}
        </Alert>
      )}

      <Card variant="outlined" sx={{ overflow: "hidden" }}>
        <Table sx={{ tableLayout: "fixed" }}>
          <colgroup>
            <col />
            <col style={{ width: 100 }} />
            <col style={{ width: 110 }} />
            <col style={{ width: 110 }} />
            <col style={{ width: 130 }} />
            <col style={{ width: 140 }} />
          </colgroup>
          <TableHead>
            <TableRow>
              {(
                [
                  ["question", t("list.columns.question")],
                  ["language", t("list.columns.language")],
                  ["level", t("list.columns.level")],
                  ["status", t("list.columns.status")],
                  ["updated", t("list.columns.updated")],
                ] as Array<[SortKey, string]>
              ).map(([key, label]) => (
                <TableCell key={key}>
                  <TableSortLabel
                    active={sortKey === key}
                    direction={sortKey === key ? sortDir : "asc"}
                    onClick={() => cycleSort(key)}
                    aria-label={t("list.a11y.sortBy", { column: label })}
                  >
                    {label}
                  </TableSortLabel>
                </TableCell>
              ))}
              <TableCell align="right" sx={{ pr: 1.5 }}>
                {t("list.columns.actions")}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading &&
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={`sk-${i}`}>
                  {Array.from({ length: 6 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton variant="text" height={22} />
                    </TableCell>
                  ))}
                </TableRow>
              ))}

            {!isLoading && pageItems.length === 0 && (
              <TableRow>
                <TableCell colSpan={6}>
                  <Stack
                    alignItems="center"
                    sx={{
                      py: 14,
                      gap: 1,
                      color: "text.disabled",
                      fontSize: 13.5,
                    }}
                  >
                    <Typography variant="body2">{t("list.empty")}</Typography>
                  </Stack>
                </TableCell>
              </TableRow>
            )}
            {!isLoading &&
              pageItems.map((row) => (
                <PostRow
                  key={row.id}
                  row={row}
                  locale={locale}
                  busyDelete={isDeleting(row.id)}
                  busyRestore={isRestoring(row.id)}
                  onDelete={() => onDelete(row.id)}
                  onRestore={() => onRestore(row.id)}
                />
              ))}
          </TableBody>
        </Table>

        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{
            px: 4,
            py: 3,
            borderTop: 1,
            borderColor: "divider",
            bgcolor: "surface.elevated",
          }}
        >
          <Typography variant="body2" color="text.disabled">
            {t("list.pager.info", { shown: totalShown, total: totalAll })}
          </Typography>
          <Pagination
            size="small"
            shape="rounded"
            count={pageCount}
            page={currentPage}
            onChange={(_, p) => setPage(p)}
          />
        </Stack>
      </Card>
    </Box>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Row
// ────────────────────────────────────────────────────────────────────────────

interface PostRowProps {
  row: AdminPostListItem;
  locale: string;
  busyDelete: boolean;
  busyRestore: boolean;
  onDelete: () => void;
  onRestore: () => void;
}

function PostRow({
  row,
  locale,
  busyDelete,
  busyRestore,
  onDelete,
  onRestore,
}: PostRowProps) {
  const { t } = useTranslation("admin");
  const isDeleted = row.deletedAt !== null;
  const updated = new Intl.DateTimeFormat(locale).format(
    new Date(row.updatedAt),
  );

  return (
    <TableRow hover>
      <TableCell>
        <Typography
          variant="body1"
          title={row.question}
          sx={{
            fontWeight: 500,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            ...(isDeleted && {
              textDecoration: "line-through",
              color: "text.disabled",
            }),
          }}
        >
          {row.question}
        </Typography>
      </TableCell>
      <TableCell>
        <LanguageBadge language={row.language} />
      </TableCell>
      <TableCell>
        <LevelChip level={row.level} />
      </TableCell>
      <TableCell>
        <StatusChip deleted={isDeleted} />
      </TableCell>
      <TableCell>
        <Typography
          variant="body2"
          sx={{
            color: isDeleted ? "text.disabled" : "text.secondary",
            whiteSpace: "nowrap",
          }}
        >
          {updated}
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
            transition: "background-color 120ms ease, border-color 120ms ease",
          }}
        >
          <Tooltip title={t("list.actions.edit")}>
            <span>
              <IconButton
                size="small"
                component={RouterLink}
                to={`/admin/posts/${encodeURIComponent(row.id)}/edit`}
                aria-label={t("list.actions.edit")}
              >
                <EditIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title={t("list.actions.view")}>
            <span>
              <IconButton
                size="small"
                component={RouterLink}
                to={`/interview/${row.language}/${row.slug}`}
                aria-label={t("list.actions.view")}
              >
                <VisibilityIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          {isDeleted ? (
            <Tooltip title={t("list.actions.restore")}>
              <IconButton
                size="small"
                onClick={onRestore}
                disabled={busyRestore}
                color="success"
                aria-label={t("list.actions.restore")}
              >
                {busyRestore ? (
                  <CircularProgress size={14} />
                ) : (
                  <RestoreIcon fontSize="small" />
                )}
              </IconButton>
            </Tooltip>
          ) : (
            <Tooltip title={t("list.actions.delete")}>
              <IconButton
                size="small"
                color="error"
                onClick={onDelete}
                disabled={busyDelete}
                aria-label={t("list.actions.delete")}
              >
                {busyDelete ? (
                  <CircularProgress size={14} />
                ) : (
                  <DeleteIcon fontSize="small" />
                )}
              </IconButton>
            </Tooltip>
          )}
        </Stack>
      </TableCell>
    </TableRow>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Cells
// ────────────────────────────────────────────────────────────────────────────

function LanguageBadge({ language }: { language: string }) {
  const { t } = useTranslation("admin");
  const isTs = language === "typescript";
  const isJs = language === "javascript";
  const label = isTs ? "TS" : isJs ? "JS" : language.slice(0, 2).toUpperCase();
  const tip = isTs
    ? t("list.languageNames.typescript")
    : isJs
      ? t("list.languageNames.javascript")
      : language;
  return (
    <Tooltip title={tip}>
      <Box
        role="img"
        aria-label={tip}
        sx={{
          width: 22,
          height: 22,
          borderRadius: 0.5,
          display: "inline-grid",
          placeItems: "center",
          fontFamily: "fontFamily",
          fontSize: "0.625rem",
          fontWeight: 700,
          letterSpacing: 0,
          bgcolor: isTs ? "#3178C6" : isJs ? "#F7DF1E" : "surface.elevated",
          color: isTs ? "#fff" : isJs ? "#1a1a1d" : "text.secondary",
          cursor: "default",
        }}
      >
        {label}
      </Box>
    </Tooltip>
  );
}

function LevelChip({ level }: { level: "junior" | "senior" }) {
  const { t } = useTranslation("admin");
  return (
    <Chip
      variant="level"
      color={level}
      size="small"
      label={
        <>
          <Box
            component="span"
            sx={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              backgroundColor: "currentColor",
              display: "inline-block",
            }}
          />
          <span>{t(`list.levels.${level}`)}</span>
        </>
      }
    />
  );
}

function StatusChip({ deleted }: { deleted: boolean }) {
  const { t } = useTranslation("admin");
  if (deleted) {
    return (
      <Chip
        variant="outlined"
        size="small"
        label={t("list.statusDeleted")}
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
      label={t("list.statusActive")}
    />
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Mobile branch — Variant B: compact list rows + per-row kebab menu.
// Activates at < md (see useMediaQuery above).
// ────────────────────────────────────────────────────────────────────────────

interface MobileViewProps {
  items: AdminPostListItem[] | null;
  isLoading: boolean;
  error: boolean;
  onRetry: () => void;
  includeDeleted: boolean;
  onToggleDeleted: (v: boolean) => void;
  locale: string;
  menu: { anchorEl: HTMLElement; postId: string } | null;
  onOpenMenu: (postId: string, el: HTMLElement) => void;
  onCloseMenu: () => void;
  activePost: AdminPostListItem | undefined;
  onEdit: (id: string) => void;
  onView: (post: AdminPostListItem) => void;
  onDelete: (id: string) => void;
  onRestore: (id: string) => void;
}

function MobileView({
  items,
  isLoading,
  error,
  onRetry,
  includeDeleted,
  onToggleDeleted,
  locale,
  menu,
  onOpenMenu,
  onCloseMenu,
  activePost,
  onEdit,
  onView,
  onDelete,
  onRestore,
}: MobileViewProps) {
  const { t } = useTranslation("admin");
  const total = items?.length ?? 0;
  const activeIsDeleted =
    activePost !== undefined && activePost.deletedAt !== null;

  return (
    // Break out of AppShell's <Container> horizontal padding so list rows
    // span the full mobile viewport. Container px is 16px at xs/sm, so
    // mx: -2 (=-16px) cancels it exactly.
    <Box sx={{ mx: { xs: -2, sm: -3 }, mt: -4 }}>
      <Stack
        direction="row"
        alignItems="baseline"
        spacing={1.25}
        sx={{ px: 2, pt: 2.5, pb: 1.5 }}
      >
        <Typography variant="h3" component="h1">
          {t("list.title")}
        </Typography>
        <Typography
          component="span"
          sx={{
            fontFamily: "fontFamilyMono",
            fontSize: 12,
            color: "text.disabled",
          }}
        >
          {total}
        </Typography>
        <Box sx={{ flex: 1 }} />
        <IconButton
          component={RouterLink}
          to="/admin/posts/generate"
          aria-label={t("generate.entryButton")}
          sx={{
            width: 34,
            height: 34,
            p: 0,
            borderRadius: "999px",
            backgroundColor: "secondary.main",
            color: "secondary.contrastText",
            "&:hover": { backgroundColor: "secondary.light" },
            mr: 1,
          }}
        >
          <AutoAwesomeIcon sx={{ fontSize: 18 }} />
        </IconButton>
        <IconButton
          component={RouterLink}
          to="/admin/posts/new"
          aria-label={t("list.newButton")}
          sx={{
            width: 34,
            height: 34,
            p: 0,
            borderRadius: "999px",
            backgroundColor: "primary.main",
            color: "primary.contrastText",
            "&:hover": { backgroundColor: "primary.light" },
          }}
        >
          <AddIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Stack>

      <Stack
        direction="row"
        alignItems="center"
        spacing={1.5}
        sx={{ px: 2, pb: 1.5 }}
      >
        <Stack direction="row" alignItems="center" spacing={1}>
          <Switch
            size="small"
            checked={includeDeleted}
            onChange={(_, v) => onToggleDeleted(v)}
            inputProps={{ "aria-label": t("list.showDeleted") }}
            sx={{
              "& .MuiSwitch-track": {
                backgroundColor: "surface.borderStrong",
                opacity: 1,
              },
              "& .MuiSwitch-thumb": {
                backgroundColor: "#fff",
                boxShadow: "0 1px 2px rgba(0,0,0,0.25)",
              },
              "& .Mui-checked + .MuiSwitch-track": {
                backgroundColor: "primary.main",
                opacity: 1,
              },
            }}
          />
          <Typography variant="body2" color="text.primary">
            {t("list.showDeleted")}
          </Typography>
        </Stack>
        <Box sx={{ flex: 1 }} />
        <Button
          variant="outlined"
          size="small"
          startIcon={<FilterListIcon sx={{ fontSize: 16 }} />}
        >
          {t("list.filter")}
        </Button>
      </Stack>

      {isLoading && (
        <Box
          sx={{ borderTop: 1, borderColor: "divider" }}
          aria-busy
          aria-label={t("list.loading")}
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
              <Skeleton
                variant="circular"
                width={8}
                height={8}
                sx={{ mt: "7px", flexShrink: 0 }}
              />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Skeleton variant="text" width="70%" height={18} />
                <Skeleton variant="text" width="40%" height={18} />
                <Skeleton variant="text" width="30%" height={14} />
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
            {t("list.loadError")}
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
          <Typography variant="body2" color="text.secondary">
            {t("list.empty")}
          </Typography>
        </Box>
      )}

      {items && items.length > 0 && (
        <Box sx={{ borderTop: 1, borderColor: "divider" }}>
          {items.map((post) => (
            <MobilePostRow
              key={post.id}
              post={post}
              locale={locale}
              menuOpen={menu?.postId === post.id}
              onOpenMenu={(el) => onOpenMenu(post.id, el)}
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
          onClick={() => activePost && onEdit(activePost.id)}
          sx={{ gap: "10px" }}
        >
          <EditIcon sx={{ fontSize: 16 }} />
          {t("list.actions.edit")}
        </MenuItem>
        <MenuItem
          onClick={() => activePost && onView(activePost)}
          disabled={activeIsDeleted}
          sx={{ gap: "10px" }}
        >
          <VisibilityIcon sx={{ fontSize: 16 }} />
          {t("list.actions.view")}
        </MenuItem>
        <Divider sx={{ my: "4px" }} />
        {activeIsDeleted ? (
          <MenuItem
            onClick={() => activePost && onRestore(activePost.id)}
            sx={{ gap: "10px", color: "primary.main" }}
          >
            <RestoreIcon sx={{ fontSize: 16 }} />
            {t("list.actions.restore")}
          </MenuItem>
        ) : (
          <MenuItem
            onClick={() => activePost && onDelete(activePost.id)}
            sx={{ gap: "10px", color: "error.main" }}
          >
            <DeleteIcon sx={{ fontSize: 16 }} />
            {t("list.actions.delete")}
          </MenuItem>
        )}
      </Menu>
    </Box>
  );
}

interface MobilePostRowProps {
  post: AdminPostListItem;
  locale: string;
  menuOpen: boolean;
  onOpenMenu: (el: HTMLElement) => void;
}

function MobilePostRow({
  post,
  locale,
  menuOpen,
  onOpenMenu,
}: MobilePostRowProps) {
  const { t } = useTranslation("admin");
  const isDeleted = post.deletedAt !== null;
  const updated = new Intl.DateTimeFormat(locale).format(
    new Date(post.updatedAt),
  );

  const handleKebab = (e: MouseEvent<HTMLElement>) => {
    onOpenMenu(e.currentTarget);
  };

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "flex-start",
        gap: "12px",
        px: 2,
        py: "14px",
        borderBottom: 1,
        borderColor: "divider",
        backgroundColor: menuOpen ? "action.hover" : "transparent",
      }}
    >
      <Box
        aria-hidden
        sx={{
          width: 8,
          height: 8,
          mt: "7px",
          borderRadius: "50%",
          backgroundColor: isDeleted ? "text.disabled" : "success.main",
          flexShrink: 0,
        }}
      />
      <Box
        component={RouterLink}
        to={`/admin/posts/${encodeURIComponent(post.id)}/edit`}
        sx={{
          flex: 1,
          minWidth: 0,
          textDecoration: "none",
          color: "inherit",
          cursor: "pointer",
        }}
      >
        <Typography
          variant="body2"
          sx={{
            fontSize: 14,
            fontWeight: 500,
            lineHeight: 1.35,
            color: "text.primary",
            display: "-webkit-box",
            WebkitBoxOrient: "vertical",
            WebkitLineClamp: 2,
            overflow: "hidden",
            textWrap: "pretty",
          }}
        >
          {post.question}
        </Typography>
        <Stack
          direction="row"
          alignItems="center"
          spacing={1}
          sx={{
            mt: "4px",
            fontFamily: "fontFamilyMono",
            fontSize: "10.5px",
            color: "text.disabled",
          }}
        >
          <Box component="span">{post.language}</Box>
          <Box component="span" sx={{ opacity: 0.5 }}>
            ·
          </Box>
          <Box
            component="span"
            sx={{ textTransform: "uppercase", letterSpacing: "0.06em" }}
          >
            {post.level}
          </Box>
          <Box component="span" sx={{ opacity: 0.5 }}>
            ·
          </Box>
          <Box component="span">{updated}</Box>
        </Stack>
      </Box>
      <IconButton
        onClick={handleKebab}
        aria-label={t("list.a11y.actions")}
        sx={{
          width: 28,
          height: 28,
          mt: "2px",
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

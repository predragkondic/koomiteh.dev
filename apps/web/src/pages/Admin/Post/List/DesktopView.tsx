import { useMemo, useState } from "react";
import { Link as RouterLink, useSearchParams } from "react-router-dom";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CircularProgress from "@mui/material/CircularProgress";
import Fab from "@mui/material/Fab";
import FormControlLabel from "@mui/material/FormControlLabel";
import IconButton from "@mui/material/IconButton";
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
import AddIcon from "@mui/icons-material/Add";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import DeleteIcon from "@mui/icons-material/DeleteOutlined";
import EditIcon from "@mui/icons-material/EditOutlined";
import RestoreIcon from "@mui/icons-material/RestoreOutlined";
import VisibilityIcon from "@mui/icons-material/VisibilityOutlined";
import { useTranslation } from "react-i18next";
import type { AdminPostListItem } from "@koomiteh/shared";
import DefaultPage from "../../../Layout/DefaultPage";
import { LevelChip } from "./components/LevelChip";
import { StatusChip } from "../../components/StatusChip";

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

export function DesktopView({
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
    <DefaultPage titleKey="list.title" titleNs="admin">
      <Stack
        direction="row"
        sx={{
          alignItems: "center",
          justifyContent: "space-between",
          mb: 4,
        }}
      >
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
        <Stack direction={"row"} spacing={4}>
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
            <TableRow
              sx={{
                backgroundColor: "surface.elevated",
              }}
            >
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
                    sx={{
                      color: "text.secondary",
                      "&:hover": {
                        color: "text.primary",
                      },
                      "&.Mui-active:hover": {
                        color: "primary.main",
                      },
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
                    sx={{
                      alignItems: "center",
                      py: 14,
                      gap: 1,
                      color: "text.disabled",
                    }}
                  >
                    <Typography variant="body1">{t("list.empty")}</Typography>
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
          sx={{
            alignItems: "center",
            justifyContent: "space-between",
            px: 4,
            py: 3,
            borderTop: 1,
            borderColor: "divider",
            bgcolor: "surface.elevated",
          }}
        >
          <Typography
            variant="body2"
            sx={{
              color: "text.disabled",
            }}
          >
            {t("list.pager.info", { shown: totalShown, total: totalAll })}
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
        <StatusChip
          variant={isDeleted ? "deleted" : "active"}
          labelKey={isDeleted ? "list.statusDeleted" : "list.statusActive"}
        />
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

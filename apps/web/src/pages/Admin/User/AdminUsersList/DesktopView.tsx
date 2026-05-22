import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Pagination from "@mui/material/Pagination";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TableSortLabel from "@mui/material/TableSortLabel";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import type { AdminUserListItem, AdminUserRole } from "@/api/adminApi";
import DefaultPage from "../../../Layout/DefaultPage";
import { UserRow } from "./components/UserRow";
import {
  PAGE_SIZE,
  canActOn,
  compareRows,
  isSortKey,
  type SortDir,
  type SortKey,
} from "./helpers";

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

export function DesktopView({
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
                    }}
                  >
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
            bgcolor: "surface.elevated",
          }}
        >
          <Typography
            variant="body2"
            sx={{
              color: "text.disabled",
            }}
          >
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

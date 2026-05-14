import { useEffect, useState, type MouseEvent } from "react";
import { Link as RouterLink, useParams } from "react-router-dom";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import Chip from "@mui/material/Chip";
import Skeleton from "@mui/material/Skeleton";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { useTranslation } from "react-i18next";
import type { PostGoneResponse } from "@koomiteh/shared";
import { useGetMeQuery } from "@/api/authApi";
import {
  useDeleteAdminPostMutation,
  useGetAdminPostQuery,
  useRestoreAdminPostMutation,
} from "@/api/adminApi";
import { useGetPostQuery } from "@/api/interviewApi";
import { DetailBreadcrumb } from "@/features/interview/DetailBreadcrumb";
import { DetailPrevNext } from "@/features/interview/DetailPrevNext";
import { FavoriteButton } from "@/features/interview/FavoriteButton";
import { MarkdownBody } from "@/features/interview/MarkdownBody";
import { RelatedQuestions } from "@/features/interview/RelatedQuestions";
import { NotFoundPage } from "./NotFoundPage";

function formatDate(value: string, locale: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(date);
}

export function InterviewDetailPage() {
  const { t, i18n } = useTranslation(["interview", "common"]);
  const { language = "", slug = "" } = useParams();
  const { data: meData } = useGetMeQuery();
  const isAdmin = meData?.user?.role === "admin";
  const { data, isLoading, error, refetch } = useGetPostQuery({
    language,
    slug,
  });
  const goneInfo =
    isAdmin && (error as { status?: number; data?: unknown })?.status === 410
      ? ((error as { data?: PostGoneResponse }).data ?? null)
      : null;
  const {
    data: adminData,
    isLoading: adminLoading,
    error: adminError,
    refetch: refetchAdminPost,
  } = useGetAdminPostQuery(goneInfo?.id ?? "", {
    skip: !goneInfo?.id,
  });
  const [deletePost, deleteState] = useDeleteAdminPostMutation();
  const [restorePost, restoreState] = useRestoreAdminPostMutation();
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [deletedViewOverride, setDeletedViewOverride] = useState<
    boolean | null
  >(null);

  useEffect(() => {
    setDeletedViewOverride(null);
  }, [language, slug]);

  if (isLoading || adminLoading) {
    return (
      <Box role="status" aria-label={t("loading.detail")} aria-busy>
        <Stack spacing={2} sx={{ maxWidth: 720, mx: "auto" }}>
          <Skeleton variant="text" height={48} width="80%" />
          <Skeleton variant="rounded" height={120} />
          <Skeleton variant="rounded" height={200} />
        </Stack>
      </Box>
    );
  }

  if (error && !adminData) {
    const status = (error as { status?: number }).status;
    if (status === 404) return <NotFoundPage scope="post" />;
    if (status === 410) {
      if (isAdmin && adminError) {
        return (
          <Alert
            severity="error"
            action={
              <Button
                color="inherit"
                size="small"
                onClick={() => refetchAdminPost()}
              >
                {t("common:actions.retry")}
              </Button>
            }
          >
            {t("common:errors.loadPost")}
          </Alert>
        );
      }
      if (isAdmin && deletedViewOverride === null) return null;
      return (
        <Box sx={{ textAlign: "center", py: 8 }}>
          <Typography variant="h4" gutterBottom>
            {t("admin:gone.title")}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {t("admin:gone.body")}
          </Typography>
        </Box>
      );
    }
    return (
      <Alert
        severity="warning"
        action={
          <Button color="inherit" size="small" onClick={() => refetch()}>
            {t("common:actions.retry")}
          </Button>
        }
      >
        {t("common:errors.loadPost")}
      </Alert>
    );
  }

  const detail = adminData ?? data;
  if (!detail) return null;

  const { frontmatter, bodyMd } = detail;
  const locale = i18n.resolvedLanguage ?? i18n.language;
  const isDeletedAdminView =
    deletedViewOverride ?? Boolean(adminData?.frontmatter.deletedAt);
  const isAdminMenuVisible = isAdmin && frontmatter.id;
  const isMutating = deleteState.isLoading || restoreState.isLoading;

  async function handleRestore() {
    await restorePost(frontmatter.id)
      .unwrap()
      .catch(() => null);
    setDeletedViewOverride(false);
    await Promise.all([refetch(), refetchAdminPost()]);
  }

  async function handleDelete() {
    if (!window.confirm(t("admin:confirmDelete"))) return;
    await deletePost(frontmatter.id)
      .unwrap()
      .catch(() => null);
    setDeletedViewOverride(true);
    await refetch();
  }

  function openMenu(event: MouseEvent<HTMLElement>) {
    setMenuAnchor(event.currentTarget);
  }

  function closeMenu() {
    setMenuAnchor(null);
  }

  return (
    <Stack spacing={3} sx={{ maxWidth: 720, mx: "auto" }}>
      <DetailBreadcrumb
        language={frontmatter.language}
        level={frontmatter.level}
      />
      {isDeletedAdminView ? (
        <Alert
          severity="warning"
          action={
            <Button
              color="inherit"
              size="small"
              onClick={() => void handleRestore()}
              disabled={restoreState.isLoading}
            >
              {t("admin:list.actions.restore")}
            </Button>
          }
        >
          {t("admin:gone.body")}
        </Alert>
      ) : null}
      <Stack direction="row" spacing={1} alignItems="flex-start">
        <Typography variant="h3" component="h1" sx={{ flex: 1 }}>
          {frontmatter.question}
        </Typography>
        {!isDeletedAdminView ? (
          <FavoriteButton postId={frontmatter.id} size="medium" />
        ) : null}
        {isAdminMenuVisible ? (
          <>
            <IconButton
              aria-label={t("admin:list.a11y.actions")}
              onClick={openMenu}
              disabled={isMutating}
            >
              <MoreVertIcon />
            </IconButton>
            <Menu
              anchorEl={menuAnchor}
              open={Boolean(menuAnchor)}
              onClose={closeMenu}
            >
              <MenuItem
                component={RouterLink}
                to={`/admin/posts/${encodeURIComponent(frontmatter.id)}/edit`}
                onClick={closeMenu}
              >
                {t("admin:list.actions.edit")}
              </MenuItem>
              {isDeletedAdminView ? (
                <MenuItem
                  onClick={() => {
                    closeMenu();
                    void handleRestore();
                  }}
                  disabled={isMutating}
                >
                  {t("admin:list.actions.restore")}
                </MenuItem>
              ) : (
                <MenuItem
                  onClick={() => {
                    closeMenu();
                    void handleDelete();
                  }}
                  disabled={isMutating}
                >
                  {t("admin:list.actions.delete")}
                </MenuItem>
              )}
            </Menu>
          </>
        ) : null}
      </Stack>
      <MarkdownBody bodyMd={bodyMd} />
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        {frontmatter.tags.map((tag) => (
          <Chip key={tag} label={tag} size="small" variant="outlined" />
        ))}
      </Stack>
      <Typography variant="caption" color="text.secondary">
        {t("detail.updated", {
          date: formatDate(frontmatter.updatedAt, locale),
        })}
      </Typography>
      {!isDeletedAdminView ? (
        <>
          <Divider />
          <DetailPrevNext
            currentId={frontmatter.id}
            language={frontmatter.language}
          />
          <RelatedQuestions
            currentId={frontmatter.id}
            language={frontmatter.language}
            tags={frontmatter.tags}
          />
        </>
      ) : null}
    </Stack>
  );
}

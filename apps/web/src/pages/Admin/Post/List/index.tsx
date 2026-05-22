import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import { useTranslation } from "react-i18next";
import {
  useDeleteAdminPostMutation,
  useListAdminPostsQuery,
  useRestoreAdminPostMutation,
} from "@/api/adminApi";
import { useConfirm } from "@/components/ConfirmProvider";
import { DesktopView } from "./DesktopView";
import { AdminPostMobileView } from "./MobileView";

const SHOW_DELETED_KEY = "admin.allPosts.showDeleted";

export function AdminPostsListPage() {
  const { t, i18n } = useTranslation("admin");
  const confirm = useConfirm();
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
    const ok = await confirm({
      title: t("confirmDelete.title"),
      content: t("confirmDelete.content"),
      confirmLabel: t("confirmDelete.confirmLabel"),
      variant: "destructive",
    });
    if (!ok) return;
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
      <AdminPostMobileView
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

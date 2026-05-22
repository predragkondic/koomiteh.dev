import type { MouseEvent } from "react";
import { Link as RouterLink } from "react-router-dom";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import Typography from "@mui/material/Typography";
import AddIcon from "@mui/icons-material/Add";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import DeleteIcon from "@mui/icons-material/DeleteOutlined";
import EditIcon from "@mui/icons-material/EditOutlined";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import RestoreIcon from "@mui/icons-material/RestoreOutlined";
import VisibilityIcon from "@mui/icons-material/VisibilityOutlined";
import { useTranslation } from "react-i18next";
import type { AdminPostListItem } from "@koomiteh/shared";
import DefaultPage from "../../../Layout/DefaultPage";

interface AdminPostMobileViewProps {
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

export function AdminPostMobileView({
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
}: AdminPostMobileViewProps) {
  const { t } = useTranslation("admin");
  const activeIsDeleted =
    activePost !== undefined && activePost.deletedAt !== null;

  return (
    <DefaultPage titleKey="list.title" titleNs="admin">
      <Stack
        direction="row"
        sx={{
          alignItems: "center",
          mb: 4,
        }}
      >
        <Stack
          direction="row"
          sx={{
            alignItems: "center",
          }}
        >
          <Stack
            direction="row"
            spacing={1}
            sx={{
              alignItems: "center",
            }}
          >
            <Switch
              size="small"
              checked={includeDeleted}
              onChange={(_, v) => onToggleDeleted(v)}
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
              slotProps={{
                input: { "aria-label": t("list.showDeleted") },
              }}
            />
            <Typography
              variant="body2"
              sx={{
                color: "text.primary",
              }}
            >
              {t("list.showDeleted")}
            </Typography>
          </Stack>
          <Box sx={{ flex: 1 }} />
        </Stack>
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
          <Typography
            variant="body2"
            sx={{
              color: "text.secondary",
            }}
          >
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
    </DefaultPage>
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
          width: 12,
          height: 12,
          borderRadius: "50%",
          margin: "auto",
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
          variant="body1"
          sx={{
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
          spacing={1}
          sx={{
            alignItems: "center",
            mt: "4px",
            fontFamily: "fontFamilyMono",
            color: "text.disabled",
          }}
        >
          <Typography variant="caption">
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
          </Typography>
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

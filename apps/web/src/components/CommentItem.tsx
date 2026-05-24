import { useState, type KeyboardEvent } from "react";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import { useTranslation } from "react-i18next";
import { formatRelativeTime } from "@/lib/formatRelativeTime";
import {
  renderCommentBody,
  type CommentItem as CommentData,
} from "@koomiteh/shared";
import {
  useDeleteCommentMutation,
  useUpdateCommentMutation,
} from "@/api/commentsApi";
import { useConfirm } from "./ConfirmProvider";

const MAX_BODY = 10000;

interface Props {
  postId: string;
  comment: CommentData;
  currentUserId: string | null;
  isStaff: boolean;
}

export function CommentItem({
  postId,
  comment,
  currentUserId,
  isStaff,
}: Props) {
  const { t, i18n } = useTranslation("comments");
  const confirm = useConfirm();
  const [isEditing, setIsEditing] = useState(false);
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [draft, setDraft] = useState(comment.bodyMd ?? "");
  const [updateComment, { isLoading: saving }] = useUpdateCommentMutation();
  const [deleteComment, { isLoading: deleting }] = useDeleteCommentMutation();

  const isDeleted = comment.deletedAt !== null;
  const isOwner =
    currentUserId !== null &&
    comment.author !== null &&
    comment.author.id === currentUserId;
  const canEdit = isOwner && !isDeleted;
  const canDelete = !isDeleted && (isOwner || isStaff);
  const deleteIsHard = !isOwner && isStaff;
  const wasEdited =
    !isDeleted &&
    new Date(comment.updatedAt).getTime() -
      new Date(comment.createdAt).getTime() >
      1_000;
  const locale = i18n.resolvedLanguage ?? i18n.language;

  const trimmed = draft.trim();
  const canSave =
    trimmed.length > 0 && draft.length <= MAX_BODY && !saving;

  function openEdit() {
    setDraft(comment.bodyMd ?? "");
    setMode("edit");
    setIsEditing(true);
  }

  function cancelEdit() {
    setIsEditing(false);
  }

  async function save() {
    if (!canSave) return;
    try {
      await updateComment({
        postId,
        commentId: comment.id,
        input: { bodyMd: draft },
      }).unwrap();
      setIsEditing(false);
    } catch {
      // surface via mutation state; keep edit-mode open so user can retry
    }
  }

  function onTextareaKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      void save();
    }
  }

  async function handleDelete() {
    const variant = deleteIsHard ? "hard" : "soft";
    const ok = await confirm({
      title: t(`delete.${variant}.title`),
      content: t(`delete.${variant}.body`),
      confirmLabel: t(`delete.${variant}.confirm`),
      variant: "destructive",
    });
    if (!ok) return;
    try {
      await deleteComment({ postId, commentId: comment.id }).unwrap();
    } catch {
      // surface via mutation state
    }
  }

  return (
    <Box component="li">
      <Stack direction="row" sx={{ mb: 1, gap: 1, alignItems: "center" }}>
        {comment.author ? (
          <>
            <Avatar
              src={comment.author.avatarUrl ?? undefined}
              alt={comment.author.displayName}
              sx={{ width: 24, height: 24 }}
            />
            <Stack
              direction="row"
              sx={{ flex: 1, gap: 1, alignItems: "center" }}
            >
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {comment.author.displayName}
              </Typography>
              {isOwner ? (
                <Chip
                  label={t("meta.you")}
                  size="small"
                  variant="tag"
                  sx={{ height: 18 }}
                />
              ) : null}
              <Typography variant="caption" color="text.secondary">
                · {formatRelativeTime(comment.createdAt, locale)}
              </Typography>
              {wasEdited ? (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontStyle: "italic" }}
                >
                  · {t("meta.edited")}
                </Typography>
              ) : null}
            </Stack>
          </>
        ) : (
          <Typography
            variant="body2"
            color="text.disabled"
            sx={{ fontStyle: "italic", flex: 1 }}
          >
            [deleted]
          </Typography>
        )}
        {canEdit && !isEditing ? (
          <IconButton
            size="small"
            aria-label={t("action.edit")}
            onClick={openEdit}
          >
            <EditIcon fontSize="small" />
          </IconButton>
        ) : null}
        {canDelete && !isEditing ? (
          <IconButton
            size="small"
            aria-label={t("action.delete")}
            onClick={() => void handleDelete()}
            disabled={deleting}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        ) : null}
      </Stack>

      {isEditing ? (
        <Stack spacing={1}>
          <ToggleButtonGroup
            value={mode}
            exclusive
            onChange={(_, next: "edit" | "preview" | null) => {
              if (next) setMode(next);
            }}
            size="small"
            aria-label={t("edit.tab.edit")}
          >
            <ToggleButton value="edit">{t("edit.tab.edit")}</ToggleButton>
            <ToggleButton value="preview">{t("edit.tab.preview")}</ToggleButton>
          </ToggleButtonGroup>
          {mode === "edit" ? (
            <TextField
              multiline
              minRows={3}
              fullWidth
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onTextareaKeyDown}
              slotProps={{ htmlInput: { "aria-label": "Edit comment body" } }}
            />
          ) : (
            <Box
              sx={{
                p: 2,
                border: 1,
                borderColor: "divider",
                borderRadius: 1,
                "& p:last-child": { mb: 0 },
              }}
              dangerouslySetInnerHTML={{ __html: renderCommentBody(draft) }}
            />
          )}
          <Stack
            direction="row"
            sx={{ alignItems: "center", justifyContent: "space-between" }}
          >
            <Typography variant="caption" color="text.secondary">
              {t("edit.hint")}
            </Typography>
            <Stack direction="row" sx={{ gap: 1 }}>
              <Button variant="outlined" onClick={cancelEdit} disabled={saving}>
                {t("action.cancel")}
              </Button>
              <Button
                variant="contained"
                onClick={save}
                disabled={!canSave}
              >
                {t("action.save")}
              </Button>
            </Stack>
          </Stack>
        </Stack>
      ) : isDeleted ? (
        <Typography color="text.disabled">{comment.bodyHtmlSafe}</Typography>
      ) : (
        <Box
          sx={{ "& p:last-child": { mb: 0 } }}
          dangerouslySetInnerHTML={{ __html: comment.bodyHtmlSafe }}
        />
      )}
    </Box>
  );
}

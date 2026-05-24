import { useState, type KeyboardEvent } from "react";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import EditIcon from "@mui/icons-material/Edit";
import { useTranslation } from "react-i18next";
import {
  renderCommentBody,
  type CommentItem as CommentData,
} from "@koomiteh/shared";
import { useUpdateCommentMutation } from "@/api/commentsApi";

const MAX_BODY = 10000;

interface Props {
  postId: string;
  comment: CommentData;
  currentUserId: string | null;
  isStaff: boolean;
}

export function CommentItem({ postId, comment, currentUserId }: Props) {
  const { t } = useTranslation("comments");
  const [isEditing, setIsEditing] = useState(false);
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [draft, setDraft] = useState(comment.bodyMd ?? "");
  const [updateComment, { isLoading: saving }] = useUpdateCommentMutation();

  const isDeleted = comment.deletedAt !== null;
  const isOwner =
    currentUserId !== null &&
    comment.author !== null &&
    comment.author.id === currentUserId;
  const canEdit = isOwner && !isDeleted;

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
            <Typography variant="body2" sx={{ flex: 1 }}>
              {comment.author.displayName}
            </Typography>
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

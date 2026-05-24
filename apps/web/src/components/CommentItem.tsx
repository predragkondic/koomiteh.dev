import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import EditIcon from "@mui/icons-material/Edit";
import { useTranslation } from "react-i18next";
import type { CommentItem as CommentData } from "@koomiteh/shared";

interface Props {
  comment: CommentData;
  currentUserId: string | null;
  isStaff: boolean;
}

export function CommentItem({ comment, currentUserId }: Props) {
  const { t } = useTranslation("comments");
  const isDeleted = comment.deletedAt !== null;
  const isOwner =
    currentUserId !== null &&
    comment.author !== null &&
    comment.author.id === currentUserId;
  const canEdit = isOwner && !isDeleted;

  return (
    <Box component="li">
      <Stack
        direction="row"
        sx={{ mb: 1, gap: 1, alignItems: "center" }}
      >
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
        {canEdit ? (
          <IconButton size="small" aria-label={t("action.edit")}>
            <EditIcon fontSize="small" />
          </IconButton>
        ) : null}
      </Stack>
      {isDeleted ? (
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

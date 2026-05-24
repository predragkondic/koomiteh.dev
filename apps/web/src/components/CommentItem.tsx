import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import type { CommentItem as CommentData } from "@koomiteh/shared";

interface Props {
  comment: CommentData;
}

export function CommentItem({ comment }: Props) {
  const isDeleted = comment.deletedAt !== null;
  return (
    <Box component="li">
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          mb: 1,
        }}
      >
        {comment.author ? (
          <>
            <Avatar
              src={comment.author.avatarUrl ?? undefined}
              alt={comment.author.displayName}
              sx={{ width: 24, height: 24 }}
            />
            <Typography variant="body2">
              {comment.author.displayName}
            </Typography>
          </>
        ) : (
          <Typography
            variant="body2"
            color="text.disabled"
            sx={{ fontStyle: "italic" }}
          >
            [deleted]
          </Typography>
        )}
      </Box>
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

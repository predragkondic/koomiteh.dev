import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { CommentItem } from "@koomiteh/shared";
import { useGetCommentsQuery } from "@/api/commentsApi";

interface Props {
  postId: string;
  pageSize?: number;
}

export function CommentList({ postId, pageSize }: Props) {
  const { data, isLoading } = useGetCommentsQuery({ postId, pageSize });

  if (isLoading || !data) {
    return (
      <Stack spacing={2} aria-busy aria-label="loading comments">
        <Skeleton variant="rounded" height={80} />
        <Skeleton variant="rounded" height={80} />
      </Stack>
    );
  }

  if (data.items.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No comments yet.
      </Typography>
    );
  }

  return (
    <Stack spacing={2} component="ul" sx={{ listStyle: "none", p: 0, m: 0 }}>
      {data.items.map((c) => (
        <Comment key={c.id} comment={c} />
      ))}
    </Stack>
  );
}

function Comment({ comment }: { comment: CommentItem }) {
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

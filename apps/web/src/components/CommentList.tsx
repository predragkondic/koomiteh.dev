import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import { useGetCommentsQuery } from "@/api/commentsApi";
import { CommentItem } from "./CommentItem";

interface Props {
  postId: string;
  pageSize?: number;
}

export function CommentList({ postId, pageSize }: Props) {
  const { t } = useTranslation("comments");
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
        {t("empty")}
      </Typography>
    );
  }

  return (
    <Stack spacing={2} component="ul" sx={{ listStyle: "none", p: 0, m: 0 }}>
      {data.items.map((c) => (
        <CommentItem key={c.id} comment={c} />
      ))}
    </Stack>
  );
}

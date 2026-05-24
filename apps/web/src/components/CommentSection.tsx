import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import { useGetCommentsQuery } from "@/api/commentsApi";
import { CommentForm } from "./CommentForm";
import { CommentList } from "./CommentList";

interface Props {
  postId: string;
}

export function CommentSection({ postId }: Props) {
  const { t } = useTranslation("comments");
  const { data } = useGetCommentsQuery({ postId });
  const count = data?.total ?? 0;

  return (
    <Stack spacing={3} component="section" aria-label="comments">
      <Stack
        direction="row"
        sx={{
          alignItems: "baseline",
          justifyContent: "space-between",
        }}
      >
        <Typography variant="h5" component="h2">
          {t("heading", { count })}
        </Typography>
        {count > 0 ? (
          <Typography
            variant="caption"
            sx={{
              color: "text.secondary",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            {t("oldestFirst")}
          </Typography>
        ) : null}
      </Stack>
      <CommentList postId={postId} />
      <CommentForm postId={postId} />
    </Stack>
  );
}

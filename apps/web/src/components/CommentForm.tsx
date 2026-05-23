import { useState, type FormEvent } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Link from "@mui/material/Link";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useGetMeQuery, loginUrl } from "@/api/authApi";
import { useCreateCommentMutation } from "@/api/commentsApi";

const MAX_BODY = 10000;

interface Props {
  postId: string;
}

export function CommentForm({ postId }: Props) {
  const { data: meData, isLoading: meLoading } = useGetMeQuery();
  const [createComment, { isLoading: submitting }] = useCreateCommentMutation();
  const [bodyMd, setBodyMd] = useState("");

  if (meLoading) {
    return null;
  }

  if (!meData?.user) {
    return (
      <Box sx={{ py: 2 }}>
        <Typography variant="body2" color="text.secondary">
          <Link href={loginUrl()} underline="hover">
            Sign in to comment
          </Link>
        </Typography>
      </Box>
    );
  }

  const trimmed = bodyMd.trim();
  const tooLong = bodyMd.length > MAX_BODY;
  const canSubmit = trimmed.length > 0 && !tooLong && !submitting;

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSubmit) return;
    try {
      await createComment({ postId, input: { bodyMd } }).unwrap();
      setBodyMd("");
    } catch {
      // Server-side errors surface via the mutation result; intentionally
      // not clearing the input on failure so the user can retry.
    }
  }

  return (
    <Box component="form" onSubmit={onSubmit} sx={{ py: 2 }}>
      <TextField
        multiline
        minRows={3}
        fullWidth
        placeholder="Write a comment in Markdown..."
        value={bodyMd}
        onChange={(e) => setBodyMd(e.target.value)}
        error={tooLong}
        helperText={tooLong ? `Max ${MAX_BODY} characters` : undefined}
        slotProps={{ htmlInput: { "aria-label": "Comment body" } }}
      />
      <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 1 }}>
        <Button type="submit" variant="contained" disabled={!canSubmit}>
          Post comment
        </Button>
      </Box>
    </Box>
  );
}

import { Link as RouterLink } from "react-router-dom";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import { useTranslation } from "react-i18next";
import type { Level } from "@/types";

interface PostBreadcrumbProps {
  language: string;
  level: Level;
}

export function PostBreadcrumb({ language, level }: PostBreadcrumbProps) {
  const { t } = useTranslation("post");
  return (
    <Stack
      direction="row"
      spacing={1}
      aria-label={t("detail.breadcrumbLabel")}
      role="navigation"
    >
      <Chip
        component={RouterLink}
        to={`/post/${language}`}
        label={language}
        size="small"
        clickable
      />
      <Chip
        component={RouterLink}
        to={`/post/${language}?level=${level}`}
        label={t(`level.${level}` as const)}
        size="small"
        variant="outlined"
        clickable
      />
    </Stack>
  );
}

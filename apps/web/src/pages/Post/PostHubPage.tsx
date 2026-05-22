import { Link as RouterLink, Navigate } from "react-router-dom";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import CardContent from "@mui/material/CardContent";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import { useGetManifestQuery } from "@/api/postApi";
import type { ManifestLanguage } from "@/types";

export function PostHubPage() {
  const { t } = useTranslation(["post", "common"]);
  const { data, isLoading, error, refetch } = useGetManifestQuery();

  if (isLoading) return <HubSkeleton ariaLabel={t("loading.hub")} />;

  if (error) {
    return (
      <Alert
        severity="error"
        action={
          <Button color="inherit" size="small" onClick={() => refetch()}>
            {t("common:actions.retry")}
          </Button>
        }
      >
        {t("common:errors.loadLanguages")}
      </Alert>
    );
  }

  if (!data) return null;

  if (data.languages.length === 1) {
    return <Navigate to={`/post/${data.languages[0].id}`} replace />;
  }

  return (
    <Box>
      <Typography variant="h3" component="h1" gutterBottom>
        {t("hub.title")}
      </Typography>
      <Typography
        variant="body1"
        sx={{
          color: "text.secondary",
          pb: 3,
        }}
      >
        {t("hub.subtitle")}
      </Typography>
      <Box
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, 1fr)",
            md: "repeat(3, 1fr)",
          },
        }}
      >
        {data.languages.map((lang) => (
          <LanguageTile key={lang.id} lang={lang} />
        ))}
      </Box>
    </Box>
  );
}

function LanguageTile({ lang }: { lang: ManifestLanguage }) {
  const { t } = useTranslation("post");
  return (
    <Card variant="outlined">
      <CardActionArea
        component={RouterLink}
        to={`/post/${lang.id}`}
        sx={{ height: "100%", alignItems: "flex-start" }}
      >
        <CardContent>
          <Stack spacing={1}>
            <Typography variant="h6" component="h2">
              {lang.displayName}
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: "text.secondary",
              }}
            >
              {t("questions", { count: lang.count })}
            </Typography>
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

function HubSkeleton({ ariaLabel }: { ariaLabel: string }) {
  return (
    <Box
      role="status"
      aria-label={ariaLabel}
      aria-busy
      sx={{
        display: "grid",
        gap: 2,
        gridTemplateColumns: {
          xs: "1fr",
          sm: "repeat(2, 1fr)",
          md: "repeat(3, 1fr)",
        },
      }}
    >
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} variant="rounded" height={120} />
      ))}
    </Box>
  );
}

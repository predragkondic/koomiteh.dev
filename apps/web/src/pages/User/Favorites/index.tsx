import { useCallback } from "react";
import { Link as RouterLink, useSearchParams } from "react-router-dom";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Pagination from "@mui/material/Pagination";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import { useGetMeQuery, loginUrl } from "@/api/authApi";
import { useGetMyFavoritesQuery } from "@/api/favoritesApi";
import { FavoriteButton } from "@/pages/User/Favorites/components/FavoriteButton";
import type { PostFrontmatter } from "@/types";
import DefaultPage from "../../Layout/DefaultPage";

const PAGE_SIZE = 20;
const MAX_VISIBLE_TAGS = 3;

export function UserFavoritesPage() {
  const { t } = useTranslation(["common"]);
  const { data: meData, isLoading: meLoading } = useGetMeQuery();
  const isLoggedIn = Boolean(meData?.user);
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);

  const { data, isLoading, error, refetch } = useGetMyFavoritesQuery(
    { page, pageSize: PAGE_SIZE },
    { skip: !isLoggedIn },
  );

  const onPageChange = useCallback(
    (_: unknown, next: number) => {
      const sp = new URLSearchParams(searchParams);
      sp.set("page", String(next));
      setSearchParams(sp);
    },
    [searchParams, setSearchParams],
  );

  const renderBody = () => {
    if (meLoading) return <ListingSkeleton />;

    if (!isLoggedIn) {
      return (
        <Stack
          spacing={2}
          sx={{
            alignItems: "flex-start",
          }}
        >
          <Typography
            variant="body1"
            sx={{
              color: "text.secondary",
            }}
          >
            {t("common:favorites.loginPrompt")}
          </Typography>
          <Button variant="contained" component="a" href={loginUrl()}>
            {t("common:auth.login")}
          </Button>
        </Stack>
      );
    }

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
          {t("common:errors.loadPosts")}
        </Alert>
      );
    }

    if (isLoading || !data) return <ListingSkeleton />;

    if (data.total === 0) {
      return (
        <Typography variant="body1">{t("common:favorites.empty")}</Typography>
      );
    }

    return (
      <>
        <CardGrid>
          {data.items.map((post) => (
            <FavoriteCard key={post.id} post={post} />
          ))}
        </CardGrid>
        {data.pageCount > 1 && (
          <Stack
            sx={{
              alignItems: "center",
              pt: 4,
            }}
          >
            <Pagination
              count={data.pageCount}
              page={data.page}
              onChange={onPageChange}
              color="primary"
            />
          </Stack>
        )}
      </>
    );
  };

  return (
    <DefaultPage titleKey="favorites.pageTitle">{renderBody()}</DefaultPage>
  );
}

function CardGrid({ children }: { children: React.ReactNode }) {
  return (
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
      {children}
    </Box>
  );
}

function FavoriteCard({ post }: { post: PostFrontmatter }) {
  const visibleTags = post.tags.slice(0, MAX_VISIBLE_TAGS);
  const overflow = post.tags.length - visibleTags.length;
  const to = `/post/${post.language}/${post.slug}`;

  return (
    <Card variant="outlined" sx={{ position: "relative" }}>
      <FavoriteButton
        postId={post.id}
        sx={{ position: "absolute", top: 4, right: 4, zIndex: 1 }}
      />
      <CardActionArea
        component={RouterLink}
        to={to}
        sx={{ height: "100%", alignItems: "flex-start" }}
      >
        <CardContent>
          <Stack spacing={1.5}>
            <Stack direction="row" spacing={1} sx={{ pr: 4 }}>
              <Chip label={post.language} size="small" />
              <Chip label={post.level} size="small" variant="outlined" />
            </Stack>
            <Typography variant="h6" component="h2">
              {post.question}
            </Typography>
            <Stack
              direction="row"
              spacing={0.5}
              useFlexGap
              sx={{
                flexWrap: "wrap",
              }}
            >
              {visibleTags.map((tag) => (
                <Chip key={tag} label={tag} size="small" variant="outlined" />
              ))}
              {overflow > 0 && (
                <Chip label={`+${overflow}`} size="small" variant="outlined" />
              )}
            </Stack>
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

function ListingSkeleton() {
  return (
    <Box role="status" aria-busy>
      <CardGrid>
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} variant="rounded" height={160} />
        ))}
      </CardGrid>
    </Box>
  );
}

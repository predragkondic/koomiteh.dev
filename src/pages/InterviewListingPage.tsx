import { Link as RouterLink, useParams } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useGetIndexQuery } from '@/api/interviewApi';
import type { PostFrontmatter } from '@/types';
import { NotFoundPage } from './NotFoundPage';

const MAX_VISIBLE_TAGS = 3;

export function InterviewListingPage() {
  const { language = '' } = useParams();
  const { data, isLoading, error, refetch } = useGetIndexQuery(language);

  if (isLoading) return <ListingSkeleton />;

  if (error) {
    const status = (error as { status?: number }).status;
    if (status === 404) return <NotFoundPage scope="language" />;
    return (
      <Alert
        severity="error"
        action={
          <Button color="inherit" size="small" onClick={() => refetch()}>
            Retry
          </Button>
        }
      >
        Failed to load questions.
      </Alert>
    );
  }

  if (!data) return null;

  return (
    <Box
      sx={{
        display: 'grid',
        gap: 2,
        gridTemplateColumns: {
          xs: '1fr',
          sm: 'repeat(2, 1fr)',
          md: 'repeat(3, 1fr)',
        },
      }}
    >
      {data.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
    </Box>
  );
}

function PostCard({ post }: { post: PostFrontmatter }) {
  const visibleTags = post.tags.slice(0, MAX_VISIBLE_TAGS);
  const overflow = post.tags.length - visibleTags.length;

  return (
    <Card variant="outlined">
      <CardActionArea
        component={RouterLink}
        to={`/interview/${post.language}/${post.slug}`}
        sx={{ height: '100%', alignItems: 'flex-start' }}
      >
        <CardContent>
          <Stack spacing={1.5}>
            <Stack direction="row" spacing={1}>
              <Chip label={post.language} size="small" />
              <Chip label={post.level} size="small" variant="outlined" />
            </Stack>
            <Typography variant="h6" component="h2">
              {post.question}
            </Typography>
            <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
              {visibleTags.map((t) => (
                <Chip key={t} label={t} size="small" variant="outlined" />
              ))}
              {overflow > 0 && (
                <Chip
                  label={`+${overflow}`}
                  size="small"
                  variant="outlined"
                />
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
    <Box
      sx={{
        display: 'grid',
        gap: 2,
        gridTemplateColumns: {
          xs: '1fr',
          sm: 'repeat(2, 1fr)',
          md: 'repeat(3, 1fr)',
        },
      }}
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} variant="rounded" height={160} />
      ))}
    </Box>
  );
}

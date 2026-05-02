import { useParams } from 'react-router-dom';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import Skeleton from '@mui/material/Skeleton';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import { useGetPostQuery } from '@/api/interviewApi';
import { DetailBreadcrumb } from '@/features/interview/DetailBreadcrumb';
import { DetailPrevNext } from '@/features/interview/DetailPrevNext';
import { RelatedQuestions } from '@/features/interview/RelatedQuestions';
import { NotFoundPage } from './NotFoundPage';

export function InterviewDetailPage() {
  const { language = '', slug = '' } = useParams();
  const { data, isLoading, error, refetch } = useGetPostQuery({ language, slug });

  if (isLoading) {
    return (
      <Stack spacing={2} sx={{ maxWidth: 720, mx: 'auto' }}>
        <Skeleton variant="text" height={48} width="80%" />
        <Skeleton variant="rounded" height={120} />
        <Skeleton variant="rounded" height={200} />
      </Stack>
    );
  }

  if (error) {
    const status = (error as { status?: number }).status;
    if (status === 404) return <NotFoundPage scope="post" />;
    return (
      <Alert
        severity="error"
        action={
          <Button color="inherit" size="small" onClick={() => refetch()}>
            Retry
          </Button>
        }
      >
        Failed to load post.
      </Alert>
    );
  }

  if (!data) return null;

  const { frontmatter, bodyHtml } = data;

  return (
    <Stack spacing={3} sx={{ maxWidth: 720, mx: 'auto' }}>
      <DetailBreadcrumb
        language={frontmatter.language}
        level={frontmatter.level}
      />
      <Typography variant="h3" component="h1">
        {frontmatter.question}
      </Typography>
      <div dangerouslySetInnerHTML={{ __html: bodyHtml }} />
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        {frontmatter.tags.map((t) => (
          <Chip key={t} label={t} size="small" variant="outlined" />
        ))}
      </Stack>
      <Typography variant="caption" color="text.secondary">
        Updated {frontmatter.updatedAt}
      </Typography>
      <Divider />
      <DetailPrevNext
        currentId={frontmatter.id}
        language={frontmatter.language}
      />
      <RelatedQuestions
        currentId={frontmatter.id}
        language={frontmatter.language}
        tags={frontmatter.tags}
      />
    </Stack>
  );
}

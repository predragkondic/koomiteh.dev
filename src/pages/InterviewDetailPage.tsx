import { useParams } from 'react-router-dom';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import Skeleton from '@mui/material/Skeleton';
import Alert from '@mui/material/Alert';
import { useGetPostQuery } from '@/api/interviewApi';
import { NotFoundPage } from './NotFoundPage';

export function InterviewDetailPage() {
  const { language = '', slug = '' } = useParams();
  const { data, isLoading, error } = useGetPostQuery({ language, slug });

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
    return <Alert severity="error">Failed to load post.</Alert>;
  }

  if (!data) return null;

  const { frontmatter, bodyHtml } = data;

  return (
    <Stack spacing={2} sx={{ maxWidth: 720, mx: 'auto' }}>
      <Stack direction="row" spacing={1}>
        <Chip label={frontmatter.language} size="small" />
        <Chip label={frontmatter.level} size="small" variant="outlined" />
      </Stack>
      <Typography variant="h3" component="h1">
        {frontmatter.question}
      </Typography>
      <div dangerouslySetInnerHTML={{ __html: bodyHtml }} />
      <Stack direction="row" spacing={1}>
        {frontmatter.tags.map((t) => (
          <Chip key={t} label={t} size="small" variant="outlined" />
        ))}
      </Stack>
      <Typography variant="caption" color="text.secondary">
        Updated {frontmatter.updatedAt}
      </Typography>
    </Stack>
  );
}

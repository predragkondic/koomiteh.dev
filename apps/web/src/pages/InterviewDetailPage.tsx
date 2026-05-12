import { useParams } from 'react-router-dom';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import Skeleton from '@mui/material/Skeleton';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import { useTranslation } from 'react-i18next';
import { useGetPostQuery } from '@/api/interviewApi';
import { DetailBreadcrumb } from '@/features/interview/DetailBreadcrumb';
import { DetailPrevNext } from '@/features/interview/DetailPrevNext';
import { FavoriteButton } from '@/features/interview/FavoriteButton';
import { MarkdownBody } from '@/features/interview/MarkdownBody';
import { RelatedQuestions } from '@/features/interview/RelatedQuestions';
import { NotFoundPage } from './NotFoundPage';

function formatDate(value: string, locale: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(date);
}

export function InterviewDetailPage() {
  const { t, i18n } = useTranslation(['interview', 'common']);
  const { language = '', slug = '' } = useParams();
  const { data, isLoading, error, refetch } = useGetPostQuery({ language, slug });

  if (isLoading) {
    return (
      <Box role="status" aria-label={t('loading.detail')} aria-busy>
        <Stack spacing={2} sx={{ maxWidth: 720, mx: 'auto' }}>
          <Skeleton variant="text" height={48} width="80%" />
          <Skeleton variant="rounded" height={120} />
          <Skeleton variant="rounded" height={200} />
        </Stack>
      </Box>
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
            {t('common:actions.retry')}
          </Button>
        }
      >
        {t('common:errors.loadPost')}
      </Alert>
    );
  }

  if (!data) return null;

  const { frontmatter, bodyMd } = data;
  const locale = i18n.resolvedLanguage ?? i18n.language;

  return (
    <Stack spacing={3} sx={{ maxWidth: 720, mx: 'auto' }}>
      <DetailBreadcrumb
        language={frontmatter.language}
        level={frontmatter.level}
      />
      <Stack direction="row" spacing={1} alignItems="flex-start">
        <Typography variant="h3" component="h1" sx={{ flex: 1 }}>
          {frontmatter.question}
        </Typography>
        <FavoriteButton postId={frontmatter.id} size="medium" />
      </Stack>
      <MarkdownBody bodyMd={bodyMd} />
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        {frontmatter.tags.map((tag) => (
          <Chip key={tag} label={tag} size="small" variant="outlined" />
        ))}
      </Stack>
      <Typography variant="caption" color="text.secondary">
        {t('detail.updated', { date: formatDate(frontmatter.updatedAt, locale) })}
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

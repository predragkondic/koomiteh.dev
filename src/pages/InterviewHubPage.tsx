import { Link as RouterLink, Navigate } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useGetManifestQuery } from '@/api/interviewApi';
import type { ManifestLanguage } from '@/types';

export function InterviewHubPage() {
  const { data, isLoading, error, refetch } = useGetManifestQuery();

  if (isLoading) return <HubSkeleton />;

  if (error) {
    return (
      <Alert
        severity="error"
        action={
          <Button color="inherit" size="small" onClick={() => refetch()}>
            Erneut versuchen
          </Button>
        }
      >
        Sprachen konnten nicht geladen werden.
      </Alert>
    );
  }

  if (!data) return null;

  if (data.languages.length === 1) {
    return <Navigate to={`/interview/${data.languages[0].id}`} replace />;
  }

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Interview
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ pb: 3 }}>
        Wähle eine Sprache, um Fragen zu durchstöbern.
      </Typography>
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
        {data.languages.map((lang) => (
          <LanguageTile key={lang.id} lang={lang} />
        ))}
      </Box>
    </Box>
  );
}

function LanguageTile({ lang }: { lang: ManifestLanguage }) {
  return (
    <Card variant="outlined">
      <CardActionArea
        component={RouterLink}
        to={`/interview/${lang.id}`}
        sx={{ height: '100%', alignItems: 'flex-start' }}
      >
        <CardContent>
          <Stack spacing={1}>
            <Typography variant="h6" component="h2">
              {lang.displayName}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {lang.count === 1 ? '1 Frage' : `${lang.count} Fragen`}
            </Typography>
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

function HubSkeleton() {
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
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} variant="rounded" height={120} />
      ))}
    </Box>
  );
}

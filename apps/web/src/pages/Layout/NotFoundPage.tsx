import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import { Link as RouterLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface Props {
  scope?: 'app' | 'language' | 'post';
}

export function NotFoundPage({ scope = 'app' }: Props) {
  const { t } = useTranslation();
  return (
    <Box sx={{ textAlign: 'center', py: 8 }}>
      <Typography variant="h4" gutterBottom>
        {t('notFound.title')}
      </Typography>
      <Typography variant="body1" gutterBottom sx={{
        color: "text.secondary"
      }}>
        {t(`notFound.${scope}` as const)}
      </Typography>
      <Button component={RouterLink} to="/" sx={{ mt: 2 }}>
        {t('actions.back')}
      </Button>
    </Box>
  );
}

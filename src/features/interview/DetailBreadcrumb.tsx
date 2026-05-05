import { Link as RouterLink } from 'react-router-dom';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import { useTranslation } from 'react-i18next';
import type { Level } from '@/types';

interface Props {
  language: string;
  level: Level;
}

export function DetailBreadcrumb({ language, level }: Props) {
  const { t } = useTranslation('interview');
  return (
    <Stack
      direction="row"
      spacing={1}
      aria-label={t('detail.breadcrumbLabel')}
      role="navigation"
    >
      <Chip
        component={RouterLink}
        to={`/interview/${language}`}
        label={language}
        size="small"
        clickable
      />
      <Chip
        component={RouterLink}
        to={`/interview/${language}?level=${level}`}
        label={t(`level.${level}` as const)}
        size="small"
        variant="outlined"
        clickable
      />
    </Stack>
  );
}

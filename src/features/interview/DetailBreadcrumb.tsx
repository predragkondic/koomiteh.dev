import { Link as RouterLink } from 'react-router-dom';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import type { Level } from '@/types';

interface Props {
  language: string;
  level: Level;
}

export function DetailBreadcrumb({ language, level }: Props) {
  return (
    <Stack
      direction="row"
      spacing={1}
      aria-label="Breadcrumb"
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
        label={level}
        size="small"
        variant="outlined"
        clickable
      />
    </Stack>
  );
}

import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import { Link as RouterLink } from 'react-router-dom';

interface Props {
  scope?: 'app' | 'language' | 'post';
}

const COPY: Record<NonNullable<Props['scope']>, string> = {
  app: 'Page not found.',
  language: 'Unknown language.',
  post: 'This question does not exist.',
};

export function NotFoundPage({ scope = 'app' }: Props) {
  return (
    <Box sx={{ textAlign: 'center', py: 8 }}>
      <Typography variant="h4" gutterBottom>
        404
      </Typography>
      <Typography variant="body1" color="text.secondary" gutterBottom>
        {COPY[scope]}
      </Typography>
      <Button component={RouterLink} to="/" sx={{ mt: 2 }}>
        Back home
      </Button>
    </Box>
  );
}

import { useMemo } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useGetIndexQuery } from '@/api/interviewApi';
import { relatedByTags } from '@/utils/related';

interface Props {
  currentId: string;
  language: string;
  tags: readonly string[];
}

export function RelatedQuestions({ currentId, language, tags }: Props) {
  const { data } = useGetIndexQuery(language);
  const related = useMemo(
    () => relatedByTags(data ?? [], currentId, tags),
    [data, currentId, tags],
  );

  if (related.length === 0) return null;

  return (
    <Stack spacing={1.5} component="section" aria-label="Verwandte Fragen">
      <Typography variant="h6" component="h2">
        Verwandte Fragen
      </Typography>
      <Stack spacing={1}>
        {related.map((p) => (
          <Card key={p.id} variant="outlined">
            <CardActionArea
              component={RouterLink}
              to={`/interview/${p.language}/${p.slug}`}
            >
              <CardContent>
                <Stack spacing={1}>
                  <Typography variant="subtitle1" component="h3">
                    {p.question}
                  </Typography>
                  <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                    {p.tags.map((t) => (
                      <Chip key={t} label={t} size="small" variant="outlined" />
                    ))}
                  </Stack>
                </Stack>
              </CardContent>
            </CardActionArea>
          </Card>
        ))}
      </Stack>
    </Stack>
  );
}

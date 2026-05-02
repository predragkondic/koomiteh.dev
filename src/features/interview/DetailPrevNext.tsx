import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import { useFilteredPosts } from '@/hooks/useFilteredPosts';
import type { PostFrontmatter } from '@/types';

interface Props {
  currentId: string;
  language: string;
}

const FILTER_KEYS = ['level', 'tag', 'sort', 'q'] as const;

export function DetailPrevNext({ currentId, language }: Props) {
  const [searchParams] = useSearchParams();
  const { allFiltered } = useFilteredPosts();

  const hasFilters = FILTER_KEYS.some((k) => searchParams.has(k));
  const idx = allFiltered.findIndex((p) => p.id === currentId);
  const prev = idx > 0 ? allFiltered[idx - 1] : null;
  const next =
    idx >= 0 && idx < allFiltered.length - 1 ? allFiltered[idx + 1] : null;

  const search = hasFilters ? `?${searchParams.toString()}` : '';
  const linkFor = (p: PostFrontmatter) =>
    `/interview/${language}/${p.slug}${search}`;

  return (
    <Stack direction="row" spacing={1} justifyContent="space-between">
      <NavButton target={prev} label="← Vorherige" linkFor={linkFor} />
      <NavButton target={next} label="Nächste →" linkFor={linkFor} />
    </Stack>
  );
}

function NavButton({
  target,
  label,
  linkFor,
}: {
  target: PostFrontmatter | null;
  label: string;
  linkFor: (p: PostFrontmatter) => string;
}) {
  if (!target) {
    return (
      <Button disabled variant="outlined" size="small">
        {label}
      </Button>
    );
  }
  return (
    <Button
      component={RouterLink}
      to={linkFor(target)}
      variant="outlined"
      size="small"
    >
      {label}
    </Button>
  );
}

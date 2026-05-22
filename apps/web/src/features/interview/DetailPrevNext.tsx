import { useMemo } from 'react';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import { useTranslation } from 'react-i18next';
import { useSearchPostsQuery } from '@/api/interviewApi';
import {
  effectiveSort,
  readFilterState,
} from '@/hooks/useFilteredPosts';
import type { PostFrontmatter } from '@/types';

interface Props {
  currentId: string;
  language: string;
}

const FILTER_KEYS = ['level', 'tag', 'sort', 'q'] as const;
const NEIGHBOR_PAGE_SIZE = 100;

export function DetailPrevNext({ currentId, language }: Props) {
  const { t } = useTranslation('interview');
  const [searchParams] = useSearchParams();

  const filter = useMemo(() => readFilterState(searchParams), [searchParams]);
  const rawSort = searchParams.get('sort');
  const effSort = useMemo(
    () => effectiveSort(filter, rawSort),
    [filter, rawSort],
  );

  const { data } = useSearchPostsQuery({
    language,
    level: filter.level === 'both' ? undefined : filter.level,
    tag: filter.tags.length > 0 ? filter.tags : undefined,
    q: filter.q || undefined,
    sort: effSort,
    page: 1,
    pageSize: NEIGHBOR_PAGE_SIZE,
  });

  const allFiltered = data?.items ?? [];
  const hasFilters = FILTER_KEYS.some((k) => searchParams.has(k));
  const idx = allFiltered.findIndex((p) => p.id === currentId);
  const prev = idx > 0 ? allFiltered[idx - 1] : null;
  const next =
    idx >= 0 && idx < allFiltered.length - 1 ? allFiltered[idx + 1] : null;

  const search = hasFilters ? `?${searchParams.toString()}` : '';
  const linkFor = (p: PostFrontmatter) =>
    `/interview/${language}/${p.slug}${search}`;

  return (
    <Stack direction="row" spacing={1} sx={{
      justifyContent: "space-between"
    }}>
      <NavButton target={prev} label={t('detail.prev')} linkFor={linkFor} />
      <NavButton target={next} label={t('detail.next')} linkFor={linkFor} />
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

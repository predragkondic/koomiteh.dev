import Chip from '@mui/material/Chip';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import { useTranslation } from 'react-i18next';
import type { FilterState } from '@/hooks/useFilteredPosts';
import { DEFAULT_SORT, type Sort } from '@/utils/sort';

interface Props {
  filter: FilterState;
  onRemoveLevel: () => void;
  onRemoveTag: (tag: string) => void;
  onRemoveSort: () => void;
  onRemoveQ: () => void;
  onResetAll: () => void;
}

export function ActiveFilterChips({
  filter,
  onRemoveLevel,
  onRemoveTag,
  onRemoveSort,
  onRemoveQ,
  onResetAll,
}: Props) {
  const { t } = useTranslation(['interview', 'common']);
  const hasLevel = filter.level !== 'both';
  const hasTags = filter.tags.length > 0;
  const hasSort = filter.sort !== DEFAULT_SORT;
  const hasQ = filter.q !== '';
  const anyActive = hasLevel || hasTags || hasSort || hasQ;

  if (!anyActive) return null;

  const levelLabel =
    filter.level === 'junior' ? t('level.junior') : t('level.senior');

  return (
    <Stack
      direction="row"
      spacing={1}
      flexWrap="wrap"
      useFlexGap
      sx={{ pb: 2 }}
      role="region"
      aria-label={t('activeFilters.regionLabel')}
    >
      {hasQ && (
        <Chip
          label={t('activeFilters.search', { value: filter.q })}
          size="small"
          onDelete={onRemoveQ}
        />
      )}
      {hasLevel && (
        <Chip
          label={t('activeFilters.level', { value: levelLabel })}
          size="small"
          onDelete={onRemoveLevel}
        />
      )}
      {filter.tags.map((tag) => (
        <Chip
          key={tag}
          label={tag}
          size="small"
          onDelete={() => onRemoveTag(tag)}
        />
      ))}
      {hasSort && (
        <Chip
          label={t('activeFilters.sort', {
            value: t(`sort.${sortKey(filter.sort)}` as const),
          })}
          size="small"
          onDelete={onRemoveSort}
        />
      )}
      <Link
        component="button"
        type="button"
        underline="hover"
        onClick={onResetAll}
        sx={{ alignSelf: 'center' }}
      >
        {t('common:actions.reset')}
      </Link>
    </Stack>
  );
}

function sortKey(sort: Sort): 'newest' | 'oldest' | 'relevance' {
  if (sort === 'oldest' || sort === 'relevance') return sort;
  return 'newest';
}

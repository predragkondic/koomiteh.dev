import Chip from '@mui/material/Chip';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import type { FilterState } from '@/hooks/useFilteredPosts';
import { DEFAULT_SORT } from '@/utils/sort';

interface Props {
  filter: FilterState;
  onRemoveLevel: () => void;
  onRemoveTag: (tag: string) => void;
  onRemoveSort: () => void;
  onResetAll: () => void;
}

export function ActiveFilterChips({
  filter,
  onRemoveLevel,
  onRemoveTag,
  onRemoveSort,
  onResetAll,
}: Props) {
  const hasLevel = filter.level !== 'both';
  const hasTags = filter.tags.length > 0;
  const hasSort = filter.sort !== DEFAULT_SORT;
  const anyActive = hasLevel || hasTags || hasSort;

  if (!anyActive) return null;

  return (
    <Stack
      direction="row"
      spacing={1}
      flexWrap="wrap"
      useFlexGap
      sx={{ pb: 2 }}
      role="region"
      aria-label="Aktive Filter"
    >
      {hasLevel && (
        <Chip
          label={`Level: ${filter.level === 'junior' ? 'Junior' : 'Senior'}`}
          size="small"
          onDelete={onRemoveLevel}
        />
      )}
      {filter.tags.map((t) => (
        <Chip
          key={t}
          label={t}
          size="small"
          onDelete={() => onRemoveTag(t)}
        />
      ))}
      {hasSort && (
        <Chip
          label={`Sortierung: ${sortLabel(filter.sort)}`}
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
        Zurücksetzen
      </Link>
    </Stack>
  );
}

function sortLabel(sort: FilterState['sort']): string {
  switch (sort) {
    case 'oldest':
      return 'Älteste';
    case 'relevance':
      return 'Relevanz';
    case 'newest':
    default:
      return 'Neueste';
  }
}

import { useCallback } from 'react';
import {
  Link as RouterLink,
  useSearchParams,
} from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Pagination from '@mui/material/Pagination';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import {
  useFilteredPosts,
  writeFilterState,
  type FilterState,
} from '@/hooks/useFilteredPosts';
import type { PostFrontmatter } from '@/types';
import { ActiveFilterChips } from '@/features/interview/ActiveFilterChips';
import { FavoriteButton } from '@/features/interview/FavoriteButton';
import { FilterBar, type FilterChange } from '@/features/interview/FilterBar';
import { NotFoundPage } from './NotFoundPage';

const MAX_VISIBLE_TAGS = 3;
const EMPTY_FILTER: FilterState = {
  level: 'both',
  tags: [],
  sort: 'newest',
  page: 1,
  q: '',
};

export function InterviewListingPage() {
  const { t } = useTranslation(['interview', 'common']);
  const {
    items,
    totalFiltered,
    page,
    pageCount,
    isIndexLoading,
    indexError,
    searchError,
    filter,
    tagOptions,
  } = useFilteredPosts();
  const [, setSearchParams] = useSearchParams();

  const writeState = useCallback(
    (next: FilterState) => {
      setSearchParams(writeFilterState(next), { replace: false });
    },
    [setSearchParams],
  );

  const onFilterChange = useCallback(
    (change: FilterChange) => {
      writeState({ ...filter, ...change, page: 1 });
    },
    [filter, writeState],
  );

  const onPageChange = useCallback(
    (_: unknown, p: number) => {
      writeState({ ...filter, page: p });
    },
    [filter, writeState],
  );

  const onResetAll = useCallback(() => {
    writeState(EMPTY_FILTER);
  }, [writeState]);

  if (indexError) {
    const status = (indexError as { status?: number }).status;
    if (status === 404) return <NotFoundPage scope="language" />;
    return (
      <Alert
        severity="error"
        action={
          <Button color="inherit" size="small" onClick={onResetAll}>
            {t('common:actions.reset')}
          </Button>
        }
      >
        {t('common:errors.loadPosts')}
      </Alert>
    );
  }

  return (
    <Box>
      <FilterBar
        value={{
          level: filter.level,
          tags: filter.tags,
          sort: filter.sort,
          q: filter.q,
        }}
        tagOptions={tagOptions}
        searchDisabled={Boolean(searchError)}
        searchDisabledReason={
          searchError ? t('common:search.indexErrorWithFilters') : undefined
        }
        relevanceEnabled={Boolean(filter.q)}
        onChange={onFilterChange}
      />
      <ActiveFilterChips
        filter={filter}
        onRemoveLevel={() =>
          writeState({ ...filter, level: 'both', page: 1 })
        }
        onRemoveTag={(tag) =>
          writeState({
            ...filter,
            tags: filter.tags.filter((t) => t !== tag),
            page: 1,
          })
        }
        onRemoveSort={() =>
          writeState({ ...filter, sort: 'newest', page: 1 })
        }
        onRemoveQ={() => writeState({ ...filter, q: '', page: 1 })}
        onResetAll={onResetAll}
      />

      {isIndexLoading ? (
        <ListingSkeleton ariaLabel={t('loading.listing')} />
      ) : totalFiltered === 0 ? (
        <EmptyState onReset={onResetAll} />
      ) : (
        <>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ pb: 2 }}
            aria-live="polite"
          >
            {t('results', { count: totalFiltered })}
          </Typography>
          <CardGrid>
            {items.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </CardGrid>
          {pageCount > 1 && (
            <Stack alignItems="center" sx={{ pt: 4 }}>
              <Pagination
                count={pageCount}
                page={page}
                onChange={onPageChange}
                color="primary"
              />
            </Stack>
          )}
        </>
      )}
    </Box>
  );
}

function CardGrid({ children }: { children: React.ReactNode }) {
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
      {children}
    </Box>
  );
}

function PostCard({ post }: { post: PostFrontmatter }) {
  const visibleTags = post.tags.slice(0, MAX_VISIBLE_TAGS);
  const overflow = post.tags.length - visibleTags.length;
  const [searchParams] = useSearchParams();
  const search = searchParams.toString();
  const to = `/interview/${post.language}/${post.slug}${search ? `?${search}` : ''}`;

  return (
    <Card variant="outlined" sx={{ position: 'relative' }}>
      <FavoriteButton
        postId={post.id}
        sx={{ position: 'absolute', top: 4, right: 4, zIndex: 1 }}
      />
      <CardActionArea
        component={RouterLink}
        to={to}
        sx={{ height: '100%', alignItems: 'flex-start' }}
      >
        <CardContent>
          <Stack spacing={1.5}>
            <Stack direction="row" spacing={1} sx={{ pr: 4 }}>
              <Chip label={post.language} size="small" />
              <Chip label={post.level} size="small" variant="outlined" />
            </Stack>
            <Typography variant="h6" component="h2">
              {post.question}
            </Typography>
            <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
              {visibleTags.map((t) => (
                <Chip key={t} label={t} size="small" variant="outlined" />
              ))}
              {overflow > 0 && (
                <Chip
                  label={`+${overflow}`}
                  size="small"
                  variant="outlined"
                />
              )}
            </Stack>
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

function ListingSkeleton({ ariaLabel }: { ariaLabel: string }) {
  return (
    <Box role="status" aria-label={ariaLabel} aria-busy>
      <CardGrid>
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} variant="rounded" height={160} />
        ))}
      </CardGrid>
    </Box>
  );
}

function EmptyState({ onReset }: { onReset: () => void }) {
  const { t } = useTranslation('interview');
  return (
    <Box sx={{ textAlign: 'center', py: 8 }}>
      <Typography variant="h6" gutterBottom>
        {t('empty.title')}
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        {t('empty.body')}
      </Typography>
      <Button onClick={onReset} sx={{ mt: 2 }}>
        {t('empty.reset')}
      </Button>
    </Box>
  );
}

import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { skipToken } from '@reduxjs/toolkit/query';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import {
  useGetManifestQuery,
  useSearchPostsQuery,
} from '@/api/interviewApi';
import type { PostFrontmatter } from '@/types';

const DEBOUNCE_MS = 250;
const PALETTE_PAGE_SIZE = 20;

interface Props {
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ open, onClose }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [highlighted, setHighlighted] = useState(0);
  const listRef = useRef<HTMLUListElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const handle = window.setTimeout(() => setDebouncedQ(q.trim()), DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [q]);

  const { data: manifest } = useGetManifestQuery();
  const showLanguageBadge = (manifest?.languages.length ?? 0) >= 2;

  const trimmed = debouncedQ.trim();
  const queryArg =
    open && trimmed
      ? { q: trimmed, pageSize: PALETTE_PAGE_SIZE, sort: 'relevance' as const }
      : skipToken;
  const { data, error: searchError } = useSearchPostsQuery(queryArg);

  const hits: PostFrontmatter[] = useMemo(() => {
    if (!trimmed) return [];
    return data?.items ?? [];
  }, [trimmed, data]);

  useEffect(() => {
    setHighlighted(0);
  }, [hits]);

  useEffect(() => {
    if (!open) {
      setQ('');
      setDebouncedQ('');
      setHighlighted(0);
    }
  }, [open]);

  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(
      `[data-hit-index="${highlighted}"]`,
    );
    el?.scrollIntoView?.({ block: 'nearest' });
  }, [highlighted]);

  function selectHit(hit: PostFrontmatter) {
    navigate(`/interview/${hit.language}/${hit.slug}`);
    onClose();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      if (hits.length === 0) return;
      e.preventDefault();
      setHighlighted((i) => (i + 1) % hits.length);
    } else if (e.key === 'ArrowUp') {
      if (hits.length === 0) return;
      e.preventDefault();
      setHighlighted((i) => (i - 1 + hits.length) % hits.length);
    } else if (e.key === 'Enter') {
      if (hits.length === 0) return;
      e.preventDefault();
      const hit = hits[highlighted];
      if (hit) selectHit(hit);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      onKeyDown={onKeyDown}
      aria-labelledby="command-palette-input"
      slotProps={{
        transition: { onEntered: () => inputRef.current?.focus() },
      }}
    >
      <Box sx={{ p: 2 }}>
        <TextField
          autoFocus
          fullWidth
          type="search"
          placeholder={t('search.globalPlaceholder')}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          inputRef={inputRef}
          slotProps={{
            htmlInput: {
              id: 'command-palette-input',
              'aria-label': t('search.globalLabel'),
            },
          }}
        />
        <PaletteBody
          q={q}
          hits={hits}
          highlighted={highlighted}
          searchError={searchError}
          showLanguageBadge={showLanguageBadge}
          listRef={listRef}
          onSelect={selectHit}
          onHover={setHighlighted}
        />
      </Box>
    </Dialog>
  );
}

interface BodyProps {
  q: string;
  hits: PostFrontmatter[];
  highlighted: number;
  searchError: unknown;
  showLanguageBadge: boolean;
  listRef: React.RefObject<HTMLUListElement | null>;
  onSelect: (hit: PostFrontmatter) => void;
  onHover: (index: number) => void;
}

function PaletteBody({
  q,
  hits,
  highlighted,
  searchError,
  showLanguageBadge,
  listRef,
  onSelect,
  onHover,
}: BodyProps) {
  const { t } = useTranslation(['common', 'interview']);
  if (searchError) {
    return (
      <Typography color="error.main" sx={{ pt: 2, px: 1 }}>
        {t('common:search.indexError')}
      </Typography>
    );
  }
  if (q.trim() === '') {
    return (
      <Typography color="text.secondary" sx={{ pt: 2, px: 1 }}>
        {t('common:search.promptHint')}
      </Typography>
    );
  }
  if (hits.length === 0) {
    return (
      <Typography color="text.secondary" sx={{ pt: 2, px: 1 }}>
        {t('common:search.noHits')}
      </Typography>
    );
  }
  return (
    <List
      ref={listRef}
      role="listbox"
      sx={{ pt: 1, maxHeight: 400, overflowY: 'auto' }}
    >
      {hits.map((hit, i) => (
        <ListItemButton
          key={hit.id}
          data-hit-index={i}
          selected={i === highlighted}
          onClick={() => onSelect(hit)}
          onMouseEnter={() => onHover(i)}
        >
          <Stack spacing={1} sx={{ width: '100%' }}>
            <Typography variant="body1" component="span">
              {hit.question}
            </Typography>
            <Stack direction="row" spacing={1}>
              <Chip
                label={t(`interview:level.${hit.level}` as const)}
                size="small"
                variant="outlined"
              />
              {showLanguageBadge && (
                <Chip label={hit.language} size="small" />
              )}
            </Stack>
          </Stack>
        </ListItemButton>
      ))}
    </List>
  );
}

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
import { useGetManifestQuery, useGetSearchIndexQuery } from '@/api/interviewApi';
import {
  loadSearchIndex,
  runGlobalSearch,
  type GlobalSearchHit,
} from '@/utils/search';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ open, onClose }: Props) {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [highlighted, setHighlighted] = useState(0);
  const listRef = useRef<HTMLUListElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const { data: manifest } = useGetManifestQuery();
  const { data: searchJson, error: searchError } = useGetSearchIndexQuery(
    open ? undefined : skipToken,
  );

  const showLanguageBadge = (manifest?.languages.length ?? 0) >= 2;

  const hits: GlobalSearchHit[] = useMemo(() => {
    if (!q.trim() || !searchJson) return [];
    try {
      const idx = loadSearchIndex(searchJson);
      return runGlobalSearch(idx, q);
    } catch {
      return [];
    }
  }, [q, searchJson]);

  useEffect(() => {
    setHighlighted(0);
  }, [q]);

  useEffect(() => {
    if (!open) {
      setQ('');
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

  function selectHit(hit: GlobalSearchHit) {
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
          placeholder="Frage suchen…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          inputRef={inputRef}
          slotProps={{
            htmlInput: {
              id: 'command-palette-input',
              'aria-label': 'Globale Suche',
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
  hits: GlobalSearchHit[];
  highlighted: number;
  searchError: unknown;
  showLanguageBadge: boolean;
  listRef: React.RefObject<HTMLUListElement | null>;
  onSelect: (hit: GlobalSearchHit) => void;
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
  if (searchError) {
    return (
      <Typography color="error.main" sx={{ pt: 2, px: 1 }}>
        Suchindex konnte nicht geladen werden.
      </Typography>
    );
  }
  if (q.trim() === '') {
    return (
      <Typography color="text.secondary" sx={{ pt: 2, px: 1 }}>
        Tippe, um über alle Sprachen zu suchen.
      </Typography>
    );
  }
  if (hits.length === 0) {
    return (
      <Typography color="text.secondary" sx={{ pt: 2, px: 1 }}>
        Keine Treffer.
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
              <Chip label={hit.level} size="small" variant="outlined" />
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

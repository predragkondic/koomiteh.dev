import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import type { LevelFilter } from '@/hooks/useFilteredPosts';
import { type Sort } from '@/utils/sort';

export interface FilterChange {
  level: LevelFilter;
  tags: string[];
  sort: Sort;
}

interface Props {
  value: FilterChange;
  tagOptions: readonly string[];
  onChange: (next: FilterChange) => void;
}

export function FilterBar({ value, tagOptions, onChange }: Props) {
  return (
    <Box
      sx={{
        position: 'sticky',
        top: 0,
        zIndex: (theme) => theme.zIndex.appBar - 1,
        bgcolor: 'background.default',
        py: 2,
      }}
    >
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        alignItems={{ md: 'center' }}
      >
        <ToggleButtonGroup
          exclusive
          size="small"
          value={value.level}
          onChange={(_, next: LevelFilter | null) => {
            if (next) onChange({ ...value, level: next });
          }}
          aria-label="Level"
        >
          <ToggleButton value="junior">Junior</ToggleButton>
          <ToggleButton value="senior">Senior</ToggleButton>
          <ToggleButton value="both">Beide</ToggleButton>
        </ToggleButtonGroup>

        <Autocomplete
          multiple
          size="small"
          options={[...tagOptions]}
          value={value.tags}
          onChange={(_, next) => onChange({ ...value, tags: next })}
          sx={{ flex: 1, minWidth: 220 }}
          renderInput={(params) => (
            <TextField {...params} label="Tags" placeholder="Tag wählen" />
          )}
        />

        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel id="sort-label">Sortierung</InputLabel>
          <Select
            labelId="sort-label"
            label="Sortierung"
            value={value.sort}
            onChange={(e) =>
              onChange({ ...value, sort: e.target.value as Sort })
            }
          >
            <MenuItem value="newest">Neueste</MenuItem>
            <MenuItem value="oldest">Älteste</MenuItem>
            <MenuItem value="relevance" disabled>
              Relevanz
            </MenuItem>
          </Select>
        </FormControl>
      </Stack>
    </Box>
  );
}

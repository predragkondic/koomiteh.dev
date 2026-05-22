import { useEffect, useRef, useState } from "react";
import Autocomplete from "@mui/material/Autocomplete";
import Box from "@mui/material/Box";
import FormControl from "@mui/material/FormControl";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Tooltip from "@mui/material/Tooltip";
import { useTranslation } from "react-i18next";
import type { LevelFilter } from "@/hooks/useFilteredPosts";
import { type Sort } from "@/utils/sort";

const SEARCH_DEBOUNCE_MS = 250;

export interface FilterChange {
  level: LevelFilter;
  tags: string[];
  sort: Sort;
  q: string;
}

interface Props {
  value: FilterChange;
  tagOptions: readonly string[];
  searchDisabled?: boolean;
  searchDisabledReason?: string;
  relevanceEnabled?: boolean;
  onChange: (next: FilterChange) => void;
}

export function FilterBar({
  value,
  tagOptions,
  searchDisabled = false,
  searchDisabledReason,
  relevanceEnabled = false,
  onChange,
}: Props) {
  const { t } = useTranslation("posts");
  const [localQ, setLocalQ] = useState(value.q);
  const lastCommitted = useRef(value.q);

  useEffect(() => {
    if (value.q !== lastCommitted.current) {
      lastCommitted.current = value.q;
      setLocalQ(value.q);
    }
  }, [value.q]);

  useEffect(() => {
    if (localQ === lastCommitted.current) return;
    const t = window.setTimeout(() => {
      lastCommitted.current = localQ;
      onChange({ ...value, q: localQ });
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [localQ, value, onChange]);

  const searchLabel = t("filterBar.searchLabel");
  const searchField = (
    <TextField
      size="small"
      type="search"
      label={searchLabel}
      placeholder={t("filterBar.searchPlaceholder")}
      value={localQ}
      disabled={searchDisabled}
      onChange={(e) => setLocalQ(e.target.value)}
      sx={{ flex: 1, minWidth: 200 }}
      slotProps={{
        input: {
          endAdornment: localQ ? (
            <InputAdornment position="end">
              <IconButton
                aria-label={t("filterBar.clearSearch")}
                size="small"
                edge="end"
                onClick={() => setLocalQ("")}
              >
                ×
              </IconButton>
            </InputAdornment>
          ) : null,
        },
        htmlInput: { "aria-label": searchLabel },
      }}
    />
  );

  return (
    <Box
      sx={{
        position: "sticky",
        top: 0,
        zIndex: (theme) => theme.zIndex.appBar - 1,
        bgcolor: "background.default",
        py: 2,
      }}
    >
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={2}
        sx={{
          alignItems: { md: "center" },
        }}
      >
        {searchDisabled && searchDisabledReason ? (
          <Tooltip title={searchDisabledReason}>
            <Box sx={{ flex: 1, minWidth: 200 }}>{searchField}</Box>
          </Tooltip>
        ) : (
          searchField
        )}

        <ToggleButtonGroup
          exclusive
          size="small"
          value={value.level}
          onChange={(_, next: LevelFilter | null) => {
            if (next) onChange({ ...value, level: next });
          }}
          aria-label={t("filterBar.levelGroupLabel")}
        >
          <ToggleButton value="junior">{t("level.junior")}</ToggleButton>
          <ToggleButton value="senior">{t("level.senior")}</ToggleButton>
          <ToggleButton value="both">{t("level.both")}</ToggleButton>
        </ToggleButtonGroup>

        <Autocomplete
          multiple
          size="small"
          options={[...tagOptions]}
          value={value.tags}
          onChange={(_, next) => onChange({ ...value, tags: next })}
          sx={{ flex: 1, minWidth: 220 }}
          renderInput={(params) => (
            <TextField
              {...params}
              label={t("filterBar.tagsLabel")}
              placeholder={t("filterBar.tagsPlaceholder")}
            />
          )}
        />

        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel id="sort-label">{t("filterBar.sortLabel")}</InputLabel>
          <Select
            labelId="sort-label"
            label={t("filterBar.sortLabel")}
            value={value.sort}
            onChange={(e) =>
              onChange({ ...value, sort: e.target.value as Sort })
            }
          >
            <MenuItem value="newest">{t("sort.newest")}</MenuItem>
            <MenuItem value="oldest">{t("sort.oldest")}</MenuItem>
            <MenuItem value="relevance" disabled={!relevanceEnabled}>
              {t("sort.relevance")}
            </MenuItem>
          </Select>
        </FormControl>
      </Stack>
    </Box>
  );
}

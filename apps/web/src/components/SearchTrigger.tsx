import { useMemo } from 'react';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import SearchIcon from '@mui/icons-material/Search';
import { useTranslation } from 'react-i18next';

function detectShortcutHint(): string {
  if (typeof navigator === 'undefined') return 'Ctrl+K';
  const ua = navigator.userAgent;
  return /Mac|iPhone|iPad|iPod/.test(ua) ? '⌘K' : 'Ctrl+K';
}

export interface SearchTriggerProps {
  onClick: () => void;
  withShortcutHint?: boolean;
}

export function SearchTrigger({ onClick, withShortcutHint }: SearchTriggerProps) {
  const { t } = useTranslation();
  const shortcut = useMemo(detectShortcutHint, []);
  const label = t('search.openLabel');

  const button = (
    <IconButton
      onClick={onClick}
      size="small"
      color="inherit"
      aria-label={label}
      aria-keyshortcuts="Meta+K"
    >
      <SearchIcon fontSize="small" />
    </IconButton>
  );

  if (!withShortcutHint) return button;

  return <Tooltip title={`${label} ${shortcut}`}>{button}</Tooltip>;
}

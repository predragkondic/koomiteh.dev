import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import { useTranslation } from 'react-i18next';
import { isLocale, SUPPORTED_LOCALES } from '@/i18n';

export function LanguageToggle() {
  const { t, i18n } = useTranslation();
  const current = (SUPPORTED_LOCALES as readonly string[]).includes(
    i18n.resolvedLanguage ?? '',
  )
    ? (i18n.resolvedLanguage as string)
    : 'en';

  return (
    <ToggleButtonGroup
      exclusive
      size="small"
      value={current}
      onChange={(_, next: unknown) => {
        if (isLocale(next) && next !== current) {
          void i18n.changeLanguage(next);
        }
      }}
      aria-label={t('language.switcherLabel')}
    >
      {SUPPORTED_LOCALES.map((lng) => (
        <ToggleButton key={lng} value={lng} sx={{ px: 1.25 }}>
          {t(`language.${lng}` as const)}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}

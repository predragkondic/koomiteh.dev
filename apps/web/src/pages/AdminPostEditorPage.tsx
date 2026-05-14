import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Autocomplete from '@mui/material/Autocomplete';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import { LANGUAGES } from '@koomiteh/shared';
import type { AdminPostCreate } from '@koomiteh/shared';
import {
  useCreateAdminPostMutation,
  useGetAdminPostQuery,
  useUpdateAdminPostMutation,
} from '@/api/adminApi';
import { useConfirm } from '@/components/ConfirmProvider';
import { MarkdownBody } from '@/features/interview/MarkdownBody';

const LEVELS = ['junior', 'senior'] as const;

type FormState = AdminPostCreate;
type BodyViewMode = 'split' | 'editor' | 'preview';

const EMPTY: FormState = {
  slug: '',
  question: '',
  language: LANGUAGES[0]?.id ?? 'typescript',
  level: 'junior',
  tags: [],
  bodyMd: '',
};

function normalizeKebab(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function normalizeTags(tags: string[]): string[] {
  return Array.from(
    new Set(tags.map(normalizeKebab).filter((tag) => tag.length > 0)),
  );
}

function formatRelativeTime(
  value: string | null | undefined,
  locale: string,
  fallback: string,
): string {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;

  const diffMs = date.getTime() - Date.now();
  const diffMinutes = Math.round(diffMs / 60_000);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  if (Math.abs(diffMinutes) < 60) return rtf.format(diffMinutes, 'minute');

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) return rtf.format(diffHours, 'hour');

  const diffDays = Math.round(diffHours / 24);
  if (Math.abs(diffDays) < 30) return rtf.format(diffDays, 'day');

  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

function FieldLabel({
  label,
  hint,
  required = false,
}: {
  label: string;
  hint?: string;
  required?: boolean;
}) {
  return (
    <Stack
      direction="row"
      justifyContent="space-between"
      alignItems="baseline"
      sx={{ mb: 2, gap: 2 }}
    >
      <Typography variant="body2" sx={{ fontWeight: 500 }}>
        {label}
        {required ? (
          <Box component="span" sx={{ color: 'primary.main', ml: 0.5 }}>
            *
          </Box>
        ) : null}
      </Typography>
      {hint ? (
        <Typography variant="overline" color="text.disabled" sx={{ textAlign: 'right' }}>
          {hint}
        </Typography>
      ) : null}
    </Stack>
  );
}

function LoadingLayout() {
  return (
    <Box sx={{ maxWidth: 1240, mx: 'auto', px: { xs: 3, md: 8 }, py: 7 }}>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="flex-end"
        sx={{ mb: 6 }}
      >
        <Skeleton variant="rounded" width={220} height={44} />
        <Stack direction="row" spacing={1.25}>
          <Skeleton variant="rounded" width={96} height={36} />
          <Skeleton variant="rounded" width={144} height={36} />
        </Stack>
      </Stack>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) 260px' },
          gap: 5.5,
          alignItems: 'start',
        }}
      >
        <Stack spacing={4}>
          <Skeleton variant="rounded" height={96} />
          <Skeleton variant="rounded" height={72} />
          <Skeleton variant="rounded" height={420} />
        </Stack>
        <Card variant="outlined" sx={{ p: 4 }}>
          <Stack spacing={4}>
            <Skeleton variant="text" width={84} height={18} />
            <Skeleton variant="rounded" height={64} />
            <Skeleton variant="rounded" height={64} />
            <Skeleton variant="rounded" height={64} />
            <Skeleton variant="rounded" height={88} />
          </Stack>
        </Card>
      </Box>
    </Box>
  );
}

interface Props {
  mode: 'new' | 'edit';
}

export function AdminPostEditorPage({ mode }: Props) {
  const { t, i18n } = useTranslation(['admin', 'common']);
  const confirm = useConfirm();
  const { id = '' } = useParams();
  const navigate = useNavigate();

  const skip = mode === 'new' || !id;
  const { data: existing, isLoading: isLoadingExisting } =
    useGetAdminPostQuery(id, { skip });

  const [form, setForm] = useState<FormState>(EMPTY);
  const [tagDraft, setTagDraft] = useState('');
  const [initialSnapshot, setInitialSnapshot] = useState<FormState>(EMPTY);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [bodyViewMode, setBodyViewMode] = useState<BodyViewMode>('split');
  const [slugTouched, setSlugTouched] = useState(false);

  useEffect(() => {
    if (mode === 'edit' && existing) {
      const next: FormState = {
        slug: existing.frontmatter.slug,
        question: existing.frontmatter.question,
        language: existing.frontmatter.language,
        level: existing.frontmatter.level,
        tags: existing.frontmatter.tags,
        bodyMd: existing.bodyMd,
      };
      setForm(next);
      setInitialSnapshot(next);
      setTagDraft('');
      setSlugTouched(false);
    } else if (mode === 'new') {
      setForm(EMPTY);
      setInitialSnapshot(EMPTY);
      setTagDraft('');
      setSlugTouched(false);
    }
  }, [mode, existing]);

  const isDirty = useMemo(
    () =>
      form.slug !== initialSnapshot.slug ||
      form.question !== initialSnapshot.question ||
      form.language !== initialSnapshot.language ||
      form.level !== initialSnapshot.level ||
      form.bodyMd !== initialSnapshot.bodyMd ||
      JSON.stringify(form.tags) !== JSON.stringify(initialSnapshot.tags),
    [form, initialSnapshot],
  );

  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  const [createPost, createState] = useCreateAdminPostMutation();
  const [updatePost, updateState] = useUpdateAdminPostMutation();

  const isSaving = createState.isLoading || updateState.isLoading;

  function commitTag(rawTag: string) {
    const nextTag = normalizeKebab(rawTag);
    if (!nextTag) return;
    setForm((prev) => ({
      ...prev,
      tags: normalizeTags([...prev.tags, nextTag]),
    }));
    setTagDraft('');
  }

  function mapErrorCode(code: string | undefined): string {
    switch (code) {
      case 'slug_conflict':
        return t('editor.errorSlugConflict');
      case 'content_id_conflict':
        return t('editor.errorContentIdConflict');
      case 'invalid_language':
        return t('editor.errorInvalidLanguage');
      case 'invalid_body':
        return t('editor.errorInvalidBody');
      default:
        return t('editor.errorGeneric');
    }
  }

  function normalizeForSubmit(current: FormState): FormState {
    return {
      ...current,
      slug: normalizeKebab(current.slug),
      tags: normalizeTags(current.tags),
    };
  }

  async function handleSave() {
    setErrorMsg(null);
    const nextForm = normalizeForSubmit(form);
    setForm(nextForm);
    try {
      if (mode === 'new') {
        const result = await createPost(nextForm).unwrap();
        setInitialSnapshot(nextForm);
        navigate(`/admin/posts/${encodeURIComponent(result.frontmatter.id)}/edit`);
      } else {
        await updatePost({ id, patch: nextForm }).unwrap();
        setInitialSnapshot(nextForm);
      }
    } catch (err) {
      const code = (err as { data?: { error?: string } }).data?.error;
      setErrorMsg(mapErrorCode(code));
    }
  }

  async function handleCancel() {
    if (isDirty) {
      const ok = await confirm({
        title: t('editor.unsavedWarning.title'),
        content: t('editor.unsavedWarning.content'),
        confirmLabel: t('editor.unsavedWarning.confirmLabel'),
        variant: 'discard',
      });
      if (!ok) return;
    }
    navigate('/admin');
  }

  function handleQuestionChange(value: string) {
    setForm((prev) => ({
      ...prev,
      question: value,
      slug:
        !slugTouched || prev.slug.trim().length === 0
          ? normalizeKebab(value)
          : prev.slug,
    }));
  }

  function handleSlugBlur() {
    setForm((prev) => ({ ...prev, slug: normalizeKebab(prev.slug) }));
  }

  const title = mode === 'new' ? t('editor.newTitle') : t('editor.editTitle');
  const statusLabel =
    mode === 'new'
      ? t('editor.statusDraft')
      : existing?.frontmatter.deletedAt
        ? t('editor.statusDeleted')
        : t('editor.statusPublished');
  const lastEditedLabel =
    mode === 'edit'
      ? formatRelativeTime(
          existing?.frontmatter.updatedAt,
          i18n.resolvedLanguage ?? i18n.language,
          t('editor.notSaved'),
        )
      : t('editor.notSaved');

  if (mode === 'edit' && isLoadingExisting) return <LoadingLayout />;

  return (
    <Box sx={{ maxWidth: 1240, mx: 'auto', px: { xs: 3, md: 8 }, py: 7 }}>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="flex-end"
        sx={{ mb: 6, gap: 2 }}
      >
        <Typography variant="h2" component="h1">
          {title}
        </Typography>
        <Stack direction="row" spacing={1.25}>
          <Button onClick={handleCancel} disabled={isSaving}>
            {t('editor.cancel')}
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={isSaving || !isDirty}
          >
            {isSaving ? t('editor.saving') : t('editor.saveChanges')}
          </Button>
        </Stack>
      </Stack>

      {errorMsg ? (
        <Alert severity="error" sx={{ mb: 4 }}>
          {errorMsg}
        </Alert>
      ) : null}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) 260px' },
          gap: 5.5,
          alignItems: 'start',
        }}
      >
        <Stack spacing={4}>
          <Box>
            <FieldLabel
              label={t('editor.fields.question')}
              hint={t('editor.questionHint')}
              required
            />
            <TextField
              value={form.question}
              onChange={(e) => handleQuestionChange(e.target.value)}
              multiline
              minRows={2}
              fullWidth
              required
              size="medium"
              inputProps={{ 'aria-label': t('editor.fields.question') }}
            />
          </Box>

          <Box>
            <FieldLabel label={t('editor.fields.tags')} hint={t('editor.tagsHint')} />
            <Autocomplete
              multiple
              freeSolo
              options={[]}
              value={form.tags}
              inputValue={tagDraft}
              onInputChange={(_event, nextValue, reason) => {
                if (reason === 'input') setTagDraft(nextValue);
              }}
              onChange={(_event, nextValue) => {
                setForm((prev) => ({
                  ...prev,
                  tags: normalizeTags(nextValue.map((tag) => String(tag))),
                }));
              }}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip
                    label={option}
                    size="small"
                    variant="tag"
                    {...getTagProps({ index })}
                  />
                ))
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="Add tag…"
                  helperText={t('editor.fields.tagsHelper')}
                  inputProps={{
                    ...params.inputProps,
                    'aria-label': t('editor.fields.tags'),
                  }}
                  onKeyDown={(event) => {
                    if (
                      (event.key === 'Enter' || event.key === ',') &&
                      tagDraft.trim().length > 0
                    ) {
                      event.preventDefault();
                      commitTag(tagDraft);
                    }
                  }}
                  onBlur={() => {
                    if (tagDraft.trim().length > 0) commitTag(tagDraft);
                  }}
                />
              )}
            />
          </Box>

          <Card variant="outlined">
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              sx={{ px: 3.5, py: 2.5, gap: 2 }}
            >
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {t('editor.body')}
              </Typography>
              <ToggleButtonGroup
                exclusive
                size="small"
                value={bodyViewMode}
                onChange={(_event, next: BodyViewMode | null) => {
                  if (next) setBodyViewMode(next);
                }}
                aria-label="Body view mode"
              >
                <ToggleButton value="split">{t('editor.bodyModeSplit')}</ToggleButton>
                <ToggleButton value="editor">{t('editor.bodyModeEditor')}</ToggleButton>
                <ToggleButton value="preview">{t('editor.bodyModePreview')}</ToggleButton>
              </ToggleButtonGroup>
            </Stack>
            <Divider />
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  md:
                    bodyViewMode === 'split'
                      ? 'minmax(0, 1fr) minmax(0, 1fr)'
                      : '1fr',
                },
                minHeight: 280,
              }}
            >
              {bodyViewMode !== 'preview' ? (
                <Box
                  sx={{
                    p: 4,
                    borderRight: {
                      xs: 0,
                      md: bodyViewMode === 'split' ? 1 : 0,
                    },
                    borderColor: 'surface.borderSubtle',
                  }}
                >
                  <Box
                    component="textarea"
                    id="bodyMd-textarea"
                    aria-label={t('editor.fields.bodyMd')}
                    value={form.bodyMd}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, bodyMd: e.target.value }))
                    }
                    sx={{
                      width: '100%',
                      minHeight: 280,
                      resize: 'vertical',
                      border: 0,
                      outline: 0,
                      backgroundColor: 'transparent',
                      color: 'text.primary',
                      fontFamily: (theme) => theme.typography.fontFamilyMono,
                      fontSize: '0.75rem',
                      lineHeight: 1.55,
                    }}
                  />
                </Box>
              ) : null}
              {bodyViewMode !== 'editor' ? (
                <Box sx={{ p: 4 }}>
                  <MarkdownBody bodyMd={form.bodyMd} />
                </Box>
              ) : null}
            </Box>
          </Card>
        </Stack>

        <Card
          variant="outlined"
          component="aside"
          sx={{
            p: 4.5,
            position: { md: 'sticky' },
            top: { md: 24 },
          }}
        >
          <Typography
            variant="caption"
            component="div"
            sx={{ pb: 2.5, borderBottom: 1, borderColor: 'divider', color: 'text.disabled' }}
          >
            {t('editor.metadata')}
          </Typography>

          <Stack spacing={4} sx={{ mt: 4 }}>
            <Box>
              <FieldLabel label={t('editor.fields.slug')} required />
              <TextField
                value={form.slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setForm((prev) => ({ ...prev, slug: e.target.value }));
                }}
                onBlur={handleSlugBlur}
                helperText={t('editor.fields.slugHelper')}
                fullWidth
                required
                inputProps={{ 'aria-label': t('editor.fields.slug') }}
              />
            </Box>

            <Box>
              <FieldLabel label={t('editor.fields.language')} />
              <TextField
                select
                fullWidth
                value={form.language}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, language: e.target.value }))
                }
                inputProps={{ 'aria-label': t('editor.fields.language') }}
              >
                {LANGUAGES.map((language) => (
                  <MenuItem key={language.id} value={language.id}>
                    {language.displayName}
                  </MenuItem>
                ))}
              </TextField>
            </Box>

            <Box>
              <FieldLabel label={t('editor.fields.level')} />
              <TextField
                select
                fullWidth
                value={form.level}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    level: e.target.value as 'junior' | 'senior',
                  }))
                }
                inputProps={{ 'aria-label': t('editor.fields.level') }}
              >
                {LEVELS.map((level) => (
                  <MenuItem key={level} value={level}>
                    {level}
                  </MenuItem>
                ))}
              </TextField>
            </Box>

            <Divider />

            <Stack spacing={2.5}>
              <Stack direction="row" justifyContent="space-between" spacing={2}>
                <Typography variant="body2" color="text.secondary">
                  {t('editor.status')}
                </Typography>
                <Typography variant="body2" color="text.primary" sx={{ fontWeight: 500 }}>
                  {statusLabel}
                </Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between" spacing={2}>
                <Typography variant="body2" color="text.secondary">
                  {t('editor.lastEdited')}
                </Typography>
                <Typography
                  variant="body2"
                  color="text.primary"
                  sx={{ fontWeight: 500, textAlign: 'right' }}
                >
                  {lastEditedLabel}
                </Typography>
              </Stack>
            </Stack>
          </Stack>
        </Card>
      </Box>
    </Box>
  );
}

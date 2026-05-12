import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import { LANGUAGES } from '@koomiteh/shared';
import type { AdminPostCreate } from '@koomiteh/shared';
import {
  useCreateAdminPostMutation,
  useGetAdminPostQuery,
  useUpdateAdminPostMutation,
} from '@/api/adminApi';
import { MarkdownBody } from '@/features/interview/MarkdownBody';

const LEVELS = ['junior', 'senior'] as const;

type FormState = AdminPostCreate;

const EMPTY: FormState = {
  slug: '',
  question: '',
  language: LANGUAGES[0]?.id ?? 'typescript',
  level: 'junior',
  tags: [],
  bodyMd: '',
};

function tagsToInput(tags: string[]): string {
  return tags.join(', ');
}

function inputToTags(input: string): string[] {
  return input
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

interface Props {
  mode: 'new' | 'edit';
}

export function AdminPostEditorPage({ mode }: Props) {
  const { t } = useTranslation(['admin', 'common']);
  const { id = '' } = useParams();
  const navigate = useNavigate();

  const skip = mode === 'new' || !id;
  const { data: existing, isLoading: isLoadingExisting } =
    useGetAdminPostQuery(id, { skip });

  const [form, setForm] = useState<FormState>(EMPTY);
  const [tagsInput, setTagsInput] = useState('');
  const [initialSnapshot, setInitialSnapshot] = useState<FormState>(EMPTY);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
      setTagsInput(tagsToInput(existing.frontmatter.tags));
    } else if (mode === 'new') {
      setForm(EMPTY);
      setInitialSnapshot(EMPTY);
      setTagsInput('');
    }
  }, [mode, existing]);

  const isDirty = useMemo(() => {
    return (
      form.slug !== initialSnapshot.slug ||
      form.question !== initialSnapshot.question ||
      form.language !== initialSnapshot.language ||
      form.level !== initialSnapshot.level ||
      form.bodyMd !== initialSnapshot.bodyMd ||
      JSON.stringify(form.tags) !== JSON.stringify(initialSnapshot.tags)
    );
  }, [form, initialSnapshot]);

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

  async function handleSave() {
    setErrorMsg(null);
    try {
      if (mode === 'new') {
        const result = await createPost(form).unwrap();
        setInitialSnapshot(form);
        navigate(`/admin/posts/${encodeURIComponent(result.frontmatter.id)}/edit`);
      } else {
        await updatePost({ id, patch: form }).unwrap();
        setInitialSnapshot(form);
      }
    } catch (err) {
      const code = (err as { data?: { error?: string } }).data?.error;
      setErrorMsg(mapErrorCode(code));
    }
  }

  function handleCancel() {
    if (isDirty && !window.confirm(t('editor.unsavedWarning'))) return;
    navigate('/admin');
  }

  if (mode === 'edit' && isLoadingExisting) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  const title = mode === 'new' ? t('editor.newTitle') : t('editor.editTitle');

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto', py: 3 }}>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mb: 2 }}
      >
        <Typography variant="h4" component="h1">
          {title}
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button onClick={handleCancel} disabled={isSaving}>
            {t('editor.cancel')}
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={isSaving || !isDirty}
          >
            {isSaving ? t('editor.saving') : t('editor.save')}
          </Button>
        </Stack>
      </Stack>

      {errorMsg && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorMsg}
        </Alert>
      )}

      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <TextField
          label={t('editor.fields.question')}
          value={form.question}
          onChange={(e) => setForm({ ...form, question: e.target.value })}
          fullWidth
          required
        />
      </Stack>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <TextField
          label={t('editor.fields.slug')}
          value={form.slug}
          onChange={(e) => setForm({ ...form, slug: e.target.value })}
          helperText={t('editor.fields.slugHelper')}
          required
          sx={{ flex: 2 }}
        />
        <FormControl sx={{ flex: 1 }}>
          <InputLabel>{t('editor.fields.language')}</InputLabel>
          <Select
            label={t('editor.fields.language')}
            value={form.language}
            onChange={(e) =>
              setForm({ ...form, language: e.target.value as string })
            }
          >
            {LANGUAGES.map((l) => (
              <MenuItem key={l.id} value={l.id}>
                {l.displayName}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl sx={{ flex: 1 }}>
          <InputLabel>{t('editor.fields.level')}</InputLabel>
          <Select
            label={t('editor.fields.level')}
            value={form.level}
            onChange={(e) =>
              setForm({
                ...form,
                level: e.target.value as 'junior' | 'senior',
              })
            }
          >
            {LEVELS.map((lvl) => (
              <MenuItem key={lvl} value={lvl}>
                {lvl}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>

      <TextField
        label={t('editor.fields.tags')}
        value={tagsInput}
        onChange={(e) => {
          setTagsInput(e.target.value);
          setForm((prev) => ({ ...prev, tags: inputToTags(e.target.value) }));
        }}
        helperText={t('editor.fields.tagsHelper')}
        fullWidth
        sx={{ mb: 2 }}
      />

      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        sx={{ minHeight: 400 }}
      >
        <Box sx={{ flex: 1 }}>
          <Typography
            variant="overline"
            component="label"
            htmlFor="bodyMd-textarea"
            sx={{ display: 'block', mb: 0.5 }}
          >
            {t('editor.fields.bodyMd')}
          </Typography>
          <TextField
            id="bodyMd-textarea"
            value={form.bodyMd}
            onChange={(e) => setForm({ ...form, bodyMd: e.target.value })}
            multiline
            minRows={20}
            fullWidth
            slotProps={{
              input: {
                sx: {
                  fontFamily: 'monospace',
                  fontSize: '0.875rem',
                },
              },
            }}
          />
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography variant="overline" sx={{ display: 'block', mb: 0.5 }}>
            {t('editor.preview')}
          </Typography>
          <Paper variant="outlined" sx={{ p: 2, minHeight: 480 }}>
            <MarkdownBody bodyMd={form.bodyMd} />
          </Paper>
        </Box>
      </Stack>
    </Box>
  );
}

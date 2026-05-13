import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
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
import type { GeneratePostRequest, GeneratePostResponse } from '@koomiteh/shared';
import { useGeneratePostMutation } from '@/api/adminApi';

const LEVELS = ['junior', 'senior'] as const;

type FormState = GeneratePostRequest;

const INITIAL_FORM: FormState = {
  topic: '',
  language: LANGUAGES[0]?.id ?? 'typescript',
  level: 'junior',
};

export function AdminPostGeneratePage() {
  const { t } = useTranslation('admin');
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [draft, setDraft] = useState<GeneratePostResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [generate, generateState] = useGeneratePostMutation();

  function mapErrorCode(code: string | undefined): string {
    switch (code) {
      case 'generate_unavailable':
        return t('generate.error.unavailable');
      case 'gemini_failed':
      case 'gemini_invalid_output':
        return t('generate.error.geminiFailed');
      default:
        return t('generate.error.generic');
    }
  }

  async function handleGenerate() {
    setErrorMsg(null);
    try {
      const result = await generate(form).unwrap();
      setDraft(result);
    } catch (err) {
      const code = (err as { data?: { error?: string } }).data?.error;
      setErrorMsg(mapErrorCode(code));
    }
  }

  const isGenerating = generateState.isLoading;

  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto', py: 3 }}>
      <Typography variant="h4" component="h1" sx={{ mb: 2 }}>
        {t('generate.title')}
      </Typography>

      {errorMsg && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorMsg}
        </Alert>
      )}

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <TextField
          label={t('generate.fields.topic')}
          value={form.topic}
          onChange={(e) => setForm({ ...form, topic: e.target.value })}
          helperText={t('generate.fields.topicHelper')}
          required
          fullWidth
          sx={{ flex: 2 }}
        />
        <FormControl sx={{ flex: 1, minWidth: 160 }}>
          <InputLabel id="generate-language-label">
            {t('generate.fields.language')}
          </InputLabel>
          <Select
            labelId="generate-language-label"
            label={t('generate.fields.language')}
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
        <FormControl sx={{ flex: 1, minWidth: 140 }}>
          <InputLabel id="generate-level-label">
            {t('generate.fields.level')}
          </InputLabel>
          <Select
            labelId="generate-level-label"
            label={t('generate.fields.level')}
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

      <Stack direction="row" spacing={1} sx={{ mb: 3 }}>
        <Button
          variant="contained"
          onClick={handleGenerate}
          disabled={isGenerating || form.topic.trim().length === 0}
          startIcon={
            isGenerating ? <CircularProgress size={16} /> : undefined
          }
        >
          {isGenerating
            ? t('generate.generating')
            : t('generate.generateButton')}
        </Button>
      </Stack>

      {draft && (
        <Paper variant="outlined" sx={{ p: 3 }}>
          <Typography variant="overline" sx={{ display: 'block', mb: 1 }}>
            {t('generate.draft.title')}
          </Typography>

          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" color="text.secondary">
              {t('generate.draft.question')}
            </Typography>
            <Typography variant="h6" component="p">
              {draft.question}
            </Typography>
          </Box>

          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" color="text.secondary">
              {t('generate.draft.slug')}
            </Typography>
            <Typography
              component="p"
              sx={{ fontFamily: 'monospace', fontSize: 14 }}
            >
              {draft.slug}
            </Typography>
          </Box>

          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" color="text.secondary">
              {t('generate.draft.tags')}
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mt: 0.5, flexWrap: 'wrap' }}>
              {draft.tags.map((tag) => (
                <Chip key={tag} label={tag} size="small" />
              ))}
            </Stack>
          </Box>

          <Box>
            <Typography variant="caption" color="text.secondary">
              {t('generate.draft.bodyMd')}
            </Typography>
            <Box
              component="pre"
              sx={{
                fontFamily: 'monospace',
                fontSize: 13,
                whiteSpace: 'pre-wrap',
                backgroundColor: 'action.hover',
                p: 2,
                borderRadius: 1,
                mt: 0.5,
              }}
            >
              {draft.bodyMd}
            </Box>
          </Box>
        </Paper>
      )}
    </Box>
  );
}

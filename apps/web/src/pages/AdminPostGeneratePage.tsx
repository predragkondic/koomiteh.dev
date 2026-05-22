import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import { LANGUAGES } from "@koomiteh/shared";
import type { AdminPostCreate, GeneratePostRequest } from "@koomiteh/shared";
import {
  useCreateAdminPostMutation,
  useGeneratePostMutation,
  useSuggestTopicsMutation,
} from "@/api/adminApi";
import { MdBodyEditor } from "@/components/BodyEditor";

const LEVELS = ["junior", "senior"] as const;

type FormState = GeneratePostRequest;

const INITIAL_FORM: FormState = {
  topic: "",
  language: LANGUAGES[0]?.id ?? "typescript",
  level: "junior",
};

export function AdminPostGeneratePage() {
  const { t } = useTranslation("admin");
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [draftForm, setDraftForm] = useState<AdminPostCreate | null>(null);
  const [draftSnapshot, setDraftSnapshot] = useState<AdminPostCreate | null>(
    null,
  );
  const [tagsInput, setTagsInput] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirmRegenerateOpen, setConfirmRegenerateOpen] = useState(false);
  const [lastGenerateInputs, setLastGenerateInputs] =
    useState<FormState | null>(null);
  const [generateErrorRetryable, setGenerateErrorRetryable] = useState(false);
  const [generate, generateState] = useGeneratePostMutation();
  const [createPost, createState] = useCreateAdminPostMutation();
  const [suggestTopics, suggestState] = useSuggestTopicsMutation();
  const [suggestAnchor, setSuggestAnchor] = useState<HTMLElement | null>(null);
  const [suggestedTopics, setSuggestedTopics] = useState<string[]>([]);

  async function handleSuggestTopics(e: React.MouseEvent<HTMLElement>) {
    const anchor = e.currentTarget;
    setErrorMsg(null);
    setGenerateErrorRetryable(false);
    try {
      const result = await suggestTopics({
        language: form.language,
        level: form.level,
      }).unwrap();
      setSuggestedTopics(result.topics);
      setSuggestAnchor(anchor);
    } catch (err) {
      const code = (err as { data?: { error?: string } }).data?.error;
      setErrorMsg(mapSuggestErrorCode(code));
      setSuggestAnchor(null);
      setSuggestedTopics([]);
    }
  }

  function handleCloseSuggestMenu() {
    setSuggestAnchor(null);
  }

  function mapErrorCode(code: string | undefined): string {
    switch (code) {
      case "generate_unavailable":
        return t("generate.error.unavailable");
      case "gemini_failed":
      case "gemini_invalid_output":
        return t("generate.error.geminiFailed");
      default:
        return t("generate.error.generic");
    }
  }

  function mapSuggestErrorCode(code: string | undefined): string {
    switch (code) {
      case "generate_unavailable":
        return t("generate.suggestTopics.error.unavailable");
      case "gemini_failed":
      case "gemini_invalid_output":
        return t("generate.suggestTopics.error.geminiFailed");
      default:
        return t("generate.suggestTopics.error.generic");
    }
  }

  function mapSaveErrorCode(code: string | undefined): string {
    switch (code) {
      case "slug_conflict":
        return t("editor.errorSlugConflict");
      case "content_id_conflict":
        return t("editor.errorContentIdConflict");
      case "invalid_language":
        return t("editor.errorInvalidLanguage");
      case "invalid_body":
        return t("editor.errorInvalidBody");
      default:
        return t("editor.errorGeneric");
    }
  }

  async function runGenerate(inputs: FormState) {
    setErrorMsg(null);
    setGenerateErrorRetryable(false);
    setLastGenerateInputs(inputs);
    try {
      const result = await generate(inputs).unwrap();
      const next: AdminPostCreate = {
        slug: result.slug,
        question: result.question,
        language: result.language,
        level: result.level,
        tags: result.tags,
        bodyMd: result.bodyMd,
      };
      setDraftForm(next);
      setDraftSnapshot(next);
      setTagsInput(result.tags.join(", "));
    } catch (err) {
      const code = (err as { data?: { error?: string } }).data?.error;
      setErrorMsg(mapErrorCode(code));
      setGenerateErrorRetryable(true);
    }
  }

  async function handleGenerate() {
    await runGenerate(form);
  }

  async function handleRetryGenerate() {
    if (lastGenerateInputs) {
      await runGenerate(lastGenerateInputs);
    }
  }

  const isDraftDirty = useMemo(() => {
    if (!draftForm || !draftSnapshot) return false;
    return (
      draftForm.slug !== draftSnapshot.slug ||
      draftForm.question !== draftSnapshot.question ||
      draftForm.bodyMd !== draftSnapshot.bodyMd ||
      JSON.stringify(draftForm.tags) !== JSON.stringify(draftSnapshot.tags)
    );
  }, [draftForm, draftSnapshot]);

  useEffect(() => {
    if (!isDraftDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDraftDirty]);

  function handleRegenerate() {
    if (isDraftDirty) {
      setConfirmRegenerateOpen(true);
      return;
    }
    void handleGenerate();
  }

  function handleConfirmRegenerate() {
    setConfirmRegenerateOpen(false);
    void handleGenerate();
  }

  function handleCancelRegenerate() {
    setConfirmRegenerateOpen(false);
  }

  async function handleSave() {
    if (!draftForm) return;
    setErrorMsg(null);
    setGenerateErrorRetryable(false);
    try {
      const result = await createPost(draftForm).unwrap();
      navigate(
        `/admin/posts/${encodeURIComponent(result.frontmatter.id)}/edit`,
      );
    } catch (err) {
      const code = (err as { data?: { error?: string } }).data?.error;
      setErrorMsg(mapSaveErrorCode(code));
    }
  }

  function handleCancel() {
    navigate("/admin");
  }

  const isGenerating = generateState.isLoading;
  const isSaving = createState.isLoading;

  return (
    <Box sx={{ maxWidth: 1000, mx: "auto", py: 3 }}>
      <Typography variant="h4" component="h1" sx={{ mb: 2 }}>
        {t("generate.title")}
      </Typography>
      {errorMsg && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
          action={
            generateErrorRetryable && lastGenerateInputs ? (
              <Button
                color="inherit"
                size="small"
                onClick={handleRetryGenerate}
                disabled={isGenerating}
              >
                {t("generate.error.retry")}
              </Button>
            ) : undefined
          }
        >
          {errorMsg}
        </Alert>
      )}
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 2 }}>
        <TextField
          label={t("generate.fields.topic")}
          variant="outlined"
          value={form.topic}
          onChange={(e) => setForm({ ...form, topic: e.target.value })}
          helperText={t("generate.fields.topicHelper")}
          required
          fullWidth
          sx={{ flex: 2 }}
          slotProps={{
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label={t("generate.suggestTopics.aria")}
                    edge="end"
                    size="small"
                    onClick={handleSuggestTopics}
                    disabled={suggestState.isLoading}
                  >
                    {suggestState.isLoading ? (
                      <CircularProgress size={20} />
                    ) : (
                      <AutoAwesomeIcon fontSize="small" />
                    )}
                  </IconButton>
                </InputAdornment>
              ),
            },
          }}
        />
        <FormControl sx={{ flex: 1, minWidth: 160 }}>
          <InputLabel id="generate-language-label">
            {t("generate.fields.language")}
          </InputLabel>
          <Select
            labelId="generate-language-label"
            label={t("generate.fields.language")}
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
            {t("generate.fields.level")}
          </InputLabel>
          <Select
            labelId="generate-level-label"
            label={t("generate.fields.level")}
            value={form.level}
            onChange={(e) =>
              setForm({
                ...form,
                level: e.target.value as "junior" | "senior",
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
      <Stack
        direction="row"
        spacing={1}
        sx={{
          justifyContent: "space-between",
          mb: 3
        }}>
        <Button onClick={handleCancel} disabled={isSaving}>
          {t("editor.cancel")}
        </Button>
        <Stack direction="row" spacing={1}>
          <Button
            variant={isGenerating ? "outlined" : "contained"}
            onClick={handleRegenerate}
            disabled={
              isGenerating || isSaving || form.topic.trim().length === 0
            }
            startIcon={
              isGenerating ? <CircularProgress size={16} /> : undefined
            }
          >
            {isGenerating
              ? t("generate.generating")
              : t("generate.generateButton")}
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={!draftForm || isSaving}
          >
            {isSaving ? t("editor.saving") : t("editor.save")}
          </Button>
        </Stack>
      </Stack>
      <Menu
        anchorEl={suggestAnchor}
        open={Boolean(suggestAnchor) && suggestedTopics.length > 0}
        onClose={handleCloseSuggestMenu}
      >
        {suggestedTopics.map((topic, idx) => (
          <MenuItem
            key={`${topic}-${idx}`}
            onClick={() => {
              setForm((prev) => ({ ...prev, topic }));
              handleCloseSuggestMenu();
            }}
          >
            {topic || t("generate.suggestTopics.menuItemFallback", { index: idx + 1 })}
          </MenuItem>
        ))}
      </Menu>
      <Dialog
        open={confirmRegenerateOpen}
        onClose={handleCancelRegenerate}
        aria-labelledby="confirm-regenerate-title"
      >
        <DialogTitle id="confirm-regenerate-title">
          {t("generate.confirmRegenerate.title")}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t("generate.confirmRegenerate.body")}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelRegenerate}>
            {t("generate.confirmRegenerate.cancel")}
          </Button>
          <Button onClick={handleConfirmRegenerate} variant="contained">
            {t("generate.confirmRegenerate.confirm")}
          </Button>
        </DialogActions>
      </Dialog>
      {draftForm && (
        <Box>
          <TextField
            label={t("editor.fields.question")}
            value={draftForm.question}
            onChange={(e) =>
              setDraftForm({ ...draftForm, question: e.target.value })
            }
            fullWidth
            required
            sx={{ mb: 2 }}
          />

          <TextField
            label={t("editor.fields.slug")}
            value={draftForm.slug}
            onChange={(e) =>
              setDraftForm({ ...draftForm, slug: e.target.value })
            }
            helperText={t("editor.fields.slugHelper")}
            required
            fullWidth
            sx={{ mb: 2 }}
          />

          <TextField
            label={t("editor.fields.tags")}
            value={tagsInput}
            onChange={(e) => {
              setTagsInput(e.target.value);
              setDraftForm({
                ...draftForm,
                tags: e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter((s) => s.length > 0),
              });
            }}
            helperText={t("editor.fields.tagsHelper")}
            fullWidth
            sx={{ mb: 2 }}
          />

          <MdBodyEditor
            value={draftForm.bodyMd}
            onChange={(next) => setDraftForm({ ...draftForm, bodyMd: next })}
          />
        </Box>
      )}
    </Box>
  );
}

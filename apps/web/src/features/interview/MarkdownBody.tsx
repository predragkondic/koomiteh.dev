import { useEffect, useMemo, useState } from "react";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import { Marked } from "marked";
import {
  createHighlighter,
  type HighlighterGeneric,
  type BundledLanguage,
  type BundledTheme,
} from "shiki/bundle/web";
import { LANGUAGES } from "@koomiteh/shared";

type WebHighlighter = HighlighterGeneric<BundledLanguage, BundledTheme>;

const SHIKI_LANGS = Array.from(
  new Set<string>([
    ...LANGUAGES.map((l) => l.shikiLang),
    "ts",
    "js",
    "tsx",
    "jsx",
  ]),
);

let highlighterPromise: Promise<WebHighlighter> | null = null;

function getHighlighter(): Promise<WebHighlighter> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: ["github-light", "github-dark"],
      langs: SHIKI_LANGS,
    });
  }
  return highlighterPromise;
}

function buildMarked(
  highlighter: WebHighlighter,
  supported: Set<string>,
): Marked {
  const m = new Marked({ gfm: true, breaks: false, async: false });
  m.use({
    renderer: {
      code({ text, lang }) {
        const language =
          lang && supported.has(lang) ? (lang as BundledLanguage) : undefined;
        if (!language) {
          return `<pre class="shiki"><code>${escapeHtml(text)}</code></pre>`;
        }
        return highlighter.codeToHtml(text, {
          lang: language,
          themes: { light: "github-light", dark: "github-dark" },
          defaultColor: false,
        });
      },
    },
  });
  return m;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

interface Props {
  bodyMd: string;
}

export function MarkdownBody({ bodyMd }: Props) {
  const [highlighter, setHighlighter] = useState<WebHighlighter | null>(null);

  useEffect(() => {
    let cancelled = false;
    getHighlighter().then((h) => {
      if (!cancelled) setHighlighter(h);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const html = useMemo(() => {
    if (!highlighter) return null;
    const supported = new Set(highlighter.getLoadedLanguages());
    const md = buildMarked(highlighter, supported);
    return md.parse(bodyMd) as string;
  }, [highlighter, bodyMd]);

  if (!html) {
    return (
      <Stack spacing={2} aria-busy>
        <Skeleton variant="rounded" height={120} />
        <Skeleton variant="rounded" height={80} />
      </Stack>
    );
  }

  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}

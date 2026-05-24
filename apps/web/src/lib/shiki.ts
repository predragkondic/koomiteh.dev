import {
  createHighlighter,
  type HighlighterGeneric,
  type BundledLanguage,
  type BundledTheme,
} from "shiki/bundle/web";
import { LANGUAGES } from "@koomiteh/shared";

export type WebHighlighter = HighlighterGeneric<BundledLanguage, BundledTheme>;

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

export function getHighlighter(): Promise<WebHighlighter> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: ["github-light", "github-dark"],
      langs: SHIKI_LANGS,
    });
  }
  return highlighterPromise;
}

import { useEffect, type RefObject } from "react";
import { type BundledLanguage } from "shiki/bundle/web";
import { getHighlighter } from "./shiki";

/**
 * Walks a container and re-renders `<pre><code class="language-X">` blocks
 * with shiki output, in-place. Idempotent: rehighlighted blocks are marked
 * with `data-shiki-applied` so a re-run skips them.
 *
 * Use for already-rendered HTML (e.g. comment bodyHtmlSafe). For raw
 * markdown bodies, MarkdownBody runs the full marked+shiki pipeline.
 */
export function useShikiHighlight(
  containerRef: RefObject<HTMLElement | null>,
  deps: ReadonlyArray<unknown>,
): void {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let cancelled = false;
    void (async () => {
      const highlighter = await getHighlighter();
      if (cancelled) return;
      const supported = new Set(highlighter.getLoadedLanguages());
      const codeBlocks = container.querySelectorAll<HTMLElement>(
        'pre code[class*="language-"]',
      );
      codeBlocks.forEach((codeEl) => {
        const pre = codeEl.parentElement;
        if (!pre || pre.hasAttribute("data-shiki-applied")) return;
        const langClass = codeEl.className
          .split(/\s+/)
          .find((c) => c.startsWith("language-"));
        if (!langClass) return;
        const lang = langClass.slice("language-".length);
        if (!supported.has(lang)) return;
        const code = codeEl.textContent ?? "";
        const html = highlighter.codeToHtml(code, {
          lang: lang as BundledLanguage,
          themes: { light: "github-light", dark: "github-dark" },
          defaultColor: false,
        });
        const wrapper = document.createElement("div");
        wrapper.innerHTML = html;
        const newPre = wrapper.firstChild;
        if (newPre instanceof HTMLElement) {
          newPre.setAttribute("data-shiki-applied", "true");
          pre.replaceWith(newPre);
        }
      });
    })();
    return () => {
      cancelled = true;
    };
    // deps is intentionally spread so callers control re-runs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

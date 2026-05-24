/**
 * Comment body renderer. Mini-grammar: plain-text paragraphs, inline code,
 * fenced code blocks. Anything else (markdown syntax, raw HTML) is rendered
 * literally as HTML-escaped text. Emitted tag-subset: <p>, <br>, <pre>,
 * <code class="language-X">, <code>. See ADR-0004 Revision 2026-05-24.
 */
const FENCE_RE = /```(\w*)\n([\s\S]*?)\n```/g;
const INLINE_CODE_RE = /`([^`]+)`/g;

export function renderCommentBody(bodyMd: string): string {
  const out: string[] = [];
  let lastIndex = 0;
  for (const match of bodyMd.matchAll(FENCE_RE)) {
    const start = match.index ?? 0;
    if (start > lastIndex) {
      out.push(renderParagraphs(bodyMd.slice(lastIndex, start)));
    }
    const lang = match[1];
    const code = match[2];
    const langAttr = lang ? ` class="language-${lang}"` : '';
    out.push(`<pre><code${langAttr}>${escapeHtml(code)}</code></pre>`);
    lastIndex = start + match[0].length;
  }
  if (lastIndex < bodyMd.length) {
    out.push(renderParagraphs(bodyMd.slice(lastIndex)));
  }
  return out.join('') || renderParagraphs(bodyMd);
}

function renderParagraphs(text: string): string {
  return text
    .split(/\n{2,}/)
    .filter((p) => p.length > 0)
    .map((p) => `<p>${renderInlines(p)}</p>`)
    .join('');
}

function renderInlines(text: string): string {
  return escapeHtml(text)
    .replace(INLINE_CODE_RE, '<code>$1</code>')
    .replace(/\n/g, '<br>');
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

# ADR-0004: Comments-Struktur und Render-Asymmetrie

- **Status:** Accepted
- **Date:** 2026-05-06

## Context

koomiteh.dev erlaubt Public-User, auf Posts zu kommentieren. Comments enthalten Markdown — Devs zeigen oft Code-Variationen, also sind Code-Fences essentiell.

Zwei zentrale Design-Fragen:

1. **Strukturelle Frage:** Flat list vs. threaded vs. Q&A-style vs. mit Reactions?
2. **Render-Pfad-Frage:** Wo wird Markdown gerendert, wo wird Code highlightet, wo wird sanitized — bei trusted (Admin-)Content vs. untrusted (User-)Content?

`plan-v1-static.md` hatte Build-Time-shiki mit dual-theme CSS-Variablen für Posts. Dieses Setup geht mit der DB-Migration verloren.

## Decision

### Comment-Struktur: Flat + Reactions

- **Flat list, kein Threading.** Eine Reihe von Comments pro Post, chronologisch sortiert. Kein `parent_id`, kein Tree.
- **Reactions auf Comments.** Fixes Set: `❤️ 😄 🦄 ☕ 👍 🐢` als Postgres-Enum `reaction_emoji`. Toggle-Operation pro `(commentId, userId, emoji)`.
- **Soft-Delete.** Comments setzen `deleted_at`, Body wird "[deleted]", Author null.
- **Edit erlaubt** für Owner. `updated_at` getracked, im UI zeigen "edited"-Indikator wenn `updated_at > created_at`.
- **Admin** kann jeden Comment löschen.

### Render-Asymmetrie: Trusted vs. Untrusted Markdown

| Source | Trust | Sanitize | Stored Form | Frontend Render |
|---|---|---|---|---|
| **Posts** (Admin) | trusted | nein | `body_md` only | `marked` + `shiki/bundle/web` |
| **Comments** (Public-User) | untrusted | **server-side** (`marked` + `DOMPurify`) | `body_md` (raw) + `body_html_safe` (sanitized) | `dangerouslySetInnerHTML(body_html_safe)`, danach shiki-Hook für Code-Blöcke |

**Sanitize-Whitelist für Comments:** `<p>`, `<a target="_blank" rel="noopener">`, `<strong>`, `<em>`, `<code>`, `<pre>`, `<ul>`/`<ol>`/`<li>`, `<blockquote>`. Stripped: `<script>`, `<iframe>`, `<img>`, alle Event-Handler (`onclick=`, etc.).

**Code-Highlighting:** Wandert komplett ins Frontend via `shiki/bundle/web` (lazy-loaded Grammars). Behält Plan v1's dual-theme CSS-Variablen-Trick für Theme-Switching ohne Re-Render. Frontend hookt sich **nach** dem `dangerouslySetInnerHTML`-Render in die Code-Blöcke ein und appliziert shiki — gleicher Hook für Posts und Comments, scoped pro Container.

### Server-Render-Pipeline für Comments (Backend)

```
bodyMd (raw user input)
  → marked.parse() (mit GFM-Erweiterungen, ohne raw HTML allow)
  → DOMPurify.sanitize() (mit jsdom als DOM-Provider)
  → bodyHtmlSafe (gespeichert in DB, an Frontend ausgeliefert)
```

Wichtig: server-side Render erzeugt `<pre><code class="language-X">`-Blöcke, lässt sie aber **unhighlighted**. Frontend-shiki picks them up.

## Consequences

### Positive

- **Klare Sicherheits-Trennung.** Posts sind trusted (Admin schreibt, kein XSS-Vektor), keine Sanitize-Kosten. Comments sind untrusted, sanitized **immer** server-side (Frontend-only-Sanitize wäre fragil — andere zukünftige Clients wären XSS-anfällig).
- **Code-Highlighting konsistent.** Beide Inhalt-Typen rendern Code identisch über denselben Frontend-Hook.
- **Theme-Switch ohne Re-Highlight.** shiki's CSS-Variablen-Approach (`--shiki-light` / `--shiki-dark`) bleibt — ein DOM-Tree, zwei Themes via CSS.
- **Flat structure** ist UX-passend für Lern-Kontext (kein Diskussions-Forum-Drift).
- **Reactions** geben Engagement-Signal ohne Discussion-Sprawl. Kein 👎 (Downvoting demotiviert junior devs).

### Negative / Trade-offs

- **Frontend-Bundle wächst** durch shiki + Grammars (~150-300KB initial für TS+JS). Mit `shiki/bundle/web` werden Grammars on-demand geladen, kein eager-load aller Sprachen.
- **Doppelter Render-Pfad** für Comments: server-side für HTML, frontend für Code-Highlight. Mehr Komplexität als rein server-side (wo HTML mit shiki schon gerendert wäre) oder rein frontend-side (wo nichts sanitized wäre).
- **Sanitize-Library-Updates** sind security-kritisch. `marked` und `DOMPurify` (oder Alternative) müssen aktiv gehalten werden, sonst sind XSS-Bypass-Vektoren möglich.
- **Markdown-Subset für Comments.** Nicht alles erlaubt (kein `<img>`, kein raw HTML). User können keine Bilder einbetten (kann später erweitert werden mit Hostname-Whitelist).

## Alternatives Considered

- **Fully threaded Comments (Reddit/HN-style):** Verworfen. Materialized-Path-Komplexität, Pagination wird Tree-aware, Render-Cost steigt. Lern-Kontext braucht keine Tiefe.
- **One-level threaded (Reddit-light):** Verworfen. Marginal mehr UX als flat, aber Threading-Rendering-Logik kostet trotzdem Komplexität.
- **Q&A-Style mit Voting + Accept-Mark:** Verworfen. Gehört in StackOverflow-artige Plattformen, nicht in Lern-Repository.
- **Plain-text Comments (kein Markdown):** Verworfen. Code-Fences sind essentiell für die Zielgruppe.
- **Server-rendered HTML auch für Posts:** Verworfen. Wäre konsistenter, aber Plan v1's Build-Time-Render-Architektur verloren. Frontend-shiki erlaubt trustless-Rendering und Theme-Switch via CSS-Variablen — das Killer-Feature von shiki, das andere Highlighter (highlight.js, prism) nicht trivial bieten.
- **GitHub-Style Reaction-Set (8 Emojis inkl. 👎):** Verworfen. 👎 ist implizites Downvoting, kollidiert mit Lern-Atmosphäre.
- **Free Emoji Picker:** Verworfen. Long-Tail-Cardinality (User wählt 🦄 + 🍕 + 🐢 → unleserliche UI). Fix-Set ist UX-konsistent.
- **Emoji-Set mit `helpful`, `outdated`, `needs-citation` (Custom-Tags statt Emojis):** Verworfen. UX-Overhead, weniger Emotion. Custom-Set `❤️ 😄 🦄 ☕ 👍 🐢` ist gewählt nach User-Vorgabe.

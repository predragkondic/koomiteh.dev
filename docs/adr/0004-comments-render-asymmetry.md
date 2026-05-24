# ADR-0004: Comments-Struktur und Render-Asymmetrie

- **Status:** Accepted (Revised 2026-05-24)
- **Date:** 2026-05-06
- **Revision 2026-05-24:** Comment-Body-Pipeline gewechselt von Full-Markdown (`marked` + `DOMPurify`) auf Custom-Mini-Grammatik (`renderCommentBody` in `@koomiteh/shared`). Bold/Italic/Lists/Blockquote/Links fallen weg; Plain-Text-Absätze, Inline-Code und Fenced-Code bleiben. Begründung: Comments dienen Code-Diskussion in einem Lern-Kontext; Rich-Markdown ist Overkill und vergrößert die Attack-Surface. Details siehe §Decision unten und §Alternatives Considered.

## Context

koomiteh.dev erlaubt Public-User, auf Posts zu kommentieren. Comments enthalten Markdown — Devs zeigen oft Code-Variationen, also sind Code-Fences essentiell.

Zwei zentrale Design-Fragen:

1. **Strukturelle Frage:** Flat list vs. threaded vs. Q&A-style vs. mit Reactions?
2. **Render-Pfad-Frage:** Wo wird Markdown gerendert, wo wird Code highlightet, wo wird sanitized — bei trusted (Admin-)Content vs. untrusted (User-)Content?

`plan-v1-static.md` hatte Build-Time-shiki mit dual-theme CSS-Variablen für Posts. Dieses Setup geht mit der DB-Migration verloren.

## Decision

### Comment-Struktur: Flat + Reactions

- **Flat list, kein Threading.** Eine Reihe von Comments pro Post, chronologisch sortiert. Kein `parent_id`, kein Tree.
- **Reactions auf Comments.** Fixes Set: `❤️ 😄 🦄 ☕ 👍 🐢` als Postgres-Enum `reaction_emoji`. Toggle-Operation pro `(commentId, userId, emoji)`. **Implementation deferred:** Architektur hier festgehalten, Code-Schritt (DB-Migration, Endpoints, UI) ist eine eigene zukünftige Slice — Slice 7 (#26) liefert nur das Comment-Grundgerüst.
- **Delete-Strategie (asymmetrisch nach Actor):**
  - **Owner löscht eigenen Comment → Soft-Delete.** `deleted_at` wird gesetzt, Body wird "[deleted]", Author null. Discussion-Anker bleibt stabil, Reactions verlieren keinen Anker.
  - **Admin/Superadmin löscht fremden Comment → Hard-Delete.** Row wird vollständig entfernt. Moderation-Aktion, nicht User-Action. Keine "[deleted]"-Marke nötig — die Existenz selbst war problematisch.
  - **Admin/Superadmin löscht eigenen Comment → Soft-Delete** (wie Owner). Die Asymmetrie greift nur, wenn die Rolle den Owner überstimmt.
- **Edit erlaubt** für Owner. `updated_at` getracked, im UI zeigen "edited"-Indikator wenn `updated_at > created_at`.

### Render-Asymmetrie: Posts (Markdown, trusted) vs. Comments (Mini-Grammatik, untrusted)

| Source | Trust | Pipeline | Stored Form | Frontend Render |
|---|---|---|---|---|
| **Posts** (Admin) | trusted | client-seitig `marked` + `shiki/bundle/web` ab `body_md` | `body_md` only | `MarkdownBody`-Komponente — voller Markdown-Renderer + Inline-Shiki |
| **Comments** (Public-User) | untrusted | server-seitig `renderCommentBody` (Mini-Grammatik, geschlossenes Tag-Subset, HTML-Escape) | `body_md` (raw) + `body_html_safe` (rendered) | `dangerouslySetInnerHTML(body_html_safe)`, danach Post-Render-Shiki-Hook für `<pre><code class="language-X">`-Blöcke |

**Comment-Body-Grammatik (`renderCommentBody`):**

| Eingabe | Ausgabe |
|---|---|
| ` ```lang\ncode\n``` ` | `<pre><code class="language-lang">…escaped…</code></pre>` |
| ` ```\ncode\n``` ` | `<pre><code>…escaped…</code></pre>` |
| `` `inline` `` | `<code>…escaped…</code>` |
| Plain-Text-Absatz (Blöcke durch Leerzeile getrennt) | `<p>…escaped…</p>` |
| Einfacher `\n` innerhalb eines Absatzes | `<br>` |
| `*`, `_`, `>`, `[…](…)`, `#`, `-`, HTML-Tags | wörtlich, HTML-escaped |

**Emittiertes Tag-Subset:** `<p>`, `<br>`, `<pre>`, `<code class="language-X">`, `<code>`. Keine Attribute außer `class` auf `<code>`. Keine `<a>`, `<img>`, `<script>`, `<iframe>`, Event-Handler. Da der Renderer ein **geschlossenes** Output-Set emittiert und alle User-Inhalte HTML-escaped, ist eine separate Sanitize-Library (`DOMPurify`) nicht nötig.

**Code-Highlighting-Pipelines:**
- **Posts**: `MarkdownBody`-Komponente führt `marked` + `shiki` clientseitig ab `body_md` durch (full pipeline).
- **Comments**: Backend emittiert `<pre><code class="language-X">…</code></pre>` **unhighlighted**; Frontend-Komponente `CommentItem` rendert das HTML via `dangerouslySetInnerHTML` und hookt einen separaten Post-Render-Highlighter ein, der die Code-Blöcke nachträglich shiki-stylet.

Beide Pipelines nutzen den **gleichen Theme-Stack** (`github-light` / `github-dark`) und denselben dual-theme-CSS-Variablen-Trick — das visuelle Ergebnis ist konsistent. Die Pipelines sind aber **strukturell verschieden**: Posts haben raw Markdown clientseitig, Comments haben fertiges HTML serverseitig.

### Server-Render-Pipeline für Comments (Backend)

```
bodyMd (raw user input)
  → renderCommentBody(bodyMd)  // shared aus @koomiteh/shared
  → bodyHtmlSafe (gespeichert in DB, an Frontend ausgeliefert)
```

`renderCommentBody` lebt in `packages/shared/src/comments/render.ts`, ist eine reine Funktion ohne Side-Effects und wird sowohl vom Backend (zur Persistierung) als auch vom Frontend (für Edit-Mode-Preview) genutzt. **Single Source of Truth** für das Body-Format — kein Pipeline-Drift zwischen Vorschau und Save-Ergebnis möglich.

## Consequences

### Positive

- **Klare Sicherheits-Trennung.** Posts sind trusted (Admin schreibt, kein XSS-Vektor), keine Render-Pipeline-Komplexität nötig. Comments sind untrusted, werden serverseitig durch einen Renderer geleitet, der ein **geschlossenes** HTML-Tag-Subset emittiert und alle User-Inhalte HTML-escaped — XSS ist by-construction nicht möglich.
- **Reduzierte Attack-Surface.** Keine `marked`-Markdown-Parser-Bibliothek und keine `DOMPurify`-Sanitize-Library mehr im Comment-Pfad — beide entfielen mit der Revision 2026-05-24. Statt zwei aktiv gepflegter Drittparteien hängt der Comment-Pfad nur noch an einer kleinen, vollständig getesteten Renderer-Funktion (~50 Zeilen).
- **Single Source of Truth für das Body-Format.** Backend (Persistierung) und Frontend (Edit-Preview) importieren denselben Renderer aus `@koomiteh/shared`. Kein Drift zwischen Vorschau und Save-Ergebnis möglich.
- **Code-Highlighting visuell konsistent.** Posts und Comments nutzen denselben Theme-Stack (`github-light` / `github-dark`); shiki's CSS-Variablen-Approach ermöglicht Theme-Switch ohne Re-Render.
- **Flat structure** ist UX-passend für Lern-Kontext (kein Diskussions-Forum-Drift).
- **Reactions** geben Engagement-Signal ohne Discussion-Sprawl. Kein 👎 (Downvoting demotiviert junior devs).

### Negative / Trade-offs

- **Frontend-Bundle wächst** durch shiki + Grammars (~150-300KB initial für TS+JS). Mit `shiki/bundle/web` werden Grammars on-demand geladen, kein eager-load aller Sprachen.
- **Strukturell unterschiedliche Render-Pipelines** für Posts (clientseitig `marked`+`shiki` ab `body_md`) und Comments (serverseitig Mini-Grammatik → HTML, dann clientseitig Post-Render-Shiki-Hook). Visuell konsistent, aber zwei Codepfade zu pflegen.
- **Reduzierter Body-Markup für Comments.** Kein Bold, Italic, Lists, Blockquote, Links, Headings, Tables, Bilder. Nur Plain-Text-Absätze, Inline-Code, Fenced-Code. Trade-off: bewusste Beschränkung auf den Kern-Use-Case (Code-Diskussion). Falls sich der Use-Case zu längeren essay-style Comments verschiebt, ist das eine eigene zukünftige Design-Entscheidung — nicht durch graduelle Erweiterung der Whitelist, sondern durch erneuten ADR-Review.

## Alternatives Considered

- **Fully threaded Comments (Reddit/HN-style):** Verworfen. Materialized-Path-Komplexität, Pagination wird Tree-aware, Render-Cost steigt. Lern-Kontext braucht keine Tiefe.
- **One-level threaded (Reddit-light):** Verworfen. Marginal mehr UX als flat, aber Threading-Rendering-Logik kostet trotzdem Komplexität.
- **Q&A-Style mit Voting + Accept-Mark:** Verworfen. Gehört in StackOverflow-artige Plattformen, nicht in Lern-Repository.
- **Plain-text Comments (überhaupt kein Markup):** Verworfen. Code-Fences sind essentiell für die Zielgruppe — Devs zeigen ständig Code-Variationen. Die aktuelle Mini-Grammatik (Plain-Text + Inline-Code + Fenced-Code) ist die minimalistische Variante, die diesen Bedarf deckt, ohne die volle Markdown-Oberfläche zu öffnen.
- **Full Markdown (`marked` + `DOMPurify`-Sanitize):** Initial implementiert (Mai 2026), mitten in Slice 7 zugunsten der Mini-Grammatik verworfen. Begründung: (1) Comments dienen Code-Diskussion, nicht Essay-Schreiben — Bold/Italic/Lists/Blockquote/Links sind kaum genutzt, aber jede dieser Features öffnet Sanitize-Edge-Cases; (2) zwei aktiv gepflegte Sicherheits-Libraries (`marked` und `DOMPurify`) wegfallen lassen heißt eine echte Attack-Surface-Reduktion; (3) Single-Source-of-Truth-Renderer für Backend+Frontend war mit Markdown nur schwer drift-frei zu halten. Wenn der Use-Case sich verschiebt, wird die Entscheidung in einem neuen ADR-Revisionsschritt re-evaluiert — nicht durch leise Erweiterung der Grammatik.
- **Server-rendered HTML auch für Posts:** Verworfen. Wäre konsistenter, aber Plan v1's Build-Time-Render-Architektur verloren. Frontend-shiki erlaubt trustless-Rendering und Theme-Switch via CSS-Variablen — das Killer-Feature von shiki, das andere Highlighter (highlight.js, prism) nicht trivial bieten.
- **GitHub-Style Reaction-Set (8 Emojis inkl. 👎):** Verworfen. 👎 ist implizites Downvoting, kollidiert mit Lern-Atmosphäre.
- **Free Emoji Picker:** Verworfen. Long-Tail-Cardinality (User wählt 🦄 + 🍕 + 🐢 → unleserliche UI). Fix-Set ist UX-konsistent.
- **Emoji-Set mit `helpful`, `outdated`, `needs-citation` (Custom-Tags statt Emojis):** Verworfen. UX-Overhead, weniger Emotion. Custom-Set `❤️ 😄 🦄 ☕ 👍 🐢` ist gewählt nach User-Vorgabe.

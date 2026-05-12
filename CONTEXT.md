# koomiteh.dev — Context

Single-source domain context for koomiteh.dev. Read this before exploring the codebase. ADRs in `docs/adr/` capture decisions in detail; this file is the high-level snapshot and glossary.

---

## Mission

Web-Plattform für Programmier-Lernende. Kuratierte Frage-Antwort-Beiträge im Format `Frage → kurze klare Antwort → Beispiel-Code`, differenziert nach Programmiersprache und Skill-Level. User können sich anmelden, Beiträge favorisieren, kommentieren und auf Kommentare reagieren. Admin pflegt Inhalte über ein UI.

---

## High-Level-Architektur

```
┌──────────────────────────────┐         ┌──────────────────────────────┐
│  Cloudflare Pages            │         │  Fly.io                      │
│  https://koomiteh.dev        │ ──API──▶│  https://api.koomiteh.dev    │
│  apps/web (Vite SPA)         │         │  apps/api (Hono on Node)     │
└──────────────────────────────┘         └────────────┬─────────────────┘
                                                      │
                                                      ▼
                                           ┌──────────────────────────┐
                                           │  Neon                    │
                                           │  PostgreSQL 16+          │
                                           │  (FTS via tsvector,      │
                                           │   pg_trgm, branching)    │
                                           └──────────────────────────┘
```

- **Web:** React + Vite + Redux-Toolkit-Query + MUI v6, deployed auf Cloudflare Pages.
- **API:** Hono auf Node, deployed auf Fly.io. JSON-REST.
- **DB:** Postgres bei Neon. Single Source of Truth für Inhalte und User-Daten.
- **Auth:** GitHub-OAuth, Server-Sessions in Postgres, httpOnly-Cookie auf `.koomiteh.dev`.
- **Monorepo:** npm workspaces — `apps/web`, `apps/api`, `packages/shared`.

Detailed architecture decisions: `docs/adr/`.

---

## Domain Glossary

Use these terms consistently in code, issues, ADRs, commit messages, and docs. Don't drift to synonyms.

### Entities

- **Post.** Ein Lern-Beitrag im Frage-Antwort-Format. Hat `language`, `level`, `tags`, `bodyMd`. Vom Admin geschrieben (`trusted MD` — nicht sanitized). Soft-Delete-fähig (Permalink stabil).
- **User.** Authentifizierte Person, identifiziert über GitHub-OAuth. Hat `role: 'user' | 'admin'`. GDPR-Soft-Delete: anonymisiert, `githubId = NULL`, `displayName = '[deleted]'`.
- **Session.** Server-side Authentifizierungs-Anker. Lebt in `sessions`-Tabelle, `id` im httpOnly-Cookie. Ablauf via `expiresAt`. Logout = Hard-Delete der Row.
- **Favorite.** Many-to-Many zwischen User und Post. Composite-PK `(userId, postId)`. Hard-Delete (Toggle-Operation).
- **Comment.** Public-User-Antwort auf einen Post. Markdown-Body (`untrusted MD` — server-sanitized). Speichert `bodyMd` (raw Input) und `bodyHtmlSafe` (sanitized HTML, ohne Code-Highlighting). Soft-Delete (`deleted_at`, Body wird "[deleted]"). Flat structure — kein Threading.
- **Reaction.** Emoji-Reaktion eines Users auf einen Comment. Fixes Set: `❤️ 😄 🦄 ☕ 👍 🐢` (Postgres-Enum `reaction_emoji`). Composite-PK `(commentId, userId, emoji)`. Hard-Delete (Toggle).

### Concepts

- **Trusted MD.** Markdown von einem Admin-User. Wird **nicht** sanitized. Frontend rendert via `marked` + `shiki/bundle/web`. Nur Posts.
- **Untrusted MD.** Markdown von Public-Usern. Wird **server-side** sanitized via `marked` + `DOMPurify`. Backend liefert `bodyHtmlSafe`. Frontend macht `dangerouslySetInnerHTML`. Nur Comments.
- **DB authoritative.** Nach einmaligem MD-Seed aus `content/interview/*.md` ist die Datenbank die einzige Wahrheitsquelle. Kein Re-Import. Edits laufen über das Admin-UI. Siehe ADR-0002.
- **Phased Rollout.** Migration vom statischen JSON-Stack zum DB-Backend in 10 vertical-slice PRs. Jeder PR ist deploy-bar, ein PR-Merge erhöht das Feature-Set inkrementell. Tracked als GitHub-Issues `Slice 1` bis `Slice 10`.
- **Soft-Delete vs Hard-Delete.** Mixed-Strategie: Posts/Comments/Users → Soft-Delete (Permalink-Stabilität, GDPR). Favorites/Reactions → Hard-Delete (Toggle-Operations, kein Audit-Wert).
- **Render-Asymmetrie.** Posts werden frontend-seitig mit shiki gerendert (trusted Source). Comments werden backend-seitig sanitized und gerendert (XSS-Mitigation), Code-Highlighting aber trotzdem frontend-seitig (Konsistenz mit Posts). Siehe ADR-0004.

### Frontend-State-Aufteilung

- **RTK Query** für Server-State (Posts, Search, User, Favorites, Comments, Reactions).
- **React-Context** nur für Theme (mit `localStorage`-Persistenz).
- **Lokales `useState`** für UI-State (Command-Palette, Modal-Open-State, Form-Drafts).
- **Keine** UI-Slices in Redux. Keine Auth-Slice — `useGetMeQuery()` ist die Source.

---

## Constraints und Invariants

- **TypeScript everywhere.** `apps/web`, `apps/api`, `packages/shared`. Keine JS-Files für Application-Code.
- **Schema in `packages/shared`.** Drizzle-Tabellen + drizzle-zod-Validatoren. Frontend importiert Validatoren für Form-Validation, Backend für API-Validation. Single Source of Truth für Types und Schemas.
- **i18n nur UI, nicht Content.** UI-Labels en/de übersetzt. Beitrag-Inhalte und Code-Blöcke bleiben in Original-Sprache (Englisch). Kein Path-Prefix-i18n.
- **Permalink-Stabilität.** `/interview/:language/:slug` muss URL-stabil bleiben. Detail-API (`GET /posts/:id`, `GET /posts/by-slug/...`) liefert für soft-deleted Posts **410 Gone** (nicht 404, nicht 200) — Frontend rendert einen "Frage entfernt"-State. URL wird nicht recycled. Public-Listing (`GET /posts`) blendet soft-deleted Posts aus.
- **CORS und Cookies.** API erlaubt nur Origin `https://koomiteh.dev` (+ Localhost in Dev). Cookies sind `SameSite=Lax; HttpOnly; Secure; Domain=.koomiteh.dev`. Origin-Header-Check für state-changing Requests.
- **Kein E2E-Vendor-Lock-in.** Web auf Pages, API auf Fly, DB auf Neon — austauschbar (nicht trivial, aber kein Lock-in-Layer wie z.B. Vercel-Edge-Functions oder Supabase-Auth).
- **Migrations via drizzle-kit.** Generierte SQL-Files committed unter `apps/api/drizzle/`. Migration läuft im CI als separater Step **vor** Deploy. Expand-Contract-Pattern bei Breaking-Changes.

---

## Operations

- **First admin assignment.** Nach erstem Login muss der eigene User-Row manuell auf `role='admin'` gesetzt werden:
  ```sql
  UPDATE users SET role = 'admin' WHERE github_login = '<your-github-login>';
  ```
- **Initial content seed.** Einmalig nach erstem Deploy: `npm run -w @koomiteh/api db:seed` läuft `content/interview/*.md` durch Zod, upsertet in `posts`. Idempotent. Danach ist die DB authoritativ — `content/`-Verzeichnis kann archiviert oder gelöscht werden.
- **Per-PR Test-DB.** GitHub-Action erstellt Neon-Branch pro PR, läuft Migrations + Tests, teardown bei PR-Close. Production-DB ist die `main`-Branch in Neon.

---

## Repository-Struktur

```
/
├── CONTEXT.md                          ← du bist hier
├── CLAUDE.md → AGENTS.md               ← Agent-Skill-Registry
├── plan-v1-static.md                   ← historischer Snapshot der Static-Phase
├── apps/
│   ├── web/                            ← Vite-SPA (ehemaliges Root-Projekt)
│   └── api/                            ← Hono-Backend
│       └── drizzle/                    ← Migrations
├── packages/
│   └── shared/                         ← Drizzle-Schemas + Zod-Validatoren
├── content/                            ← MD-Files (post-seed: archiviert)
└── docs/
    ├── adr/                            ← Architecture Decision Records
    └── agents/                         ← Agent-Skill-Konventionen
```

---

## Beim Beitragen

- Wenn du eine Entscheidung triffst, die einer ADR widerspricht — flagge das explizit (siehe `docs/agents/domain.md`).
- Wenn ein Begriff in diesem Glossar nicht da ist und du ihn brauchst, das ist ein Signal: entweder vermeidet das Projekt diesen Begriff bewusst, oder es ist eine echte Lücke. Bring's auf zur Klärung statt selbst zu erfinden.
- Issues und PR-Titel verwenden die Glossar-Begriffe oben. Keine Synonyme.

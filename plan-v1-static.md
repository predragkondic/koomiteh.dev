# koomiteh.dev — Plan v1 (Static-Content-Phase)

> **Historisches Dokument.** Beschreibt die erste Iteration mit statischer JSON-basierter Content-Pipeline. Architektur wurde am 2026-05-06 erweitert um Backend, Auth und User-generated Content.
>
> **Superseded by:** ADR-0001 bis ADR-0008 in `docs/adr/`. Aktueller Architektur-Snapshot in `CONTEXT.md`.
>
> Dieses File bleibt als Snapshot der initialen Design-Entscheidungen erhalten — viele davon (Routing, MUI, RTK-Query-Endpoint-Symmetrie, i18n, Theme-Layer) gelten unverändert weiter.

---

SPA, die Programmierern beim Weiterbilden hilft. Erstes Feature: **Interview** — kuratierte Beiträge nach dem Schema `Frage → kurze klare Antwort → Beispiel-Code`, differenziert nach Programmiersprache und Level (junior / senior).

---

## Stack

- **Build:** Vite, React + TypeScript, SPA.
- **Routing:** React Router v6.
- **State:**
  - Redux Toolkit + RTK Query (Server-/Inhalts-State).
  - React Context für Theme (mit `localStorage`-Persistenz).
  - Lokales `useState` für UI-State (z. B. Command-Palette).
  - **Keine** UI-Slices in Redux heute.
- **Styling:** MUI v6, zentrales `theme.ts` (Light + Dark via `colorSchemes`), `sx`-Prop für lokale Anpassungen, `CssBaseline` + `GlobalStyles`. **Keine** `styled()`-Wrapper.
- **Suche:** MiniSearch, indexed über `question` (boost ×3) + `tags` (boost ×1.5).
- **Code-Highlighting:** shiki, build-time, dual-theme via CSS-Variablen (`--shiki-light` / `--shiki-dark`).
- **i18n:** `react-i18next`, `en` / `de`, namespaced (`common`, `interview`), `localStorage` + Browser-Default, **nicht** in der URL.
- **Tests:** Vitest + React Testing Library + MSW.
  - Layer α (Hooks / Utils)
  - Layer β (Components)
  - Layer δ (Build-Script)
  - Kein E2E heute.

---

## Inhalt

- **Format:** Markdown + YAML Frontmatter, flat in `content/interview/`.
- **Schema:**
  ```yaml
  id: "typescript-junior-closures"
  slug: "what-is-a-closure"
  question: "What is a closure?"
  language: "typescript"
  level: "junior"
  tags: ["closures", "scope"]
  createdAt: "2026-04-29"
  updatedAt: "2026-04-29"
  ```
- **ID-Konvention:** `{language}-{level}-{kurzname}`, kebab-case. Filename = `{id}.md`.
- **Sprachen-Config** (`content/languages.config.ts`):
  ```ts
  export const LANGUAGES = [
    { id: "typescript", displayName: "TypeScript", shikiLang: "ts" },
    { id: "javascript", displayName: "JavaScript", shikiLang: "js" },
  ] as const;
  ```
- **Tags:** offene Liste, kebab-case (`^[a-z0-9-]+$`). Autocomplete im UI füttert sich aus existierenden Tags.
- **Validation:** Zod im Pre-Build. Build bricht bei Schema-Verstößen oder unbekannten Sprachen.

---

## Pre-Build-Pipeline (`scripts/build-content.ts`)

Liest alle MDs, validiert via Zod, rendert MD → HTML mit shiki (dual-theme), schreibt nach `public/content/`:

```
public/content/
  manifest.json                  ← { languages: [{id, displayName, count}], totalCount, builtAt }
  indexes/
    typescript.json              ← Frontmatter aller TS-Beiträge
    javascript.json
  posts/
    typescript-junior-closures.json   ← { frontmatter, bodyHtml }
    …
  search-index.json              ← serialisierter MiniSearch-Index, lazy geladen
```

**Symmetrie zur späteren API:** `GET /content/indexes/{lang}.json` ist 1:1 das, was später `GET /api/interview?language={lang}` liefern würde. Beim Switch ändert sich nur die Base-URL der RTK-Query-Endpoints.

---

## Routing

```tsx
<AppShell>
  {" "}
  {/* Header: Logo, GlobalSearch ⌘K, LangToggle, ThemeToggle */}
  <Route index element={<Navigate to="/interview" replace />} />
  <Route path="interview" element={<InterviewLayout />}>
    {" "}
    {/* Sprach-Tabs (versteckt bei 1 Sprache) */}
    <Route index element={<InterviewHubPage />} /> {/* /interview */}
    <Route path=":language" element={<InterviewListingPage />} />
    <Route path=":language/:slug" element={<InterviewDetailPage />} />
  </Route>
  <Route path="*" element={<NotFoundPage />} />
</AppShell>
```

**URL-Semantik:**

- Sprache als Pfad-Segment.
- Filter/Sort/Search/Page als Query-Params: `?level=`, `?tag=` (mehrfach), `?q=`, `?sort=`, `?page=`.
- Default-Werte werden **nicht** in die URL geschrieben (kürzere, sauberere URLs).
- Single-Language-Sonderfälle: bei nur einer Sprache redirectet `/interview` automatisch zur Sprach-Page; Sprach-Tabs werden nicht gerendert. Code-Pfad bleibt erhalten.

---

## RTK Query Slice (`postApi`)

**Endpoints:**

- `getManifest()` → `manifest.json`
- `getIndex(language)` → `indexes/{language}.json`
- `getPost(id)` → `posts/{id}.json`
- `getSearchIndex()` → `search-index.json` (lazy, einmalig)

**Custom Hook `useFilteredPosts()`** kapselt URL ↔ RTK-Query-Cache ↔ MiniSearch:

```ts
const {
  items, // PostFrontmatter[] – page-window
  totalFiltered, // number – Gesamtzahl nach Filter, vor Pagination
  page,
  pageCount,
  isIndexLoading,
  isSearchLoading,
  indexError,
  searchError,
} = useFilteredPosts(); // liest URL selbst
```

**Interner Ablauf:**

1. URL-State lesen (`useParams`, `useSearchParams`).
2. `useGetIndexQuery(language)` (oder alle Sprach-Indexe parallel auf `/interview` ohne Sprache, sofern überhaupt geladen — Hub-Page lädt nicht).
3. Wenn `q` gesetzt: `useGetSearchIndexQuery()` + Treffer-IDs gegen den Index mergen.
4. Filter (level, tags) → Sort → Page-Slice. Alles `useMemo`.

---

## UX-Konventionen

### Header (`AppShell`)

- Logo links → `/`.
- Globale Suche (⌘K Command-Palette, MUI `Dialog`), cross-language, Sprach-Badge bei Treffern (sichtbar ab 2 Sprachen).
- Sprach-Toggle (i18n: en/de).
- Theme-Toggle (light/dark, mit `prefers-color-scheme` als initialem Default).

### Hub-Page (`/interview`)

- Sprach-Tiles mit Counts.
- Auto-Redirect auf einzige Sprache, falls nur eine im Manifest.

### Listing (`/interview/:language`)

- **Sticky Top-Filter-Bar:** Search (debounced 250 ms), Level-ToggleButtonGroup (Junior / Senior / Beide), Tags-Autocomplete (multi), Sort-Select.
- **Aktive Filter-Chips** unter der Bar mit Reset-Link.
- **Karten:** Frage als Titel, Sprache + Level als Badges, max 3 Tags + „+N".
- **Pagination:** klassisch (MUI `Pagination`), 20 pro Seite. Page-Reset bei Filter-/Sort-/Search-/Sprach-Change.
- **Sort-Default:** `newest` ohne Suche, `relevance` bei aktiver Suche.

### Detail (`/interview/:language/:slug`)

- Single-Column-Lesefluss.
- Breadcrumb (Sprache + Level als klickbare Chips, führen zu vor-gefilterten Listings).
- H1 = `frontmatter.question`.
- Body = `dangerouslySetInnerHTML={{__html: post.bodyHtml}}` (Build-controlled, daher safe).
- Tags + `updatedAt`.
- **Prev / Next filter-bewusst:** wenn URL-Filter da sind, navigiert innerhalb der gefilterten Liste; sonst global im Sprach-Index.
- **Related Questions:** Tag-basierter Score, max 5, im selben Sprach-Index.

### Empty / Loading / Error

- Initial-Loading: Skeleton-Cards (Listing), Skeleton-Article (Detail).
- Re-Filter: kein Loading-State, in-memory Recompute.
- Empty (0 Treffer): inhaltliche Empty-Komponente + Reset-Button.
- Fetch-Fehler: MUI `Alert` mit Retry. Such-Fehler isoliert (Listing funktioniert weiter, Search-Input deaktiviert).
- Unbekannte Sprache / unbekannter Slug: NotFound _innerhalb_ des jeweiligen Layouts (nicht App-weit).
- Globale ErrorBoundary an der App-Wurzel als Catch-all.

---

## Theme & i18n

### Theme

- MUI `createTheme({ colorSchemes: { light, dark } })`.
- Domain-Tokens via TypeScript-Module-Augmentation:
  ```ts
  palette.level.junior / .senior
  palette.language.typescript / .javascript
  ```
- Globale Resets in `GlobalStyles` (Body-Background, `pre.shiki`-Selektoren mit CSS-Variablen für Theme-Switching).
- Persistierung: `ThemeContext` + `localStorage`. Default = `prefers-color-scheme`.

### i18n

- `react-i18next` mit Namespaces `common` und `interview`.
- Default-Resolution: `localStorage` → `navigator.language` → `en`.
- **Übersetzt:** UI-Labels, Empty/Error-Messages, Aria-Labels, Plurals (`results_one` / `results_other`).
- **Nicht übersetzt:** Beitrag-Inhalte, Sprach-Display-Namen, Code-Blöcke.
- **Datums-Formate:** `Intl.DateTimeFormat(currentLocale)`.

---

## Test-Strategie

```
src/
  hooks/
    useFilteredPosts.test.ts        ← α
  utils/
    search.test.ts                  ← α
    sort.test.ts                    ← α
  features/interview/
    InterviewListingPage.test.tsx   ← β  (mit MSW)
    InterviewDetailPage.test.tsx    ← β
    InterviewHubPage.test.tsx       ← β
scripts/
  build-content.test.ts             ← δ
  __fixtures__/                     ← Test-MD-Files
```

**Was nicht getestet wird:** MUI-Komponenten selbst, Trivial-Wrapper, Snapshot-Tests ohne Fokus.

---

## Bewusst weggelassen (für später)

- **E2E-Tests** (Playwright) — kommt, wenn Multi-Step-Flows oder Auth dazukommen.
- **Cross-Language-Verweise** (`relatedIds`) — Tag-basiertes Related deckt's ausreichend ab.
- **User-generated Content** — der Hybrid-Migrations-Pfad auf eine echte API ist vorbereitet (RTK-Query-Endpoints sind API-symmetrisch), aber kein UGC-Feature ist heute geplant.
- **Footer.**
- **User-wählbare Page-Size** — fix 20.
- **Path-Prefix-i18n** (`/de/...` / `/en/...`) — Inhalte sind englisch, nur UI ist übersetzt; Path-Prefix wäre SEO-Lüge.
- **Cross-Language-Multi-Select-Listing** — die Hub-Page ist die ehrlichere Antwort.

---

## Erste Sprachen (heute)

- **TypeScript** (`typescript`)
- **JavaScript** (`javascript`)

Hub-Page und Sprach-Tabs sind ab Tag 1 aktiv (≥ 2 Sprachen).

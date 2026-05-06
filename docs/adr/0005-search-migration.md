# ADR-0005: Search-Migration (MiniSearch → Postgres FTS) und Pagination

- **Status:** Accepted
- **Date:** 2026-05-06

## Context

Plan v1 nutzte MiniSearch — Client-Side-Full-Text-Search mit Field-Boosts. Index wurde build-time erzeugt, als JSON ausgeliefert, im Browser deserialisiert und für Search verwendet. Felder: `question` (boost ×3), `tags` (boost ×1.5).

Mit DB-Migration (ADR-0001, ADR-0002) verschiebt sich Content in Postgres. Client-Side-Index aus DB lazy zu serialisieren wäre möglich, aber: Index müsste bei jedem Post-Insert/Update neu erzeugt werden. Hack-y.

Außerdem stellt sich die Pagination-Frage: Plan v1 hatte 20-pro-Seite mit `MUI Pagination` (numbered pages). Mit Server-Side-Search braucht es eine Pagination-Strategie.

## Decision

### Search: Postgres `tsvector` + GIN-Index + `pg_trgm`

**Schema-Design** (in Drizzle):

```sql
search_vector tsvector GENERATED ALWAYS AS (
  setweight(to_tsvector('english', question), 'A') ||
  setweight(to_tsvector('english', array_to_string(tags, ' ')), 'B') ||
  setweight(to_tsvector('english', body_md), 'C')
) STORED;

CREATE INDEX posts_search_idx ON posts USING GIN(search_vector);
CREATE EXTENSION pg_trgm;
CREATE INDEX posts_question_trgm_idx ON posts USING GIN(question gin_trgm_ops);
```

- `setweight` ersetzt MiniSearch's Field-Boosts (A > B > C).
- `pg_trgm` für Fuzzy-Matching (typo-tolerance) als Fallback wenn FTS null Treffer liefert.
- Generated-Column hält `search_vector` automatisch synchron mit Quell-Spalten — kein Trigger nötig.

**API-Endpoint:**

```
GET /api/posts?language=ts&level=junior&tag=closures&q=closure&sort=relevance&page=1&pageSize=20
→ {
    items: PostFrontmatter[],
    page: 1,
    pageSize: 20,
    total: 247,
    pageCount: 13
  }
```

**Sort-Logik:**

- `?sort=relevance` (default wenn `q` gesetzt) → `ORDER BY ts_rank(search_vector, plainto_tsquery('english', q)) DESC`.
- `?sort=newest` (default wenn kein `q`) → `ORDER BY created_at DESC`.

**Filter-Kombinationen:** `language` (eq), `level` (eq), `tag` (mehrfach, Postgres-Array `&&`-Operator), `q` (FTS).

### Pagination: Offset

- `?page=N&pageSize=K` → `LIMIT K OFFSET (N-1)*K`.
- `total` wird via `SELECT COUNT(*)` in derselben Query (oder zweite Query) ermittelt.
- `pageCount = ceil(total / pageSize)`.
- Default `pageSize=20`, max `100`.
- Page-Reset bei Filter-/Sort-/Search-Change (wie Plan v1).

### Frontend-Hook: `useFilteredPosts` umgestellt

- Liest weiterhin URL-State (`useParams`, `useSearchParams`).
- Triggert **einen** RTK-Query-Call `useSearchPostsQuery({language, level, tag[], q, sort, page})` — debounced 250ms wenn `q` aktiv.
- Output-Shape unverändert (`items, totalFiltered, page, pageCount, isIndexLoading, isSearchLoading, indexError, searchError`) damit Listing-/Detail-Komponenten unangetastet bleiben.
- MiniSearch-Imports gelöscht. `search-index.json`-Endpoint entfällt.

## Consequences

### Positive

- **Server-Side-Search.** Keine Index-JSON-Downloads mehr. Konsistente Ergebnisse mit DB-Stand. Neue Posts sind sofort suchbar nach Insert.
- **`pg_trgm` als Bonus.** Fuzzy-Match auf Tippfehler ("closur" matcht "closure") — Feature, das MiniSearch nicht hatte.
- **Reife Postgres-Tooling.** `tsvector`-Search ist battle-tested, auf jedem Postgres-Hoster verfügbar. Drizzle hat First-Class-Support.
- **Offset-Pagination ist UX-passend.** `MUI Pagination` mit numbered pages funktioniert (User klickt direkt zu Page 7), `total`-Count ermöglicht "Page 5/12"-Anzeige. Plan v1's UX bleibt.

### Negative / Trade-offs

- **Search funktioniert nur online.** Plan v1's MiniSearch funktionierte offline nach Initial-Load. Für skillup.dev kein realer Use-Case (Posts kommen eh aus DB).
- **Offset wird teuer ab ~10k Rows.** Postgres scannt alle vorherigen Rows, um sie zu skippen. Bei skillup.dev-Volumen (Posts: dutzende-bis-hunderte) irrelevant. Sollte Volumen jemals stark wachsen → Cursor-Pagination als Migration.
- **Stop-Words und Stemming hardcoded auf Englisch.** `to_tsvector('english', ...)`. Inhalte sind englisch (laut `plan-v1-static.md`-Entscheidung), passt. Falls je mehrsprachige Inhalte: pro-Language-Vector oder `simple`-Config nötig.
- **Generated-Column-Performance.** Insert/Update auf `posts` triggert Re-Compute des Vectors. Bei niedriger Schreibfrequenz (Admin-only) trivial.

## Alternatives Considered

- **MiniSearch beibehalten, Index aus DB serialisieren:** Verworfen. Index muss bei jedem Post-Edit neu erzeugt werden — entweder eager (Latency-Cost beim Save) oder lazy mit Cache-Invalidation (Komplexität). Server-Side-Search ist sauberer.
- **`ILIKE '%query%'`:** Verworfen. Kein Ranking, kein Stemming, langsam ohne speziellen Index.
- **Externe Search-Engine** (Meilisearch, Typesense, Algolia): Verworfen. Best-in-class Capabilities, aber extra Service zu betreiben + Sync-Logik. Massiv overkill für skillup.dev's Volumen. Kann später nachgerüstet werden, wenn Postgres-FTS limitiert.
- **Cursor-Pagination:** Verworfen für jetzt. Skaliert konstant unabhängig von Page-Tiefe, aber: kein Page-Jump (UX-Regression vs. Plan v1), Total-Count separat, Sort-Switch erzwingt Cursor-Reset. Würde sich erst lohnen ab Volumen >10k Rows.
- **Infinite-Scroll:** Verworfen. Plan v1's UX hatte explizit numbered Pagination; Infinite-Scroll wäre eine UX-Pivot ohne Anlass.
- **Hybrid (Offset + estimated total via `pg_class.reltuples`):** Verworfen. Premature für aktuelle Skala.

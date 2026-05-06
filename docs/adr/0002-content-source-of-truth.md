# ADR-0002: Content-Source-of-Truth

- **Status:** Accepted
- **Date:** 2026-05-06

## Context

Inhalte (Posts) lagen ursprünglich als Markdown-Files in `content/interview/*.md`, gepflegt über Git. Build-Time-Pipeline rendete sie zu statischem JSON. Mit der Backend-Einführung (ADR-0001) muss die Frage geklärt werden: wo entstehen Posts in Zukunft?

Drei realistische Modelle:

- **Git-only:** MDs bleiben kanonisch in Git, Backend importiert bei jedem Deploy idempotent.
- **DB-only:** Einmaliger Seed aus MDs, danach Edits ausschließlich über Admin-UI.
- **Hybrid:** Initial-Seed + Admin-UI für spätere Edits, mit Drift-Strategie zwischen Git-Stand und DB-Stand.

## Decision

**Hybrid-Approach mit DB als authoritative Source nach einmaligem Seed.**

- **Phase 1 (einmalig):** Seed-Skript (`apps/api/src/seed.ts`) liest `content/interview/*.md`, validiert via Zod, upsertet in `posts`. Idempotent.
- **Phase 2 (laufend):** Admin schreibt und editiert Posts ausschließlich über das Admin-UI (siehe Slice 9 / ADR-0001). Git-MDs werden nicht mehr re-importiert.
- **`content/interview/`** kann nach erfolgreichem Seed archiviert oder gelöscht werden. Keine Re-Import-Logik im API-Code — der Seed läuft *einmal*, danach nie wieder.

**Begriffe:** `DB authoritative` (nach Seed) wird konsistent in CONTEXT.md, ADRs, Issues und PR-Beschreibungen verwendet.

## Consequences

### Positive

- Keine Drift-Logik nötig. Keine `source = 'git' | 'db'`-Spalte, keine Last-Write-Wins-Timestamps. Mental-Model trivial: nach Seed ist DB die Wahrheit.
- Admin-UI hat klares Feature-Profil — alles editierbar, kein "vorsicht, das ist Git-owned".
- Markdown-Editing über UI bleibt komfortabel (siehe ADR-0004 für Editor-Setup).

### Negative / Trade-offs

- Git-Workflow für Content-Versionierung entfällt. Diff/Review/Rollback laufen nicht mehr über `git`. Bei kritischen Inhalten muss DB-Backup-Strategie (Neon-Backups) als Recovery-Pfad dienen.
- Wenn Inhalte bei Migration zwischen DB-Hostern transferiert werden müssen, ist `pg_dump` der Mechanismus — kein `git clone` mehr für Content.
- Beim Wechsel zurück zu Git (sollte das je gewünscht sein): Export-Script nötig (`SELECT body_md FROM posts → write file`).

## Alternatives Considered

- **Git-only (re-import bei jedem Deploy):** Verworfen. Macht Admin-UI sinnlos, weil DB-Edits beim nächsten Deploy verloren gehen. Würde Admin-UI auf reine Read-Only-View reduzieren.
- **Drift mit `source`-Flag:** Verworfen. Komplex, fehleranfällig, lädt zu Halbwahrheiten ein ("der Post war mal Git-owned, jetzt DB-owned, was bedeutet das für Re-Import?"). Explizite einmalige Cutover ist sauberer.
- **Last-Write-Wins per Timestamp:** Verworfen. Clock-Skew-Risiken, Frontmatter-Updates für Tippfehler triggern unerwartete Overwrites.
- **Git-as-Source mit Sync-Endpoint:** Admin pusht Git-Commit, API hat einen authenticated `POST /api/admin/sync`-Endpoint, der re-importiert. Funktioniert, aber kollidiert mit Admin-UI-Vision (du willst ein UI, nicht Git+UI).

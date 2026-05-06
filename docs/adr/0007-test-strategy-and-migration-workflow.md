# ADR-0007: Test-Strategie und Migrations-Workflow

- **Status:** Accepted
- **Date:** 2026-05-06

## Context

Mit dem neuen Backend gibt es zusätzliche Test-Layers. Plan v1 testete nur Frontend (Hooks, Komponenten mit MSW, Build-Script). Backend braucht eigene Test-Strategie. Außerdem: wie laufen DB-Migrations sicher von Dev → CI → Prod?

Beide Themen sind eng gekoppelt: Tests müssen gegen migrierte DB laufen, Migrations müssen vor Tests applied sein, CI orchestriert beides.

## Decision

### Test-Strategie

**Layer-Aufteilung:**

| Layer | Scope | Tooling | Test-DB |
|---|---|---|---|
| α (Hooks/Utils) | `apps/web/src/hooks/`, `apps/web/src/utils/` | Vitest | — |
| β (Components) | `apps/web/src/features/` | Vitest + RTL + MSW | MSW-Mocks (kein echter Server) |
| γ (Backend-Integration) | `apps/api/src/routes/*.integration.ts` | Vitest | echte Neon-Branch |
| δ (E2E-Smoke) | `apps/e2e/` (oder Root) | Playwright | echte Neon-Branch + Full Stack |

**Bewusst weggelassen:** Backend-Unit-Tests mit gemocktem Drizzle. Erfahrungswert: solche Tests testen sich selbst (Mock-Setup wird zur Spec) und brüchig — Drizzle-API-Änderung bricht Tests, ohne echten Bug zu fangen. Lieber eine Schicht höher (Integration mit echter DB) testen.

**MSW-Mocks im Frontend:** Handlers nutzen Zod-Schemas aus `packages/shared` als Mock-Generator-Quelle. Drift zwischen Frontend-Erwartung und Backend-Realität ist dadurch unwahrscheinlich (Schema-Single-Source).

**E2E-Scope:** 2 Smoke-Tests in initialer Iteration:

1. **Anonymous-Search-and-Read** — Hub → Listing → Search → Detail. Public-Path, Critical-Smoke.
2. **Favorite-Toggle** — Login (DB-Session-Bypass) → Star-Click → Persist → Re-toggle.

Bewusst nicht E2E getestet (für jetzt):

- Full GitHub-OAuth-Flow (Mock-Provider würde reale OAuth-Bugs nicht fangen, echter Provider ist flaky in CI; manuell verifizieren).
- Comment-Create + Reaction-Flow (in Component-Tests + Integration-Tests abgedeckt).
- Admin-UI (manuell verifizieren beim ersten Post-Create; danach Path stabil).
- 401-Handling (schwer reproducibel in CI; Component-Tests mit MSW-401-Stub decken Logic ab).

E2E-Suite kann erweitert werden, wenn ein User-Flow oft bricht.

### Test-DB-Strategie: Neon-Branching

Pro PR erstellt eine GitHub-Action eine Neon-Branch via `neondatabase/create-branch-action`. Migrations laufen gegen die Branch, dann Tests, dann Branch-Teardown bei PR-Close.

```yaml
- uses: neondatabase/create-branch-action@v5
  with:
    project_id: ${{ secrets.NEON_PROJECT_ID }}
    branch_name: pr-${{ github.event.number }}
- run: npm run -w @skillup/api db:migrate
  env: { DATABASE_URL: ${{ steps.create_branch.outputs.db_url }} }
- run: npm run -w @skillup/api test
- if: github.event.action == 'closed'
  uses: neondatabase/delete-branch-action@v3
```

**Test-Helper für E2E:** `loginAs(page, userId)` insertet Session-Row direkt via Drizzle gegen Test-DB-Branch und setzt Cookie auf Page-Context. Bypass von GitHub-OAuth — sauber, weil DB-Manipulation direkt möglich ist.

### Migrations-Workflow

**Pattern:** Drizzle-Kit-Migrations als separater CI-Step **vor** Deploy.

**Dev-Loop:**

```bash
# Schema in packages/shared/db/schema.ts ändern
npm run -w @skillup/api db:generate   # generiert SQL in apps/api/drizzle/
git add apps/api/drizzle/
git commit
```

**CI auf PR:** Migrations laufen gegen Neon-Branch. Tests gegen migrierte Branch. Branch-Teardown bei Close.

**CI auf merge-to-main:** Separater Job "Migrate Prod DB" läuft `db:migrate` gegen Neon-Main-Branch. Bei Erfolg → Fly-Deploy. Bei Fehler → Deploy abgebrochen.

**Expand-Contract bei Breaking-Changes:**

- Nicht-additive Schema-Changes (Spalten-Rename, Type-Change, Index-Drop, NOT-NULL hinzufügen) erfordern Two-Phase-Deploy:
  1. Migration 1 (additive): neue Spalten, alte bleiben. Code schreibt in beide.
  2. Code-Deploy.
  3. Migration 2 (cleanup): alte Spalten droppen.
- Disziplin-Sache, kein automatisches Tooling. Bei rein-additiven Migrations (neue Tabelle, neue Spalte mit Default) reicht der einfache Workflow.

**Rollback-Strategie:**

- Drizzle generiert nur Up-Files. Down-Migrations nicht standardmäßig.
- Bei kaputter Migration: Forward-Fix (neue Migration, die Schaden behebt). Echte Rollbacks sind in Postgres ohnehin gefährlich, wenn Daten dazugekommen sind.
- Backup-Recovery via Neon-Point-in-Time-Recovery als Last-Resort.

## Consequences

### Positive

- **Echte DB im CI** fängt Postgres-spezifische Bugs (FTS-Queries, Constraint-Violations, Generated-Columns), die Mocks niemals fangen.
- **Per-PR-Isolation** durch Neon-Branching: keine Test-Pollution, keine "weil-anderer-PR-die-DB-zerstört-hat"-Flaky-Tests.
- **Migrations-vor-Deploy** verhindert Inkonsistenzen zwischen DB-Schema und Code-Erwartung in Production.
- **Schmaler E2E-Scope** hält CI schnell und Maintenance niedrig. Nur kritische Flows.
- **Schema-Single-Source** in `packages/shared` macht Frontend-MSW-Mocks und Backend-Validation symmetrisch — Drift unwahrscheinlich.

### Negative / Trade-offs

- **Neon-Branching-Quota.** Free-Tier hat Branch-Limits. Bei vielen offenen PRs könnte das relevant werden. Teardown bei PR-Close mitigiert.
- **CI-Zeit höher** als rein Mock-basiert. Postgres-Spin-Up + Migration ist ~5-15s pro Run. Akzeptabel für Solo-Projekt.
- **Manuelles Expand-Contract.** Disziplin nötig — kein Linter zwingt zu Two-Phase. Bei Solo-Projekt OK; bei Team-Projekt wäre Tooling (z.B. `pgroll`) erwägenswert.
- **OAuth-Flow nicht E2E-getestet.** Manuelle Test-Verantwortung vor jedem Auth-Refactor. Akzeptabel weil Auth-Code stabil sein wird (selten geändert).

## Alternatives Considered

- **PGlite (WASM-Postgres in-memory):** Verworfen. Brutal schnell, aber `pg_trgm` und Custom-Extensions sind nicht alle verfügbar. Risiko: Tests grün, Prod-Postgres scheitert. Echte DB ist sicherer.
- **Postgres im Docker-Container im CI:** Funktional, aber Cold-Start ~30s und keine Branching-Goodies. Neon-Branching ist überlegener Workflow.
- **Backend-Unit-Tests mit gemocktem Drizzle:** Verworfen. Mock-Setup wird zur Spec, Tests testen sich selbst, fangen reale Bugs nicht.
- **Maximal-Test-Strategie (Backend-Unit + Integration + Frontend + E2E):** Verworfen. Höchste Confidence, aber Maintenance-Tax zu hoch für Solo-Projekt.
- **Minimal-Strategie (nur Backend-Unit + Frontend-MSW, kein E2E, keine echte DB):** Verworfen. Production wird zur Test-Umgebung; FTS-Bugs und Migration-Probleme erst live entdeckt.
- **Contract-Tests via OpenAPI-Schema-Generation:** Erwägenswert für Zukunft. Backend würde OpenAPI-Schema exportieren, Frontend-MSW-Mocks daraus generiert. Aktuell: Zod-Schema-Sharing in `packages/shared` reicht, weil Frontend und Backend im selben Repo sind.
- **Migrations beim API-Boot:** Verworfen. Multi-Instance-Race-Condition möglich (Fly skaliert auf >1 Machine), Mid-Deploy-Inkompatibilitäts-Window. Separater CI-Step ist sicherer.
- **Migrations manuell via SSH/lokal:** Solo-OK, aber kein Audit-Trail in CI. Automation ist 1h Setup und schützt vor Friday-Night-Forgetfulness.

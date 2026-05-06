# ADR-0001: Backend-Einführung und Monorepo-Layout

- **Status:** Accepted
- **Date:** 2026-05-06
- **Deciders:** Peko (solo)

## Context

skillup.dev startete als reine SPA mit Build-Time-Inhalten (Markdown → JSON, statisch ausgeliefert von Cloudflare Pages). RTK-Query-Endpoints traffen statische `public/content/*.json`-Files. Architektur war bewusst API-symmetrisch designed (siehe `plan-v1-static.md`), um spätere Migration zu echtem Backend zu erleichtern.

User-generated Content (Login, Favoriten, Kommentare, Reactions) ist nicht statisch realisierbar. Dynamische User-Daten brauchen Backend + Datenbank.

## Decision

**Backend einführen. Inhalte und User-Daten leben in PostgreSQL.** Static-Content-Pipeline wird abgeschafft.

**Monorepo via npm workspaces:**

```
apps/
  web/        ← Vite-SPA (ehemaliges Root-Projekt)
  api/        ← Hono-Backend
packages/
  shared/     ← Drizzle-Schemas + drizzle-zod-Validatoren
```

**Backend-Stack:**

- **Runtime:** Node.js (kein Bun, kein Deno, kein Edge).
- **Framework:** Hono — moderne API auf Web-Standards-Level.
- **DB:** PostgreSQL (siehe ADR-0006 für Hosting).
- **ORM:** Drizzle ORM mit `drizzle-zod`. Schema-as-TS-Code, Schema lebt in `packages/shared/db/schema.ts`. Migrations via `drizzle-kit`.

## Consequences

### Positive

- Schema-as-TS-Code: Frontend und Backend importieren dieselben Zod-Validatoren aus `packages/shared`. Drift unmöglich.
- npm workspaces: niedrigste Friction-Migration vom existierenden npm-Setup. Keine neuen Tools (kein pnpm, kein Turborepo).
- Hono läuft auf Node — TCP-Postgres frei verfügbar, ORM-Auswahl uneingeschränkt. Edge-Migration (Cloudflare Workers, Neon HTTP-Driver) bleibt als Backout-Pfad offen.
- Drizzle ist leichtgewichtig (kein Codegen-Engine wie Prisma), SQL-nah, schnell zu lernen.

### Negative / Trade-offs

- Build-Time-Pipeline (`scripts/build-content.ts`, dual-theme shiki, MiniSearch-Index) wird zerstört. Suchfunktion muss server-side neu gebaut werden (siehe ADR-0005). Code-Highlighting wandert ins Frontend (siehe ADR-0004).
- Keine statische Site mehr → CDN-Caching pro-Page entfällt für Listing/Detail-Endpoints. Kann später via API-Caching kompensiert werden.
- Drei Vendors statt einem (siehe ADR-0006).
- Drizzle hat kleineres Ökosystem als Prisma. Wenn ein Edge-Case nicht unterstützt ist, muss raw SQL geschrieben werden.

## Alternatives Considered

- **Hybrid (Inhalte statisch, Backend nur für User-State):** Verworfen. Wäre eleganter und cache-freundlicher, aber kollidiert mit langfristigen Plänen für UGC-erweiterte Posts (z.B. User können Posts editieren, Versionierung). Single Source of Truth wertvoller als Hybrid.
- **Bun + Hono auf Cloudflare Workers:** Verworfen. Edge-Constraint zwingt zu HTTP-Driver (Neon HTTP), schließt klassische ORMs aus, Bun-Runtime hat Edge-Cases bei npm-Paketen. Risiko zu hoch für Solo-Projekt.
- **Express:** Verworfen. Veraltet (Sync-Middleware, Callback-Style), keine eingebaute Schema-Validation.
- **Fastify:** Echte Alternative zu Hono. Reiferes Plugin-Ökosystem. Hono gewählt wegen Web-Standards-API und besserer Migrations-Story zu Edge falls je gewünscht.
- **NestJS:** Verworfen. Schwer, DI-Container, opinionated. Massiv overkill für skillup.dev.
- **Prisma als ORM:** Verworfen. Eigene Schema-DSL, separate Codegen-Engine, schwerer Runtime-Footprint (Engine-Binary). Drizzle's TS-natives Schema passt besser zu `packages/shared`.
- **Kysely als Query-Builder:** Brutal type-safe, aber kein eingebautes Migrations-Tool, mehr Boilerplate für CRUD. Drizzle bietet beides.
- **pnpm workspaces:** Schneller als npm, strenger mit hoisting. Migration-Aufwand nicht gerechtfertigt für Solo-Projekt mit 2 Apps + 1 Package.
- **Turborepo:** Build-Cache wertvoll ab 4-5+ Packages. Premature für jetzt, später nachrüstbar.

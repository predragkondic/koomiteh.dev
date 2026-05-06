# ADR-0006: Deployment-Topologie und Observability

- **Status:** Accepted
- **Date:** 2026-05-06

## Context

Mit Backend-Einführung muss entschieden werden, wo API, DB und Web laufen. Außerdem braucht es eine Cookie- und CORS-Strategie zwischen Web (statisch) und API (dynamisch). Und: Logging + Error-Tracking + Metrics für Production-Operability.

## Decision

### Hosting: Three-Vendor-Split

| Komponente | Vendor | URL |
|---|---|---|
| Web (Vite-SPA) | Cloudflare Pages | `https://skillup.dev` |
| API (Hono) | Fly.io | `https://api.skillup.dev` |
| DB (PostgreSQL) | Neon | (Connection-String) |

**Begründung pro Vendor:**

- **Neon:** Postgres-as-a-Service mit Branching-Feature. Per-PR-DB-Branches via GitHub-Action ermöglichen isolierte Test-Runs ohne Staging-DB-Pollution. HTTP-Driver verfügbar als Backout-Pfad falls je Edge-Migration. Generöser Free-Tier.
- **Fly.io:** Container-Runtime mit Region-Kontrolle, eingebauten Health-Checks, Zero-Downtime-Deploy, gute DX. Hostet Hono-API in Standard-Node-Container.
- **Cloudflare Pages:** Unbegrenzt-Bandwidth gratis, schnellster CDN, perfekt für Vite-Static-Build. Auto-Deploy bei Push auf `main`.

### Domain-Strategie: Subdomain mit Domain-Cookie

- `skillup.dev` → Cloudflare Pages
- `api.skillup.dev` → Fly-App-CNAME
- **Cookie-Reichweite:** `Domain=.skillup.dev; SameSite=Lax; Secure; HttpOnly`. Beide Subdomains teilen Cookie. Same-Site nach RFC-6265bis (`skillup.dev` und `api.skillup.dev` sind same-site).
- **CORS:** Hono erlaubt Origin `https://skillup.dev` (Prod) und `http://localhost:5173` (Dev), `credentials: true`.

### Local Development

- **Vite-Proxy** in `apps/web/vite.config.ts` route `/api/*` → `http://localhost:3000`. Lokal gibt es nur einen Origin → keine CORS-Friction in Dev.
- **API-Dev-Server** läuft auf `localhost:3000` via `tsx watch apps/api/src/index.ts`.
- **Lokale DB:** Entweder eigene Neon-Dev-Branch oder lokaler Postgres via Docker (`postgres:16`).
- **Cookie in Dev:** `Domain` weglassen (Cookies funktionieren nur same-host für `localhost`).

### Observability

| Layer | Tool | Setup-Slice |
|---|---|---|
| Application-Logs | `pino` (JSON-strukturiert) via `hono-pino` | Slice 2 |
| Error-Tracking | Sentry (Web + API) | Slice 2 |
| Metrics | Fly.io built-in (CPU, RAM, HTTP-Codes, Connections) | Slice 2 |

**Logging-Praxis:**

- JSON-pro-Zeile, Fly aggregiert.
- Request-ID-Middleware: jeder Request bekommt `X-Request-ID`, in pino-Context, in Sentry-Breadcrumbs.
- Filter via `fly logs | jq 'select(.requestId == "...")'`.

**Sentry-Praxis:**

- DSN als Env-Var. Source-Maps für Frontend-Errors uploadet via Sentry-CLI in CI.
- User-Context (`user.id` aus Session) gesetzt für authenticated Requests — hilft bei User-spezifischen Bugs.
- ErrorBoundary auf Root von `apps/web` fängt React-Render-Errors.

## Consequences

### Positive

- **Klare Vendor-Verantwortung.** Jeder Vendor macht eine Sache. Bei Problemen ist die Quelle eindeutig zuordenbar.
- **Austauschbar.** Kein Vendor-spezifisches Lock-in (kein Vercel-Edge, kein Supabase-Auth, kein Cloudflare-Workers). Migration zwischen Hostern wäre Config-Change, kein Code-Rewrite.
- **Neon-Branching ist Killer-Feature für CI** (siehe ADR-0007).
- **Cloudflare-CDN gratis** für Web-Assets — schnellstes globales Delivery für statische Inhalte.
- **`SameSite=Lax` mit Domain-Cookie** ist 2026er-Best-Practice für SPA+API-Setup.

### Negative / Trade-offs

- **Drei Vendor-Accounts** statt einem. Mehr Onboarding (Slice 2 ist HITL wegen Vendor-Setup), mehr Bills (alle drei haben aber Free-Tier, der für skillup.dev reicht).
- **Cross-Region-Latency** zwischen Fly (API) und Neon (DB). Beide haben EU-Regionen — bei korrekter Region-Wahl <10ms intra-Region. Falls je Latency-Issue: Fly-Postgres als Co-located Alternative.
- **Sentry-DSN-Exposure** für Frontend (DSN steht im Bundle). Standard-Sentry-Modus; Public-DSN ist by-design. Rate-Limit auf Sentry-Seite verhindert Missbrauch.

## Alternatives Considered

- **Single-Vendor Fly.io (alles dort, inkl. Postgres):** Verworfen. Fly-Postgres ist self-managed (Backups manuell konfigurieren), Single-Region default. Neon's Branching wäre verloren — und das war ein zentraler Grund für DB-Wahl in ADR-0001.
- **Railway:** Echte Alternative zu Fly für API-Hosting. Bessere DX, etwas teurer. Fly gewählt wegen besserer Region-Kontrolle. Auswahl reversibel (Hono-Container portierbar).
- **Render:** Free-Tier hat Cold-Starts (15min idle). Bezahltes Tier ähnlich Railway. Kein Mehrwert.
- **Supabase (Postgres + Auth + Storage):** Verworfen. Würde Auth-Architektur (ADR-0003) übernehmen, koppelt aber stark an Vendor. Single-Vendor-Lock-in nicht gewollt.
- **Vercel (API + DB + Web unified):** Verworfen. Vercel-Lock-in deeper als Cloudflare-Pages. Vercel-Postgres ist Neon under-the-hood, also indirekte Abhängigkeit.
- **Cross-Origin (`pages.dev` + `fly.dev`):** Verworfen. `SameSite=None` zwingend für Cross-Site, mehr CSRF-Surface, hässliche URLs in Prod.
- **Pages-as-Reverse-Proxy via Cloudflare-Worker:** Verworfen. Single-Origin wäre nett (kein CORS), aber extra Worker-Hop (+20-50ms) und Worker-Code-Maintenance kostet mehr als CORS-Setup.
- **Vercel Postgres / PlanetScale:** Verworfen. Neon's Branching ist überlegen für Dev-Workflow; PlanetScale ist MySQL-only.
- **Custom-Metrics-Pipeline (Prometheus + Grafana):** Verworfen. Premature. Fly's eingebaute Metrics decken 95% der Solo-Use-Cases. Prometheus erst sinnvoll wenn man weiß, welche Custom-Metrics man fragen will.
- **Better-Stack / Logtail / Axiom als Logs+Errors-Combo:** Verworfen. Sentry hat reifere React/Node-Integration; pino → Fly-Logs reicht für Application-Logs. Combos lohnen sich erst bei Multi-Service-Distributed-Systemen.

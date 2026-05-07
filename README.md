# koomiteh.dev

Web platform for programming learners. Curated Q&A posts, GitHub-OAuth login, favorites, comments, reactions.

Domain context: see [`CONTEXT.md`](./CONTEXT.md). Architecture decisions: [`docs/adr/`](./docs/adr/).

## Local development

### Prerequisites

- Node.js 20+
- pnpm 10+ (`corepack enable` ships it with Node)
- Docker (for the local Postgres dev DB)

### First-time setup

```sh
pnpm install

# Local dev DB (Postgres 16 + pg_trgm).
docker compose up -d db

# Env files for both apps.
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

# Apply DB migrations.
pnpm -F @koomiteh/api db:migrate
```

### Day-to-day

Two terminals:

```sh
# API on http://localhost:3000
pnpm -F @koomiteh/api dev

# Web on http://localhost:5173 (proxies /api → :3000)
pnpm -F @koomiteh/web dev
```

### Useful commands

```sh
docker compose down            # stop DB (keeps data)
docker compose down -v         # stop DB + drop data volume
pnpm -F @koomiteh/api db:generate    # generate migration from schema diff
pnpm -F @koomiteh/api db:migrate     # apply migrations
pnpm -r typecheck                   # typecheck all workspaces
pnpm -r test                        # run tests in all workspaces
```

## Repository layout

```
apps/web      ← Vite SPA (Cloudflare Pages)
apps/api      ← Hono on Node (Fly.io)
packages/shared ← Drizzle schema + Zod validators
content/      ← Markdown seed content (post-seed: archived)
docs/adr/     ← Architecture Decision Records
```

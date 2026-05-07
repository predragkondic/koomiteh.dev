# Content seed

Single-purpose agent guidance: how to load `content/interview/*.md` into Postgres after the first deploy.

## When to run

- **Once** after Slice 4 ships and the prod DB is empty (no `posts` rows).
- After that, the DB is the source of truth (see ADR-0002). Re-running the seed against a populated DB is allowed (it's idempotent), but post-MVP the Admin-UI is the only intended write-path.

## How it works

`apps/api/src/seed.ts`:

1. Reads every `*.md` file in `content/interview/` (path resolved relative to repo root).
2. Parses YAML frontmatter via `gray-matter`.
3. Validates frontmatter via `seedFrontmatterSchema` from `@koomiteh/shared`. Bad frontmatter → throws.
4. Per file:
   - Looks up an existing row by `content_id` (= the frontmatter `id`, which equals the markdown filename stem).
   - If found → `UPDATE` (preserves the UUID PK, refreshes everything else).
   - If not → `INSERT`.
5. Reports `{inserted, updated, total}`.

The `posts.search_vector` column is `GENERATED ALWAYS AS (...) STORED` and recomputed by Postgres on insert/update. The seed never writes to it directly.

## Running

### Local (against a personal Neon branch or local Postgres)

```bash
DATABASE_URL=postgres://... pnpm -F @koomiteh/api db:migrate
DATABASE_URL=postgres://... pnpm -F @koomiteh/api db:seed
```

### Prod (Neon main branch)

This is a **one-time manual step** by the maintainer. There is no CI job for it on purpose — the seed should not run automatically on every deploy.

```bash
# from a trusted machine, with prod DATABASE_URL exported
DATABASE_URL=$NEON_PROD_URL pnpm -F @koomiteh/api db:seed
```

Verify via:

```bash
curl https://api.koomiteh.dev/posts/manifest
```

`totalCount` should equal the file count under `content/interview/`.

## Idempotency contract

- Running the seed twice with no source changes → second run reports `{inserted: 0, updated: N, total: N}`. Verified by the integration test in `apps/api/src/routes/posts.integration.test.ts`.
- Running the seed after an Admin-UI edit will **overwrite** the edit with the markdown content. Don't do this. The `content/` directory is intended to be archived once the seed has run.

## After the seed

- Promote your own user to admin (CONTEXT.md → Operations).
- Archive or delete `content/interview/` once the Admin-UI lands (Slice 7+). The seed script can stay; it's harmless when the directory is missing (returns `{inserted: 0, updated: 0, total: 0}`).

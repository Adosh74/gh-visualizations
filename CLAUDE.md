# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

TypeScript/Node backend that syncs data from selected GitHub repos into a local SQLite DB and serves it over an Express API. Single project (not a monorepo, despite `pnpm-workspace.yaml`). README notes "0% AI code."

## Commands

Use **pnpm** (husky/lint-staged rely on it; the stray `package-lock.json` is not authoritative).

- Run/dev: `pnpm start` — runs `ts-node src/index.ts` directly (no build/watch step; there is no `build` script).
- Test: `pnpm test` — `jest --no-cache`. Single test: `pnpm test -- -t 'test name'`.
- Lint: `pnpm lint`. Auto-fix + format: `pnpm lint:fix` (formatting is ESLint-driven via `@antfu/eslint-config`; there is no separate Prettier/format command).

A husky pre-commit hook runs `lint-staged` (`pnpm lint` on staged files), so lint must pass to commit.

## Code style (ESLint-enforced — violations fail lint)

- **Filenames must be kebab-case** (`repository-dao.ts`, not `RepositoryDao.ts`).
- 2-space indent, semicolons, single quotes.
- Imports must be sorted (`perfectionist/sort-imports`).
- **Never read `process.env` directly** — `node/no-process-env` is an error. All env access goes through `src/config.ts` (Zod-validated). Add new env vars to its schema.

## Database

- SQLite via the `sqlite`/`sqlite3` packages — **raw SQL, no ORM**. DB file `ghvisualization.sqlite` lives at repo root and is committed.
- **Migrations apply automatically on app start** (`SqlDatastore.openDb()` runs the `sqlite` migration runner). Add migrations as `migrations/00N-name.sql` following the numeric-prefix convention; do not edit already-applied migrations. There is no separate migrate command.
- Access the DB via `getDb()` (from `src/datastore/index-dao.ts`) after `initDb()` has run. Wrap queries with `databaseQueryWrapper`.

## Git workflow

- New work goes on `Feature/<Name>` branches; never commit directly to `main`.
- Open a PR into `main` for all changes.
- Use conventional commit messages (`feat:`, `fix:`, `chore:`, …).

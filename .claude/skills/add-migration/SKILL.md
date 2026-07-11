---
name: add-migration
description: Create a new SQLite migration file for gh-visualizations following the migrations/00N-name.sql convention. Use when adding or altering database tables/columns.
disable-model-invocation: true
---

# Add a database migration

This project uses the `sqlite` library's built-in migration runner. Migrations live in `migrations/` as `00N-name.sql` (zero-padded numeric prefix, kebab-case name) and are **applied automatically on app start** via `SqlDatastore.openDb()`.

`$ARGUMENTS` is the short description of the change (e.g. `add-repo-stars`).

Steps:

1. List `migrations/` and find the highest existing numeric prefix. The new file's number is that + 1, zero-padded to 3 digits (e.g. after `002-...` comes `003-...`).
2. Create `migrations/<NNN>-<kebab-name>.sql` where `<kebab-name>` derives from `$ARGUMENTS`.
3. Write the SQL. The `sqlite` migration runner supports `-- Up` and `-- Down` sections — follow the style of the existing migration files in `migrations/`. Keep `PRAGMA foreign_keys` semantics consistent with the existing schema.
4. Do **not** edit migrations that have already been applied — always add a new file.
5. Remind the user that the migration applies automatically on the next `pnpm start`; no separate migrate command is needed. If a DAO/SQL change in `src/datastore/` depends on the new column/table, update it too.

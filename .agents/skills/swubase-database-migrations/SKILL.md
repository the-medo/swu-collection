---
name: swubase-database-migrations
description: Change SWUBASE PostgreSQL Drizzle schemas, generate and review migrations, or create custom SQL/data migrations without desynchronizing migration metadata.
---

# SWUBASE database migrations

Use this skill for changes under `server/db/schema/`, `drizzle/`,
`drizzle/meta/`, or the migration runner. Before acting, read
`docs/migrations.md` completely.

## Workflow

1. Confirm `DATABASE_URL` targets the intended isolated development database.
   Use `swubase-worktree-dev` when a worktree database is needed.
2. Change the declarative schema in `server/db/schema/`. `drizzle.config.ts`
   loads every schema file in that directory.
3. Generate a schema migration with:

   ```bash
   bun run db-generate
   ```

   For data-only or other hand-written SQL, create a tracked custom migration:

   ```bash
   bun run db-generate --custom --name example_data_backfill
   ```

4. Review all generated artifacts together: the new `drizzle/<id>_*.sql`, its
   `drizzle/meta/<id>_snapshot.json`, and the new `drizzle/meta/_journal.json`
   entry. Check constraints, indexes, defaults, nullability, foreign-key delete
   behavior, casts, backfills, and locking/data-loss risk.
5. Apply the migration locally with `bun run db-migrate`, then exercise the
   affected query or endpoint.

Migrations are append-only once shared, committed, or applied. Do not edit an
old migration to represent a new change. If a newly generated migration is
wrong and still wholly local/unapplied, run
`bunx drizzle-kit drop --config=drizzle.config.ts` and confirm the exact entry
in its interactive prompt before proceeding. Use a tightly scoped manual
fallback only when necessary, then run `drizzle-kit check`. Preserve unrelated
or user-authored migration changes.

Keep schema and SQL intent aligned. A custom data migration still needs its
generated snapshot and journal entry. Never hand-number a migration or copy a
snapshot from another branch.

Use explicit database names, deliberate foreign-key `onDelete` behavior, and
indexes that match actual lookup/filter/order patterns. Any new table holding
user ownership, personal fields, provider payloads, credentials, matches,
collections, or decks requires `swubase-development-data` review; otherwise it
can silently escape sanitization coverage.

If Better Auth fields or tables change, also load `swubase-auth-permissions`.
If a migration changes sanitization or retained contributor data, also load
`swubase-development-data`.

## Validation

Run `bunx drizzle-kit check --config=drizzle.config.ts`, then
`bun run db-migrate` against the worktree database and `git diff --check`.
For destructive or data-transforming SQL, inspect representative rows before
and after and verify rerun/rollback expectations explicitly.

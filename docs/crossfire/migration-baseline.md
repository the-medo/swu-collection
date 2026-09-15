# Crossfire migration baseline

Crossfire's unreleased development migrations were consolidated into
[`0057_crossfire.sql`](../../drizzle/0057_crossfire.sql) on 2026-09-15. Migrations
`0000` through `0056`, their snapshots and journal entries remain unchanged.
The consolidated SQL and snapshot were generated from the current Drizzle schema;
they create all 19 `play` tables directly. PostgreSQL application data remains in
the existing database.

## Custom SQL audit

The previous 19-file chain contained two data operations beyond generated DDL:

| Previous operation | Treatment in the consolidated baseline |
| --- | --- |
| Delete obsolete non-initial checkpoints, retaining the newest | A fresh `play` schema has no existing checkpoints. The storage adapter continues enforcing initial/latest retention during play. |
| Mark games ended using their terminal checkpoints | A fresh schema has no pre-existing games. New terminal commands write lifecycle summaries atomically. The existing local database had already applied this backfill. |

The old journal rename and intermediate constraint replacements are represented
by their final definitions, including the stricter report snapshot/hash check.
There were no custom triggers, functions, grants or required initial-data inserts
to port. Card release installation and the active configuration pointer remain
application initialization responsibilities.

The current schema declares cascading deletion for practice-request participants;
the earliest SQL used `SET NULL`. The regenerated SQL preserves the final schema
and matches the checked local database's existing constraints.

The separate contributor-data sanitizer at
[`scripts/remote-dev/sql/000-crossfire.sql`](../../scripts/remote-dev/sql/000-crossfire.sql)
is unchanged. It still removes all `play.*` rows and the active card-release
pointer from public contributor dumps.

## Databases created before consolidation

Do not apply the consolidated `CREATE` statements over an existing `play` schema,
or simply delete its migration receipts and run the migrator. A checked existing
development database can be reconciled without changing its gameplay rows:

1. Stop application writers and take a complete local backup.
2. Apply the full new migration chain to a separate empty database on the isolated
   development server.
3. Compare Crossfire columns, defaults, constraints, indexes and relation
   attributes. Resolve any drift before changing migration history.
4. Verify all old migration receipt timestamps and SQL hashes against the saved
   original revision. Within one transaction, replace only those 19 receipts with
   the generated consolidated migration's timestamp and SHA-256 SQL hash.
5. Run `bun run db-migrate` and verify the schema, existing row counts and data
   hashes are unchanged before restarting services.

The Crossfire worktree was reconciled this way. Its original history is retained
under `backup/crossfire-before-squash-20260915`; the local database backup and
verification artifacts are ignored under `.swubase/history-refactor/`. This is a
one-time local operation, not an automatic production migration or a general
exception to the append-only migration policy. Other development copies need
their own verified reconciliation, or a deliberate reset from pre-Crossfire data.

Historical benchmark/source commit identifiers and published card-release
metadata remain unchanged. Reorganizing Git commits changes neither the card
catalog checksum nor engine behavior and requires no new card release.

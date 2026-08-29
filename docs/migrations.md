# Database migrations

The Drizzle schemas in `server/db/schema/` are the current schema source of
truth. Migrations are append-only once committed, shared, or applied.

Run every command from the repository root with `DATABASE_URL` pointing to the
intended isolated development database.

## Schema change

1. Update the relevant file in `server/db/schema/`.
2. Generate the migration:

   ```bash
   bun run db-generate
   ```

3. Review all artifacts created for the same migration ID:

   - `drizzle/<id>_<name>.sql`
   - `drizzle/meta/<id>_snapshot.json`
   - the new entry in `drizzle/meta/_journal.json`

   Check the SQL for destructive operations, nullability changes, defaults and
   backfills, constraints, foreign-key delete behavior, indexes, casts, and
   production-data volume.

4. Check and apply it:

   ```bash
   bunx drizzle-kit check --config=drizzle.config.ts
   bun run db-migrate
   ```

If a newly generated migration is wrong and has not been applied, shared, or
committed, drop that exact entry with:

```bash
bunx drizzle-kit drop --config=drizzle.config.ts
```

Confirm the migration selected by the interactive prompt before accepting the
change. The command removes its SQL and snapshot and updates the journal
together. Use a tightly scoped manual revert only if the command cannot handle
the entry, then run `drizzle-kit check`; never leave those three artifacts out
of sync or modify an older migration to represent a new change.

## Custom data migration

For seeding, backfills, or other SQL that does not originate from a schema
diff, generate an empty tracked migration:

```bash
bun run db-generate --custom --name example_data_backfill
```

Edit the generated SQL file, then review the matching snapshot and journal
entry and apply it with `bun run db-migrate` as above. A custom migration still
needs all three migration artifacts.

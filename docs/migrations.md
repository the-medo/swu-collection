# Migration with DB changes

### Step 1: Generate the migration

Run this command in the root of the project:
```bash
bun db-generate
```

### Step 2: Check the generated file
Drizzle will create a new file in your `drizzle/` directory (e.g., `drizzle/0041_your_migration_name.sql`). Open it and chack the logic.

Drizzle will also create snapshot file in `drizzle/meta` directory with the same id (`drizzle/meta/0000_snapshot.json`).

In case something is wrong:
- Remove both generated files
- Update schema
- Re-run the migration command to regenerate the files
- Check the generated files for any syntax errors or logical mistakes

### Step 3: Run the migration
Since you have a migration script in your project, apply the changes by running:

```bash
bun db-migrate
```

# Custom migration (no DB changes, just seeding)

To create an empty migration in Drizzle with Bun, you can use the `--custom` flag with the `drizzle-kit generate` command. This will generate a new migration file with the next sequential prefix (e.g., `0041_your_name.sql`) that contains no schema changes, allowing you to add your custom SQL (like data seeding).

### Step 1: Generate the custom migration
Run the following command in your terminal:

```bash
bun db-generate --custom --name your_migration_name
```

### Step 2: Edit the generated file
Drizzle will create a new file in your `drizzle/` directory (e.g., `drizzle/0041_your_migration_name.sql`). Open it and add your seeding logic:

```sql
-- Example seeding logic
INSERT INTO "your_table" ("format") VALUES ('New Format 1'), ('New Format 2');
```

Drizzle will also create snapshot file in `drizzle/meta` directory with the same id.

### Step 3: Run the migration
Since you have a migration script in your project, apply the changes by running:

```bash
bun db-migrate
```
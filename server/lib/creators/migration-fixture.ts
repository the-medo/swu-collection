/** Named sections let regression tests exercise backfills inside the consolidated migration. */
export async function creatorMigrationSection(name: string) {
  const migration = await Bun.file(
    new URL('../../../drizzle/0085_creator_hub.sql', import.meta.url),
  ).text();
  const start = `-- creator-hub-section: ${name}\n`;
  const end = `\n-- end-creator-hub-section: ${name}\n`;
  const offset = migration.indexOf(start);
  const boundary = migration.indexOf(end, offset + start.length);
  if (offset < 0 || boundary < 0) throw new Error(`Missing creator migration section: ${name}`);
  return migration.slice(offset + start.length, boundary);
}

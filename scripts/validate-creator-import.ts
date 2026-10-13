import { creatorImportSchema, MAX_CREATOR_IMPORT_BYTES } from '../shared/creators/imports.ts';

const path = process.argv[2];
if (!path || process.argv.length !== 3) {
  console.error('Usage: bun scripts/validate-creator-import.ts FILE.json');
  process.exit(1);
}
try {
  const file = Bun.file(path);
  if (file.size > MAX_CREATOR_IMPORT_BYTES) throw new Error('The import exceeds 5 MiB.');
  const result = creatorImportSchema.safeParse(await file.json());
  if (!result.success) {
    for (const issue of result.error.issues.slice(0, 20))
      console.error(`${issue.path.join('.') || 'Import'}: ${issue.message}`);
    process.exit(1);
  }
  console.log(
    JSON.stringify({
      valid: true,
      creators: result.data.creators.length,
      videos: result.data.videos.length,
    }),
  );
} catch {
  console.error('Could not read a valid JSON import (maximum 5 MiB).');
  process.exit(1);
}

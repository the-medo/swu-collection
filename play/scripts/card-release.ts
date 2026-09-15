import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import postgres from 'postgres';
import { bundledCatalog, canonicalJson } from '../cards/catalog.ts';
import { validateCatalog } from '../cards/validate.ts';
import { ENGINE_VERSION } from '../engine/release.ts';
import { configuredReleaseObjects, publishCardRelease } from '../releases/storage.ts';
import {
  initializeCardBundles,
  activateCardBundle,
  ACTIVE_CARD_BUNDLE,
} from '../storage/card-bundles.ts';
const root = resolve(import.meta.dir, '../..');
async function git(args: string[]) {
  const child = Bun.spawn(['git', ...args], { cwd: root, stdout: 'pipe', stderr: 'pipe' });
  const [output, code] = await Promise.all([new Response(child.stdout).text(), child.exited]);
  if (code) throw new Error('Git verification failed');
  return output.trim();
}
const [operation = 'export', path] = process.argv.slice(2);
if (operation === 'export') {
  const catalog = validateCatalog(bundledCatalog.data);
  const output = resolve(root, path ?? `.swubase/crossfire-releases/${catalog.data.version}.json`);
  await mkdir(dirname(output), { recursive: true });
  await Bun.write(output, canonicalJson(catalog.data) + '\n');
  console.log(
    JSON.stringify({
      version: catalog.data.version,
      checksum: catalog.hash,
      cards: catalog.data.cards.length,
      file: output,
    }),
  );
} else if (operation === 'publish') {
  if (await git(['status', '--porcelain', '--', 'play', 'shared/types/crossfire-card-releases.ts']))
    throw new Error('Commit card/runtime changes and pass play:check before publishing');
  const objects = configuredReleaseObjects();
  if (!objects)
    throw new Error('Set CROSSFIRE_CARD_BUNDLE_BUCKET and the R2 endpoint/access credentials');
  const schemaCheck = Bun.spawn(
    [process.execPath, 'play/scripts/generate-card-schema.ts', '--check'],
    { cwd: root, stdout: 'inherit', stderr: 'inherit' },
  );
  if (await schemaCheck.exited) throw new Error('Card data contract is stale');
  const files = (
    await git([
      'ls-files',
      'play/engine',
      'play/cards/catalog.ts',
      'play/cards/definition.ts',
      'play/cards/validate.ts',
      'play/cards/version-contract.ts',
      'play/cards/contracts',
    ])
  )
    .split('\n')
    .sort();
  const hash = createHash('sha256');
  for (const file of files) {
    hash.update(file + '\0');
    hash.update(await Bun.file(resolve(root, file)).bytes());
    hash.update('\0');
  }
  const result = await publishCardRelease(objects, validateCatalog(bundledCatalog.data), {
    version: bundledCatalog.data.version,
    checksum: bundledCatalog.hash,
    requiredEngine: bundledCatalog.data.requiredEngine,
    runtimeVersion: ENGINE_VERSION,
    runtimeFingerprint: hash.digest('hex'),
    sourceCommit: await git(['rev-parse', 'HEAD']),
    publishedAt: new Date().toISOString(),
    cards: bundledCatalog.data.cards.length,
  });
  console.log(JSON.stringify(result, null, 2));
} else if (operation === 'install') {
  const url = process.env.DATABASE_URL;
  if (
    !path ||
    !url ||
    new URL(url).hostname !== '127.0.0.1' ||
    !new URL(url).pathname.startsWith('/swubase_')
  )
    throw new Error('Local install requires a JSON file and the isolated worktree DATABASE_URL');
  const catalog = validateCatalog(await Bun.file(resolve(root, path)).json());
  const sql = postgres(url, { max: 2 });
  try {
    await initializeCardBundles(sql);
    const [active] =
      await sql`SELECT value FROM public.application_configuration WHERE key = ${ACTIVE_CARD_BUNDLE}`;
    await activateCardBundle(sql, catalog, await git(['rev-parse', 'HEAD']), null, active!.value);
    console.log(`Activated ${catalog.data.version} in the local worktree`);
  } finally {
    await sql.end();
  }
} else throw new Error('Usage: card-release.ts export [file] | publish | install file');

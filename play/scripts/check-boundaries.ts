import { readdir, readFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

const root = resolve(import.meta.dir, '..');
async function files(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map(entry =>
        entry.isDirectory()
          ? files(resolve(directory, entry.name))
          : entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')
            ? [resolve(directory, entry.name)]
            : [],
      ),
    )
  ).flat();
}
const scanner = new Bun.Transpiler({ loader: 'tsx' });
for (const file of [
  ...(await files(resolve(root, 'engine'))),
  ...(await files(resolve(root, 'cards'))),
]) {
  const source = await readFile(file, 'utf8');
  for (const entry of scanner.scanImports(source)) {
    if (entry.path === 'zod') continue;
    // Content addressing is deterministic; no random or IO crypto API is allowed.
    if (
      relative(root, file) === 'cards/catalog.ts' &&
      entry.path === 'node:crypto' &&
      source.includes("import { createHash } from 'node:crypto';")
    )
      continue;
    if (
      relative(root, file).startsWith('engine/') &&
      !file.endsWith('/index.ts') &&
      /cards\/(registry|names)\.ts$/.test(entry.path)
    )
      throw new Error('Engine card lookup must use a pinned catalog');
    const target = resolve(dirname(file), entry.path);
    if (
      !entry.path.startsWith('.') ||
      !['engine/', 'cards/'].some(prefix => relative(root, target).startsWith(prefix))
    ) {
      throw new Error(`Engine IO boundary crossed: ${relative(root, file)} -> ${entry.path}`);
    }
  }
  if (
    /\b(?:fetch|setTimeout|setInterval|eval|require)\s*\(|\b(?:process|Bun|Date)\b|Math\.random/.test(
      source,
    )
  ) {
    throw new Error(`Ambient IO/time/randomness in ${relative(root, file)}`);
  }
}
for (const file of await files(resolve(root, '../frontend/src'))) {
  for (const entry of scanner.scanImports(await readFile(file, 'utf8'))) {
    const target = resolve(dirname(file), entry.path);
    if (
      (entry.path.startsWith('.') &&
        [
          'engine/',
          'cards/',
          'host/',
          'worker/',
          'storage/',
          'history/',
          'admission/',
          'projection/',
          'ai/',
          'testing/',
          'integration/',
        ].some(prefix => relative(root, target).startsWith(prefix))) ||
      /^@swubase\/crossfire\/(?!view$)/.test(entry.path)
    )
      throw new Error(`Private Crossfire import in ${file}`);
  }
}
for (const [fixture, allowed] of [
  ['browser-view', true],
  ['browser-engine', false],
  ['browser-host', false],
  ['browser-bundles', false],
  ['browser-storage', false],
  ['browser-durable-host', false],
  ['browser-admission', false],
  ['browser-projection', false],
] as const) {
  const entrypoints = [resolve(root, `testing/fixtures/${fixture}.ts`)];
  const built = await Bun.build({ entrypoints, target: 'browser', throw: false });
  if (built.success !== allowed)
    throw new Error(`Unexpected browser boundary result: ${fixture}\n${built.logs.join('\n')}`);
  const server = await Bun.build({ entrypoints, target: 'bun', throw: false });
  if (!server.success)
    throw new Error(`Server entrypoint failed: ${fixture}\n${server.logs.join('\n')}`);
}
console.log('Crossfire engine IO and browser import boundaries passed.');

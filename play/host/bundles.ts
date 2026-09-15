import { createHash } from 'node:crypto';
import {
  link,
  mkdir,
  mkdtemp,
  open,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { z } from 'zod';

const digestSchema = z.string().regex(/^[a-f0-9]{64}$/);
import { bundleVersionsSchema, type BundleVersions } from '../cards/version-contract.ts';
export { bundleVersionsSchema, type BundleVersions } from '../cards/version-contract.ts';
const descriptorSchema = z.strictObject({
  archiveVersion: z.literal(1),
  versions: bundleVersionsSchema,
  sha256: digestSchema,
  bytes: z.number().int().positive().max(10_000_000),
  sourceRevision: z.string().regex(/^[a-f0-9]{40}$/),
  bunVersion: z.string().min(1).max(100),
});
export type BundleDescriptor = z.infer<typeof descriptorSchema>;

// Deliberately opaque: a historical state must not be cast to the currently
// installed engine's GameState. Only its own executable may interpret it.
export type RetainedEngine = {
  versions: BundleVersions;
  supportsVersions?(versions: BundleVersions): boolean;
  createGame(config: unknown): unknown;
  advance(state: unknown, input: unknown): { state: unknown; facts: unknown[] };
  decodeState(json: string): unknown;
  encodeState(state: unknown): string;
};
const digest = (bytes: Uint8Array | string) => createHash('sha256').update(bytes).digest('hex');
function key(raw: BundleVersions): string {
  const v = bundleVersionsSchema.parse(raw);
  return digest(JSON.stringify([v.state, v.engine, v.cards, v.rules, v.format]));
}
function assertVersions(actual: unknown, expected: BundleVersions) {
  if (key(bundleVersionsSchema.parse(actual)) !== key(expected))
    throw new Error('Crossfire bundle version mismatch');
}
async function readBounded(path: string, maximum: number): Promise<Buffer> {
  const info = await stat(path);
  if (!info.isFile() || info.size > maximum) throw new Error('Invalid Crossfire archive file');
  const bytes = await readFile(path);
  if (bytes.length > maximum) throw new Error('Crossfire archive file too large');
  return bytes;
}
async function syncDirectory(directory: string) {
  const handle = await open(directory, 'r');
  try {
    await handle.sync();
  } finally {
    await handle.close();
  }
}

// Publish only complete, synced files. Hard-link creation is exclusive, so two
// builders cannot overwrite an existing artifact or version pin.
async function immutableFile(directory: string, name: string, bytes: Uint8Array) {
  const temporary = await mkdtemp(join(directory, '.publishing-'));
  try {
    const path = join(temporary, 'file');
    const handle = await open(path, 'wx', 0o600);
    try {
      await handle.writeFile(bytes);
      await handle.sync();
    } finally {
      await handle.close();
    }
    try {
      await link(path, join(directory, name));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
      const existing = await readBounded(join(directory, name), 10_000_000);
      if (!existing.equals(Buffer.from(bytes)))
        throw new Error('Crossfire bundle pin already exists with different content');
    }
    await syncDirectory(directory);
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}

const executables = new Map<string, Promise<RetainedEngine>>();
async function importBytes(bytes: Uint8Array): Promise<RetainedEngine> {
  const source = Buffer.from(bytes).toString('utf8');
  if (
    new Bun.Transpiler({ loader: 'js' })
      .scanImports(source)
      .some(entry => entry.path !== 'node:crypto' && entry.path !== 'crypto')
  )
    throw new Error('Crossfire executable must bundle every dependency');
  const hash = digest(bytes);
  const cached = executables.get(hash);
  if (cached) return cached;
  const loading = (async () => {
    // Bun requires a file-backed module. Copy the verified bytes into a private
    // temporary directory, rather than importing a mutable archive pathname.
    // Cache executable modules by content, never game state or player data.
    const temporary = await mkdtemp(join(tmpdir(), 'crossfire-executable-'));
    try {
      const path = join(temporary, 'engine.mjs');
      await writeFile(path, bytes, { flag: 'wx', mode: 0o600 });
      const module = await import(pathToFileURL(path).href);
      bundleVersionsSchema.parse(module.versions);
      for (const name of ['createGame', 'advance', 'decodeState', 'encodeState'])
        if (typeof module[name] !== 'function')
          throw new Error('Invalid Crossfire executable interface');
      return module as RetainedEngine;
    } finally {
      await rm(temporary, { recursive: true, force: true });
    }
  })();
  executables.set(hash, loading);
  try {
    return await loading;
  } catch (error) {
    executables.delete(hash);
    throw error;
  }
}

/** Offline/operator operation on a private, server-owned directory. */
export async function retainBundle(
  directory: string,
  bytes: Uint8Array,
  sourceRevision: string,
): Promise<BundleDescriptor> {
  bytes = Uint8Array.from(bytes);
  if (!bytes.length || bytes.length > 10_000_000)
    throw new Error('Invalid Crossfire executable size');
  const runtime = await importBytes(bytes);
  const descriptor = descriptorSchema.parse({
    archiveVersion: 1,
    versions: runtime.versions,
    sha256: digest(bytes),
    bytes: bytes.length,
    sourceRevision,
    bunVersion: Bun.version,
  });
  const archive = resolve(directory);
  await mkdir(archive, { recursive: true, mode: 0o700 });
  const manifestName = `${key(descriptor.versions)}.json`;
  // Preserve the first manifest's build provenance on an identical re-publication.
  try {
    const existing = descriptorSchema.parse(
      JSON.parse((await readBounded(join(archive, manifestName), 4096)).toString()),
    );
    assertVersions(existing.versions, descriptor.versions);
    if (existing.sha256 !== descriptor.sha256 || existing.bytes !== descriptor.bytes)
      throw new Error('Crossfire bundle pin already exists with different content');
    await immutableFile(archive, `${descriptor.sha256}.mjs`, bytes);
    return existing;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  await immutableFile(archive, `${descriptor.sha256}.mjs`, bytes);
  await immutableFile(
    archive,
    manifestName,
    Buffer.from(JSON.stringify(descriptor, null, 2) + '\n'),
  );
  return descriptor;
}

/** Trusted pin comes from the game's committed metadata, not a viewer request. */
export async function loadBundle(
  directory: string,
  versions: BundleVersions,
): Promise<RetainedEngine> {
  const archive = resolve(directory);
  const descriptor = descriptorSchema.parse(
    JSON.parse((await readBounded(join(archive, `${key(versions)}.json`), 4096)).toString()),
  );
  assertVersions(descriptor.versions, versions);
  const bytes = await readBounded(join(archive, `${descriptor.sha256}.mjs`), 10_000_000);
  if (bytes.length !== descriptor.bytes || digest(bytes) !== descriptor.sha256)
    throw new Error('Crossfire executable integrity check failed');
  const runtime = await importBytes(bytes);
  assertVersions(runtime.versions, versions);
  return runtime;
}

export async function resumeRetained(
  directory: string,
  versions: BundleVersions,
  checkpoint: string,
  input: unknown,
) {
  const runtime = await loadBundle(directory, versions);
  return runtime.advance(runtime.decodeState(checkpoint), input);
}

const recordingSchema = z.strictObject({
  recordingVersion: z.literal(1),
  engine: z.string(),
  cards: z.string(),
  config: z.unknown(),
  inputs: z.array(z.unknown()).max(100_000),
});
export async function replayRetained(
  directory: string,
  versions: BundleVersions,
  raw: unknown,
): Promise<unknown> {
  const recording = recordingSchema.parse(raw);
  if (recording.engine !== versions.engine || recording.cards !== versions.cards)
    throw new Error('Recording does not match the retained bundle');
  const runtime = await loadBundle(directory, versions);
  let state = runtime.createGame(recording.config);
  for (const input of recording.inputs) state = runtime.advance(state, input).state;
  return state;
}

/** Pre-release development policy: keep one verified executable. Only matching
 * generated manifests/artifacts are removed; other files are left alone. */
export async function keepOnlyBundle(
  directory: string,
  versions: BundleVersions,
): Promise<string[]> {
  const archive = resolve(directory);
  await loadBundle(archive, versions);
  const currentName = `${key(versions)}.json`;
  const current = descriptorSchema.parse(
    JSON.parse((await readBounded(join(archive, currentName), 4096)).toString()),
  );
  const obsolete: { name: string; descriptor: BundleDescriptor }[] = [];
  for (const entry of await readdir(archive, { withFileTypes: true })) {
    if (!entry.isFile() || !/^[a-f0-9]{64}\.json$/.test(entry.name) || entry.name === currentName)
      continue;
    const descriptor = descriptorSchema.parse(
      JSON.parse((await readBounded(join(archive, entry.name), 4096)).toString()),
    );
    if (entry.name !== `${key(descriptor.versions)}.json`)
      throw new Error('Unexpected Crossfire manifest filename');
    obsolete.push({ name: entry.name, descriptor });
  }
  for (const entry of obsolete) await rm(join(archive, entry.name));
  for (const hash of new Set(obsolete.map(entry => entry.descriptor.sha256))) {
    if (hash !== current.sha256) await rm(join(archive, `${hash}.mjs`), { force: true });
  }
  await syncDirectory(archive);
  return obsolete.map(entry => entry.descriptor.versions.engine);
}

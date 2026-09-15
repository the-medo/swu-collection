import { afterAll, beforeAll, expect, test } from 'bun:test';
import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  retainBundle,
  loadBundle,
  replayRetained,
  resumeRetained,
  keepOnlyBundle,
} from '../host/bundles.ts';
import { versions } from '../engine/model.ts';
import { createGame, advance } from '../engine/advance.ts';
import { encodeState } from '../engine/checkpoint.ts';
import { config } from './helpers.ts';

let directory: string;
let bytes: Uint8Array;
const revision = 'a'.repeat(40);
beforeAll(async () => {
  directory = await mkdtemp(join(tmpdir(), 'crossfire-archive-test-'));
  const built = await Bun.build({
    entrypoints: [new URL('../engine/index.ts', import.meta.url).pathname],
    target: 'bun',
    format: 'esm',
    minify: true,
  });
  if (!built.success || built.outputs.length !== 1) throw new Error('Fixture bundle failed');
  bytes = new Uint8Array(await built.outputs[0]!.arrayBuffer());
});
afterAll(async () => {
  await rm(directory, { recursive: true, force: true });
});

test('retention is immutable and idempotent, and recovery uses the verified executable bytes', async () => {
  const destination = join(directory, 'basic');
  const first = await retainBundle(destination, bytes, revision);
  expect(await retainBundle(destination, bytes, revision)).toEqual(first);
  const runtime = await loadBundle(destination, versions);
  const state = createGame(config());
  const input = {
    type: 'random',
    gameId: state.gameId,
    expectedRevision: state.revision,
    requestId: state.execution.random!.id,
    values: [1],
  };
  expect(runtime.createGame(config())).toEqual(state);
  expect(await resumeRetained(destination, versions, encodeState(state), input)).toEqual(
    advance(state, input),
  );
  expect(
    await replayRetained(destination, versions, {
      recordingVersion: 1,
      engine: versions.engine,
      cards: versions.cards,
      config: config(),
      inputs: [input],
    }),
  ).toEqual(advance(state, input).state);
  const altered = new Uint8Array([...bytes, ...new TextEncoder().encode('\n// changed build\n')]);
  await expect(retainBundle(destination, altered, revision)).rejects.toThrow('different content');
  expect((await loadBundle(destination, versions)).createGame(config())).toEqual(state);
});

test('parallel publication of the same bundle leaves one complete artifact and manifest', async () => {
  const destination = join(directory, 'parallel');
  const result = await Promise.all(
    Array.from({ length: 4 }, () => retainBundle(destination, bytes, revision)),
  );
  expect(result.every(row => row.sha256 === result[0]!.sha256)).toBe(true);
  expect((await readdir(destination)).sort()).toEqual(
    [
      `${result[0]!.sha256}.mjs`,
      ...(await readdir(destination)).filter(name => name.endsWith('.json')),
    ].sort(),
  );
  expect(await loadBundle(destination, versions)).toBeDefined();
});

test('missing versions, mixed recordings, altered manifests and damaged executables fail closed', async () => {
  const destination = join(directory, 'corrupt');
  const descriptor = await retainBundle(destination, bytes, revision);
  await expect(loadBundle(destination, { ...versions, engine: 'not-installed' })).rejects.toThrow();
  await expect(
    replayRetained(destination, versions, {
      recordingVersion: 1,
      engine: 'not-installed',
      cards: versions.cards,
      config: config(),
      inputs: [],
    }),
  ).rejects.toThrow('does not match');
  const artifact = join(destination, `${descriptor.sha256}.mjs`);
  await writeFile(artifact, 'throw new Error("must never execute damaged bytes")');
  await expect(loadBundle(destination, versions)).rejects.toThrow('integrity');
  await writeFile(artifact, bytes);
  const manifest = join(
    destination,
    (await readdir(destination)).find(name => name.endsWith('.json'))!,
  );
  const changed = JSON.parse(await readFile(manifest, 'utf8'));
  changed.versions.cards = 'wrong-card-bundle';
  await writeFile(manifest, JSON.stringify(changed));
  await expect(loadBundle(destination, versions)).rejects.toThrow('version mismatch');
});

test('retained bundles cannot depend on installed modules or accept invalid version metadata', async () => {
  await expect(
    retainBundle(join(directory, 'invalid'), new TextEncoder().encode('import "zod";'), revision),
  ).rejects.toThrow('every dependency');
  await expect(retainBundle(join(directory, 'invalid'), bytes, '../untrusted')).rejects.toThrow();
});

test('development pruning verifies the newest bundle before removing only older generated builds', async () => {
  const destination = join(directory, 'latest');
  // Synthetic older executable exercises retention policy without retaining old product code.
  const oldBytes = new TextEncoder()
    .encode(`export const versions = ${JSON.stringify({ ...versions, engine: 'development-old' })};
    export function createGame() {} export function advance() {} export function decodeState() {} export function encodeState() {}`);
  const old = await retainBundle(destination, oldBytes, revision);
  await writeFile(join(destination, 'notes.txt'), 'preserve');
  await expect(keepOnlyBundle(destination, versions)).rejects.toThrow();
  expect(await loadBundle(destination, old.versions)).toBeDefined();
  const current = await retainBundle(destination, bytes, revision);
  expect(await keepOnlyBundle(destination, versions)).toEqual(['development-old']);
  expect(await keepOnlyBundle(destination, versions)).toEqual([]);
  const files = await readdir(destination);
  expect(files).toContain('notes.txt');
  expect(files).toContain(`${current.sha256}.mjs`);
  expect(files).not.toContain(`${old.sha256}.mjs`);
  expect(files.filter(name => name.endsWith('.json'))).toHaveLength(1);
  expect(await loadBundle(destination, versions)).toBeDefined();
  await expect(loadBundle(destination, old.versions)).rejects.toThrow();
});

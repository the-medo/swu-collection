import { continuationCases } from '../testing/continuations.ts';
import { advance } from '../engine/advance.ts';
import { encodeState } from '../engine/checkpoint.ts';
import { versions } from '../engine/model.ts';
import { isDeepStrictEqual } from 'node:util';
import { readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { loadBundle, replayRetained } from '../host/bundles.ts';
import type { BundleDescriptor } from '../host/bundles.ts';

// Diagnostic subset of the current archived executable. Its decoder validates
// the state before each recovery continuation.
type HarnessPosition = {
  gameId: string;
  revision: number;
  result: unknown;
  execution: {
    random: { id: string; bounds: number[] } | null;
    decision: {
      id: string;
      playerId: string;
      options: { id: string; intent: { kind: string; take?: boolean; defender?: string } }[];
      selection: { cards: string[]; min: number; max: number } | null;
    } | null;
  };
  players: Record<string, { base: string }>;
};
async function verifyFreshProcess(
  directory: string,
  descriptor: BundleDescriptor,
  checkpoint: string,
  input: unknown,
  expected: unknown,
) {
  const child = Bun.spawn(
    [process.execPath, new URL('../testing/fixtures/resume-bundle.ts', import.meta.url).pathname],
    { stdin: 'pipe', stdout: 'pipe', stderr: 'pipe' },
  );
  child.stdin.write(
    JSON.stringify({ directory, versions: descriptor.versions, checkpoint, input }),
  );
  child.stdin.end();
  const [output, error, code] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  if (code || error || !isDeepStrictEqual(JSON.parse(output), expected))
    throw new Error('Retained fresh-process recovery diverged');
}
export async function verifyArchive(directory: string) {
  const results = [];
  const names = (await readdir(directory)).filter(name => /^[a-f0-9]{64}\.json$/.test(name));
  if (names.length !== 1)
    throw new Error('Expected only the current development bundle; run play:archive');
  for (const name of names) {
    const descriptor = (await Bun.file(join(directory, name)).json()) as BundleDescriptor;
    if (!isDeepStrictEqual(descriptor.versions, versions))
      throw new Error('Archive does not contain the current engine; run play:archive');
    const runtime = await loadBundle(directory, descriptor.versions);
    const config = {
      gameId: 'retained-version-check',
      players: ['alice', 'bob'].map(id => ({
        id,
        base: 'command-center',
        leader: 'sabine-wren--galvanized-revolutionary',
        deck: [{ cardId: 'battlefield-marine', quantity: 24 }],
      })),
    };
    let opaque = runtime.createGame(config);
    const inputs: unknown[] = [];
    let checkedProcess = false;
    for (let count = 0; count < 400; count++) {
      const state = opaque as HarnessPosition;
      if (state.result) break;
      const random = state.execution.random;
      const d = state.execution.decision;
      const baseIds = Object.values(state.players).map(p => p.base);
      const option =
        d &&
        (d.options.find(o => o.intent.kind === 'attack' && baseIds.includes(o.intent.defender!)) ??
          d.options.find(o => o.intent.kind === 'play') ??
          d.options.find(o => o.intent.kind === 'leader-action') ??
          d.options.find(o => o.intent.kind === 'mulligan' && !o.intent.take) ??
          d.options[0]);
      const input = random
        ? {
            type: 'random',
            gameId: state.gameId,
            expectedRevision: state.revision,
            requestId: random.id,
            values: random.bounds.map(n => n - 1),
          }
        : {
            type: 'decision',
            gameId: state.gameId,
            expectedRevision: state.revision,
            playerId: d!.playerId,
            decisionId: d!.id,
            optionId: option!.id,
            selections: d!.selection?.cards.slice(0, d!.selection.max) ?? [],
          };
      const expected = runtime.advance(opaque, input);
      if (d && !checkedProcess) {
        await verifyFreshProcess(
          directory,
          descriptor,
          runtime.encodeState(opaque),
          input,
          expected,
        );
        checkedProcess = true;
      }
      inputs.push(input);
      opaque = expected.state;
      const replayed = await replayRetained(directory, descriptor.versions, {
        recordingVersion: 1,
        engine: descriptor.versions.engine,
        cards: descriptor.versions.cards,
        config,
        inputs,
      });
      if (!isDeepStrictEqual(replayed, opaque)) throw new Error('Retained replay diverged');
    }
    if (!(opaque as HarnessPosition).result || !checkedProcess)
      throw new Error('Retained game did not complete');
    const continuations = [];
    if (isDeepStrictEqual(descriptor.versions, versions)) {
      for (const fixture of continuationCases()) {
        const checkpoint = encodeState(fixture.state);
        const expected = advance(fixture.state, fixture.input);
        const actual = runtime.advance(runtime.decodeState(checkpoint), fixture.input);
        if (!isDeepStrictEqual(actual, expected))
          throw new Error(`Retained continuation diverged: ${fixture.name}`);
        await verifyFreshProcess(directory, descriptor, checkpoint, fixture.input, expected);
        continuations.push({
          name: fixture.name,
          checkpointBytes: Buffer.byteLength(checkpoint),
          freshProcessRecoveryMatched: true,
        });
      }
    }
    results.push({
      versions: descriptor.versions,
      sourceRevision: descriptor.sourceRevision,
      sha256: descriptor.sha256,
      commands: inputs.length,
      result: (opaque as HarnessPosition).result,
      everyInputReplayed: true,
      freshProcessRecoveryMatched: true,
      currentBundleContinuations: continuations,
    });
  }
  if (!results.length) throw new Error('No retained engines found');
  return results;
}
if (import.meta.main)
  console.log(
    JSON.stringify(
      await verifyArchive(
        resolve(
          process.argv[2] ?? new URL('../../.swubase/crossfire-bundles', import.meta.url).pathname,
        ),
      ),
      null,
      2,
    ),
  );

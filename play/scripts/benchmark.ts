import { isDeepStrictEqual } from 'node:util';
import { createHash } from 'node:crypto';
import { heapStats } from 'bun:jsc';
import { arch, cpus, platform, totalmem } from 'node:os';
import { advance } from '../engine/advance.ts';
import { encodeState, decodeState } from '../engine/checkpoint.ts';
import { versions } from '../engine/model.ts';
import { Projector } from '../projection/projector.ts';
import { continuationCases } from '../testing/continuations.ts';

const samples = 300,
  warmup = 30,
  processSamples = 3;
function summarize(values: number[]) {
  const sorted = values.toSorted((a, b) => a - b);
  return {
    samples: values.length,
    p50Ms: sorted[Math.floor(sorted.length * 0.5)]!,
    p95Ms: sorted[Math.floor(sorted.length * 0.95)]!,
    maxMs: sorted.at(-1)!,
  };
}
function measure(run: () => unknown) {
  for (let n = 0; n < warmup; n++) run();
  const values = [];
  for (let n = 0; n < samples; n++) {
    const start = performance.now();
    run();
    values.push(performance.now() - start);
  }
  return summarize(values);
}
function memory() {
  const heap = heapStats();
  return {
    process: process.memoryUsage(),
    jsc: {
      heapSize: heap.heapSize,
      heapCapacity: heap.heapCapacity,
      objectCount: heap.objectCount,
    },
  };
}

const cases = continuationCases();
const results = [];
for (const fixture of cases) {
  const { state, input } = fixture;
  const checkpoint = encodeState(state);
  const expected = advance(state, input);
  const projectors = [
    ...state.seats.map(playerId => new Projector(state.gameId, { role: 'player', playerId })),
    new Projector(state.gameId, { role: 'spectator' }),
  ];
  const projectionBytes = projectors.map(projector =>
    Buffer.byteLength(JSON.stringify(projector.project(state))),
  );
  const metrics = {
    command: measure(() => advance(state, input)),
    checkpointEncode: measure(() => encodeState(state)),
    checkpointDecode: measure(() => decodeState(checkpoint)),
    threeViewerProjections: measure(() => projectors.map(projector => projector.project(state))),
  };
  const recovery = [];
  for (let n = 0; n < processSamples; n++) {
    const start = performance.now();
    const child = Bun.spawn(
      [process.execPath, new URL('../testing/fixtures/resume.ts', import.meta.url).pathname],
      { stdin: 'pipe', stdout: 'pipe', stderr: 'pipe' },
    );
    child.stdin.write(JSON.stringify({ state: checkpoint, input }));
    child.stdin.end();
    const [output, error, code] = await Promise.all([
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
      child.exited,
    ]);
    if (code || error || !isDeepStrictEqual(JSON.parse(output), expected))
      throw new Error('Benchmark recovery mismatch: ' + fixture.name);
    recovery.push(performance.now() - start);
  }
  results.push({
    name: fixture.name,
    description: fixture.description,
    cards: Object.keys(state.cards).length,
    facts: state.facts.length,
    pendingFrames: state.execution.frames.length,
    checkpointBytes: Buffer.byteLength(checkpoint),
    projectionBytes: {
      firstPlayer: projectionBytes[0],
      secondPlayer: projectionBytes[1],
      spectator: projectionBytes[2],
    },
    metrics: { ...metrics, freshProcessResume: summarize(recovery) },
  });
}
Bun.gc(true);
const before = memory();
const retained = Array.from({ length: 100 }, (_, n) => ({
  ...structuredClone(cases[n % cases.length]!.state),
  gameId: 'benchmark-' + n,
}));
Bun.gc(true);
const after = memory();
const root = new URL('../..', import.meta.url).pathname;
const revision = Bun.spawnSync(['git', 'rev-parse', 'HEAD'], { cwd: root })
  .stdout.toString()
  .trim();
const dirty = Bun.spawnSync(['git', 'status', '--porcelain', '--', 'play'], { cwd: root })
  .stdout.toString()
  .trim();
const harnessHash = createHash('sha256');
for (const path of ['./benchmark.ts', '../testing/continuations.ts'])
  harnessHash.update(await Bun.file(new URL(path, import.meta.url)).bytes());
console.log(
  JSON.stringify(
    {
      recordedAt: new Date().toISOString(),
      sourceRevision: revision,
      playTreeDirty: !!dirty,
      harnessSha256: harnessHash.digest('hex'),
      versions,
      environment: {
        bun: Bun.version,
        platform: platform(),
        arch: arch(),
        cpu: cpus()[0]?.model,
        logicalCpus: cpus().length,
        ramBytes: totalmem(),
      },
      method: {
        samples,
        warmup,
        processSamples,
        viewerCount: 3,
        history:
          'Complete facts are projected; no transport/delta cache or database calls are included.',
      },
      fixtures: results,
      memory: {
        retainedGames: retained.length,
        retainedCards: retained.reduce((count, game) => count + Object.keys(game.cards).length, 0),
        distribution: 'Round-robin across the nine fixture states',
        before,
        after,
        jscHeapDeltaBytes: after.jsc.heapSize - before.jsc.heapSize,
        jscHeapDeltaPerGameBytes: (after.jsc.heapSize - before.jsc.heapSize) / retained.length,
      },
      limitations:
        'Headless microbenchmarks, not a concurrency or production-capacity claim. Fresh-process measurements include startup and serialization. Memory deltas are noisy. Persistence, transport, slow viewers and mixed live service load require separate tests.',
    },
    null,
    2,
  ),
);

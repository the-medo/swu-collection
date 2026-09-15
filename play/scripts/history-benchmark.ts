// Opt-in local benchmark. All durable fixtures are scoped to generated IDs and removed.
import postgres from 'postgres';
import { randomUUID } from 'node:crypto';
import { cpus, totalmem, platform } from 'node:os';
import { isDeepStrictEqual } from 'node:util';
import { historySamples } from './history-samples.ts';
import type { HistorySample } from './history-samples.ts';
import { PostgresGameStore, stateDigest } from '../storage/postgres.ts';
import { encodeArchive } from '../history/archive.ts';
import { ReplayService } from '../history/replay-service.ts';
import { Projector } from '../projection/projector.ts';
import { diffViews, applyViewDelta } from '../view/delta.ts';
import { encodeState } from '../engine/checkpoint.ts';
import { DurableGame } from '../host/durable-game.ts';
import { scenario } from '../testing/scenario.ts';
import { position, choose } from '../testing/helpers.ts';
import type { Archive } from '../history/archive.ts';
import type { GameView } from '../view/types.ts';
const url = process.env.CROSSFIRE_TEST_DATABASE_URL;
if (
  !url ||
  url !== process.env.DATABASE_URL ||
  new URL(url).hostname !== '127.0.0.1' ||
  !new URL(url).pathname.startsWith('/swubase_')
)
  throw new Error('Explicit isolated worktree database required');
const attempts = Number(process.env.CROSSFIRE_BENCH_SAMPLES ?? 24);
if (!Number.isInteger(attempts) || attempts < 4 || attempts > 80)
  throw new Error('Use 4–80 samples');
const summarize = (values: number[]) => {
  const v = values.toSorted((a, b) => a - b);
  return {
    samples: v.length,
    mean: v.reduce((a, b) => a + b, 0) / v.length,
    p50: v[Math.floor(v.length / 2)]!,
    p95: v[Math.min(v.length - 1, Math.floor(v.length * 0.95))]!,
    max: v.at(-1)!,
  };
};
const generated = historySamples(attempts),
  samples = generated.samples.filter(
    s => s.history.summary!.round >= 6 && s.history.summary!.round <= 10,
  );
if (!samples.length) throw new Error('No completed 6–10 round samples');
console.log(
  `Generated ${generated.samples.length}/${attempts} complete games; measuring ${samples.length} in rounds 6–10.`,
);
const sql = postgres(url, { max: 4, onnotice: () => {} }),
  store = new PostgresGameStore(sql),
  owned: string[] = [];
const db = await sql.reserve();
const replay = new ReplayService(url, {
  maxGames: 4,
  maxBytes: 16 * 1024 * 1024,
  maxGameBytes: 8 * 1024 * 1024,
});
const report: Record<string, unknown> = {
  createdAt: new Date().toISOString(),
  hardware: {
    cpu: cpus()[0]?.model,
    threads: cpus().length,
    totalMemoryBytes: totalmem(),
    platform: platform(),
    bun: Bun.version,
  },
  sample: {
    attempts,
    completed: generated.samples.length,
    failedOrLimited: generated.failed,
    measured: samples.length,
    rounds: samples.map(s => s.history.summary!.round),
    commands: summarize(samples.map(s => s.history.sequence)),
    actions: summarize(samples.map(s => s.actions)),
  },
  scope:
    'Synthetic base-attack-first policy over tracked Top 8 decks. Core history tables only; excludes lobbies, seats, auth, bookmarks, WAL, backups and production proxy traffic. Wire sizes include the replay JSON envelope but exclude WebSocket/TLS framing. CPU/memory are for the benchmark process (including its replay thread), not the finalizer child. Physical copies amortize PostgreSQL pages; they are not independent samples.',
};
async function persist(sample: HistorySample) {
  const h = sample.history;
  owned.push(h.gameId);
  await store.create(h.checkpoint.checkpoint);
  const lease = (await store.claim(h.gameId, 'history-benchmark', 60_000))!;
  try {
    for (const { sequence, timeline: _timeline, ...entry } of h.journal) {
      const checkpoint = sample.checkpoints.find(c => c.sequence === sequence)?.checkpoint;
      await store.append(lease, {
        ...entry,
        inputs: JSON.parse(JSON.stringify(entry.inputs)),
        facts: JSON.parse(JSON.stringify(entry.facts)),
        expectedSequence: sequence - 1,
        ...(checkpoint ? { checkpoint } : {}),
        ...(sequence === h.sequence ? { summary: h.summary! } : {}),
      });
    }
  } finally {
    await store.release(lease);
  }
}
const archives: Archive[] = [],
  cold: number[] = [],
  warm: number[] = [],
  wire: number[] = [],
  snapshots: number[] = [];
try {
  const [pg] =
    await db`SELECT version() AS version,current_setting('default_toast_compression') AS compression`;
  report.postgres = { version: pg!.version, compression: pg!.compression };
  for (const sample of samples) {
    const h = sample.history;
    await persist(sample);
    const archive = await encodeArchive(await store.readHistory(h.gameId));
    archives.push(archive);
    await store.publishArchive(h.gameId, archive);
    const started = performance.now(),
      end = await replay.seek(h.gameId, { kind: 'end' });
    cold.push(performance.now() - started);
    if (stateDigest(encodeState(end.state)) !== h.stateHash) throw new Error('Cold seek mismatch');
    const projector = new Projector(h.gameId, { role: 'player', playerId: 'p1' });
    let view: GameView = projector.project(end.state),
      cursor = end.meta;
    for (let n = 0; n < 12; n++) {
      const start = performance.now(),
        next = await replay.seek(h.gameId, { kind: 'step', offset: n % 2 ? 5 : -5 }, cursor);
      warm.push(performance.now() - start);
      cursor = next.meta;
      const shown = projector.project(next.state),
        delta = diffViews(view, shown);
      if (delta && !isDeepStrictEqual(applyViewDelta(view, delta), shown))
        throw new Error('Replay delta mismatch');
      const envelope = {
        type: 'replay',
        perspective: 'own',
        wireVersion: 1,
        requestId: randomUUID(),
        position: next.meta,
        viewer: { role: 'player', seat: 'p1' },
      };
      const snapshotBytes = Buffer.byteLength(
        JSON.stringify({ ...envelope, update: { type: 'snapshot', view: shown } }),
      );
      const deltaBytes = Buffer.byteLength(
        JSON.stringify({ ...envelope, update: { type: 'delta', delta } }),
      );
      wire.push(Math.min(snapshotBytes, deltaBytes));
      snapshots.push(snapshotBytes);
      view = shown;
    }
  }
  report.archivePayloadBytes = summarize(archives.map(a => a.payload.length));
  report.initialSnapshotJsonBytes = summarize(
    samples.map(s => Buffer.byteLength(s.history.checkpoint.checkpoint)),
  );
  report.finalSnapshotJsonBytes = summarize(
    samples.map(s => Buffer.byteLength(s.checkpoints.at(-1)!.checkpoint)),
  );
  report.coldSeekMs = summarize(cold);
  report.warmFiveStepSeekMs = summarize(warm);
  report.viewUpdateBytes = summarize(wire);
  report.replacementViewBytes = summarize(snapshots);
  // Identical core schema/layout, different retention models. TEMP tables isolate allocation.
  const models = {
    baseline: ['games', 'journal_live', 'checkpoints'],
    live: ['games', 'journal_live', 'checkpoints'],
    finalized: ['games', 'journal_history'],
  };
  for (const [model, tables] of Object.entries(models))
    for (const table of tables)
      await db.unsafe(
        `CREATE TEMP TABLE history_bench_${model}_${table} (LIKE play.${table} INCLUDING ALL)`,
      );
  const copies = Math.max(1, Math.ceil(64 / samples.length)),
    physical: Record<string, unknown> = {};
  for (let copy = 0; copy < copies; copy++)
    for (const [i, sample] of samples.entries()) {
      const h = sample.history,
        gameId = `${h.gameId}-${copy}`;
      for (const model of Object.keys(models) as (keyof typeof models)[]) {
        await db.unsafe(
          `INSERT INTO history_bench_${model}_games(id,versions,sequence,revision,state_hash,status,summary) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [
            gameId,
            JSON.stringify(h.versions),
            h.sequence,
            h.revision,
            h.stateHash,
            model === 'finalized' ? 'finalized' : 'ended',
            JSON.stringify(h.summary),
          ],
        );
        if (model === 'finalized') {
          const a = archives[i]!;
          await db`INSERT INTO history_bench_finalized_journal_history(game_id,format,sequence,state_hash,payload_hash,raw_bytes,payload) VALUES (${gameId},${a.format},${a.sequence},${a.stateHash},${a.payloadHash},${a.rawBytes},${a.payload})`;
        } else {
          for (const e of h.journal)
            await db.unsafe(
              `INSERT INTO history_bench_${model}_journal_live(game_id,sequence,actor_id,command_id,request_hash,from_revision,revision,state_hash,inputs,facts) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
              [
                gameId,
                e.sequence,
                e.actorId,
                e.commandId,
                e.requestHash,
                e.fromRevision,
                e.revision,
                e.stateHash,
                JSON.stringify(e.inputs),
                JSON.stringify(e.facts),
              ],
            );
          const retained =
            model === 'baseline'
              ? sample.checkpoints
              : [sample.checkpoints[0]!, sample.checkpoints.at(-1)!];
          for (const cp of retained)
            await db.unsafe(
              `INSERT INTO history_bench_${model}_checkpoints(game_id,sequence,revision,state_hash,checkpoint) VALUES ($1,$2,$3,$4,$5)`,
              [gameId, cp.sequence, cp.revision, cp.stateHash, cp.checkpoint],
            );
        }
      }
    }
  for (const [model, tables] of Object.entries(models)) {
    const sizes = [];
    for (const table of tables) {
      const name = `history_bench_${model}_${table}`;
      const [size] =
        await db`SELECT pg_total_relation_size(${name}::regclass)::bigint AS total, pg_indexes_size(${name}::regclass)::bigint AS indexes`;
      sizes.push({ table, bytes: Number(size!.total), indexBytes: Number(size!.indexes) });
    }
    physical[model] = {
      copiesPerSample: copies,
      physicalGameCount: copies * samples.length,
      bytesPerGame: sizes.reduce((sum, s) => sum + s.bytes, 0) / (copies * samples.length),
      tables: sizes,
    };
  }
  report.physical = physical;
  const gameId = `history-benchmark-live-${randomUUID()}`;
  owned.push(gameId);
  const input = position(gameId);
  input.extraActions = 100;
  await store.create(encodeState(scenario(input).state));
  const lease = (await store.claim(gameId, 'history-benchmark-live', 60_000))!;
  const host = await DurableGame.restore(store, lease, { checkpointEvery: 20, leaseMs: 60_000 });
  async function commands() {
    const times = [];
    for (let n = 0; n < 30; n++) {
      const start = performance.now();
      await host.submit('alice', randomUUID(), choose(host.state, 'pass'));
      times.push(performance.now() - start);
    }
    return summarize(times);
  }
  report.liveCommitBaselineMs = await commands();
  async function concurrentReplay() {
    let running = true;
    const cpu = process.cpuUsage(),
      loadStarted = performance.now();
    let seeks = 0;
    const readers = [0, 1, 2].map(async reader => {
      while (running) {
        const s = samples[(seeks++ + reader) % samples.length]!;
        await replay.seek(s.history.gameId, {
          kind: 'fraction',
          value: ((seeks * 17) % 100) / 100,
        });
      }
    });
    let commit;
    try {
      commit = await commands();
    } finally {
      running = false;
      await Promise.all(readers);
    }
    return {
      commitMs: commit,
      readers: 3,
      seeks,
      elapsedMs: performance.now() - loadStarted,
      processCpuMicros: process.cpuUsage(cpu),
    };
  }
  report.concurrentReplay = await concurrentReplay();
  const pending = historySamples(1).samples[0]!;
  if (!pending) throw new Error('No finalization workload');
  await persist(pending);
  const child = Bun.spawn(
    [process.execPath, 'play/history/finalizer-process.ts', pending.history.gameId],
    {
      env: { ...process.env, CROSSFIRE_FINALIZER_CHILD: '1' },
      stdout: 'ignore',
      stderr: 'pipe',
    },
  );
  const deadline = setTimeout(() => child.kill('SIGKILL'), 60_000);
  const finalizerStarted = performance.now();
  try {
    report.concurrentReplayAndFinalization = await concurrentReplay();
    if ((await child.exited) !== 0 || !(await store.archived(pending.history.gameId)))
      throw new Error('Finalizer workload failed');
    const errors = await new Response(child.stderr).text();
    if (errors) throw new Error(errors);
    report.finalizationElapsedMs = performance.now() - finalizerStarted;
  } finally {
    clearTimeout(deadline);
    child.kill();
    await child.exited;
  }
  const cache = await replay.stats();
  if (cache.games > 4 || cache.bytes > 16 * 1024 * 1024)
    throw new Error('Replay exceeded configured budget');
  report.cache = cache;
  report.processMemory = process.memoryUsage();
  const idle = new ReplayService(url, { idleMs: 40 });
  try {
    await idle.seek(samples[0]!.history.gameId, { kind: 'end' });
    await new Promise(resolve => setTimeout(resolve, 60));
    await idle.prune();
    if ((await idle.stats()).games !== 0) throw new Error('Idle cache retained');
    await idle.seek(samples[0]!.history.gameId, { kind: 'end' });
    report.idleEvictionReload = 'passed (accelerated 40 ms idle threshold)';
  } finally {
    await idle.stop();
  }
  await Bun.write('.swubase/history-benchmark.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally {
  await replay.stop();
  await db.release();
  await sql`DELETE FROM play.games WHERE id = ANY(${owned})`;
  await sql.end();
}

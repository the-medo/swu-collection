import { afterEach, expect, test } from 'bun:test';
import { mkdtemp, mkdir, rename, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { compactBatch, TrainingReader } from './crossfire-training-reader.ts';
import { trainingStrategies } from '../../shared/types/crossfire-training.ts';
import roster from '../../play/ai/specialists/roster.json';
import {
  mergeBatches,
  matchupScore,
  matchupSeries,
  selectBatch,
} from '../src/components/app/crossfire-training/metrics.ts';

const roots: string[] = [];
afterEach(async () => {
  await Promise.all(roots.splice(0).map(p => rm(p, { recursive: true, force: true })));
});
async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'crossfire-dashboard-'));
  roots.push(root);
  await mkdir(path.join(root, 'batches'));
  return {
    root,
    reader: new TrainingReader(root),
    put: (name: string, value: unknown) => writeFile(path.join(root, name), JSON.stringify(value)),
  };
}
function batch(block = 0, overrides = {}) {
  return {
    block,
    cycle: Math.floor(block / 21) + 1,
    deckKeys: ['greef', 'krennic'],
    mirror: false,
    startedAtUtc: '2026-09-22T00:00:00Z',
    finishedAtUtc: '2026-09-22T00:03:00Z',
    completed: 1000,
    winsA: 600,
    winsB: 350,
    draws: 50,
    cutoffs: 2,
    byMode: { self: { completed: 750, winsA: 450, winsB: 260, draws: 40, cutoffs: 2 } },
    evaluation: {
      complete: true,
      byDeckIndex: {
        0: { completed: 20, wins: 18, losses: 2, draws: 0, cutoffs: 0 },
        5: { completed: 20, wins: 12, losses: 7, draws: 1, cutoffs: 0 },
      },
    },
    model: { contract: { privateField: 'never return this' } },
    ...overrides,
  };
}

test('training and evaluation rates use separate denominators and correct deck perspective', () => {
  const b = compactBatch(batch());
  expect(matchupScore(b, 'greef', 'training')).toMatchObject({
    rate: 0.6,
    wins: 600,
    games: 1000,
    draws: 50,
    cutoffs: 2,
  });
  expect(matchupScore(b, 'krennic', 'training')).toMatchObject({
    rate: 0.35,
    wins: 350,
    games: 1000,
  });
  expect(matchupScore(b, 'greef', 'evaluation')).toMatchObject({ rate: 0.9, wins: 18, games: 20 });
  expect(matchupScore(b, 'krennic', 'evaluation')).toMatchObject({
    rate: 0.6,
    wins: 12,
    games: 20,
  });
  expect(JSON.stringify(b)).not.toContain('privateField');
});

test('mirrors never become win rates, and incomplete evaluations stay unavailable', () => {
  const mirror = compactBatch(
    batch(3, {
      deckKeys: ['greef', 'greef'],
      mirror: true,
      winsA: 0,
      winsB: 0,
      draws: 0,
      evaluation: null,
    }),
  );
  expect(matchupScore(mirror, 'greef', 'training')).toBeNull();
  expect(matchupSeries([mirror], 'greef', 'greef')).toEqual([]);
  const pending = compactBatch(batch(0, { evaluation: { complete: false, byDeckIndex: {} } }));
  expect(matchupScore(pending, 'greef', 'evaluation')).toBeNull();
  expect(() => compactBatch(batch(0, { winsA: 700 }))).toThrow('Inconsistent');
});

test('cycle selection never silently substitutes a result from a different cycle', () => {
  const a = compactBatch(batch(0)),
    b = compactBatch(batch(42));
  const all = matchupSeries([b, a], 'krennic', 'greef');
  expect(all).toEqual([a, b]);
  expect(selectBatch(all)?.cycle).toBe(3);
  expect(selectBatch(all, 2)).toBeUndefined();
  expect(selectBatch(all, 1)?.cycle).toBe(1);
  expect(
    mergeBatches([{ batches: [b] }, { batches: [a, { ...b, counts: { ...b.counts, winsA: 0 } }] }]),
  ).toEqual([a, b]);
});

test('missing run has a deliberate empty status and history', async () => {
  const f = await fixture();
  expect(await f.reader.status()).toMatchObject({ state: 'unavailable', games: null, model: null });
  expect(await f.reader.history()).toEqual({ batches: [], nextBefore: null });
});

test('prepared specialists expose honest component counters and strip private artifacts', async () => {
  const f = await fixture();
  const system = {
    architecture: 'crossfire-specialists-v1',
    initialization: 'fresh',
    qualification: 'unqualified',
    baselineWeightsImported: false,
    humanReplayLearning: 'planned',
    matchupInputs: 'seat-visible state only',
    evaluationReference: 'retired league model',
    components: [
      {
        id: 'leader:krennic',
        kind: 'leader',
        label: 'Director Krennic',
        parameters: 5777,
        decisions: 0,
        updates: 0,
        weights: ['private'],
      },
    ],
    leaders: [
      {
        key: 'krennic',
        label: 'Director Krennic',
        cardId: 'director-krennic--amidst-my-achievement',
        strategies: ['ramp', 'control'],
      },
    ],
    internalPath: '/private/model.pt',
  };
  const anchor = {
    games: 1200000,
    updates: 64875,
    sha256: 'a'.repeat(64),
    file: '/private/anchor.pt',
  };
  await f.put('status.json', {
    status: 'ready',
    pid: process.pid,
    games: 0,
    updates: 0,
    system,
    anchor,
  });
  const s = await f.reader.status();
  expect(s).toMatchObject({
    state: 'ready',
    processAlive: null,
    games: 0,
    system: { baselineWeightsImported: false },
  });
  expect(s.system?.components[0]?.updates).toBe(0);
  expect(s.baseline?.games).toBe(1200000);
  expect(JSON.stringify(s)).not.toContain('private');
  await f.put('latest-model.json', {
    games: 0,
    updates: 0,
    parameters: 324798,
    sha256: 'b'.repeat(64),
    system,
  });
  await f.put('status.json', { status: 'failed', games: null });
  const failed = await f.reader.status();
  expect(failed.system?.components[0]?.id).toBe('leader:krennic');
  expect(failed.model).not.toHaveProperty('system');
  await f.put('status.json', {
    status: 'ready',
    system: { ...system, baselineWeightsImported: true },
  });
  await expect(f.reader.status()).rejects.toThrow();
});

test('dashboard strategy keys and labels match the saved model roster', () => {
  expect(roster.strategies).toEqual([...trainingStrategies]);
  const keys: string[] = trainingStrategies.map(s => s.key);
  for (const leader of roster.leaders)
    for (const strategy of leader.strategies) expect(keys).toContain(strategy);
});

test('status exposes only dashboard metadata and checks process liveness', async () => {
  const f = await fixture();
  await f.put('status.json', {
    status: 'training',
    pid: process.pid,
    games: 1000,
    updates: 40,
    cpus: [0, 1],
    workers: 2,
    batch: batch(1),
    lastCompletedBatch: { block: 0 },
    initialization: { run: '/sensitive/path' },
    secret: 'hidden',
  });
  await f.put('disk-usage.json', {
    checkedAtUtc: '2026-09-22T00:00:00Z',
    intervalSeconds: 300,
    limitBytes: 100000000000,
    allocatedBytes: 1500000000,
    status: 'ok',
  });
  const s = await f.reader.status(new Date('2026-09-22T00:00:01Z'));
  expect(s).toMatchObject({
    processAlive: true,
    games: 1000,
    lastCompletedBlock: 0,
    disk: { bytes: 1500000000, intervalSeconds: 300, ok: true },
  });
  expect(JSON.stringify(s)).not.toContain('sensitive');
  expect(JSON.stringify(s)).not.toContain('hidden');
});

test('history pages expose every older batch without repeating a boundary or reading future reports', async () => {
  const f = await fixture();
  await f.put('status.json', { status: 'training', lastCompletedBatch: { block: 214 } });
  for (let i = 0; i < 216; i++) await f.put(`batches/${String(i).padStart(8, '0')}.json`, batch(i));
  const page = await f.reader.history();
  expect(page.batches.length).toBe(210);
  expect(page.batches[0]?.block).toBe(5);
  expect(page.batches.at(-1)?.block).toBe(214);
  expect(page.nextBefore).toBe(5);
  const older = await f.reader.history(page.nextBefore!);
  expect(older.batches.map(b => b.block)).toEqual([0, 1, 2, 3, 4]);
  expect(older.nextBefore).toBeNull();
});

test('atomic replacement refreshes cached reports and minimal failure status retains history', async () => {
  const f = await fixture();
  await f.put('status.json', { status: 'training', lastCompletedBatch: { block: 0 } });
  await f.put('batches/00000000.json', batch());
  expect((await f.reader.history()).batches[0]?.counts.winsA).toBe(600);
  await f.put('batches/replacement.tmp', batch(0, { winsA: 500, winsB: 450 }));
  await rename(
    path.join(f.root, 'batches/replacement.tmp'),
    path.join(f.root, 'batches/00000000.json'),
  );
  expect((await f.reader.history()).batches[0]?.counts.winsA).toBe(500);
  await f.put('status.json', { status: 'failed', games: 1020, error: 'private traceback' });
  await f.put('checkpoints.json', { current: { games: 1000 } });
  expect((await f.reader.history()).batches).toHaveLength(1);
  expect((await f.reader.status()).state).toBe('failed');
});

test('a failure marker preserves progress and history, and cannot override a resumed process', async () => {
  const f = await fixture();
  const report = {
    status: 'training',
    pid: process.pid,
    games: 1000,
    updates: 10,
    updatedAtUtc: '2026-09-25T00:01:00Z',
    lastCompletedBatch: { block: 0 },
    batch: batch(1),
  };
  await f.put('status.json', report);
  await f.put('batches/00000000.json', batch());
  await f.put('failure.json', {
    status: 'failed',
    pid: process.pid,
    games: 1000,
    atUtc: '2026-09-25T00:02:00Z',
    error: '/private/stack.ts:123',
  });
  const failed = await f.reader.status();
  expect(failed).toMatchObject({
    state: 'failed',
    games: 1000,
    updates: 10,
    lastCompletedBlock: 0,
  });
  expect(failed.currentBatch?.block).toBe(1);
  expect(JSON.stringify(failed)).not.toContain('private');
  expect((await f.reader.history()).batches).toHaveLength(1);
  await f.put('status.json', { ...report, pid: process.pid + 1 });
  expect((await f.reader.status()).state).toBe('training');
  // PID reuse is harmless once the new run has a newer status timestamp.
  await f.put('status.json', { ...report, updatedAtUtc: '2026-09-25T00:03:00Z' });
  expect((await f.reader.status()).state).toBe('training');
});

test('malformed results, oversized JSON and symlinks fail closed', async () => {
  const f = await fixture(),
    outside = await fixture();
  await f.put('status.json', { status: 'training', lastCompletedBatch: { block: 0 } });
  await f.put('batches/00000000.json', batch(1));
  await expect(f.reader.history()).rejects.toThrow('Invalid completed batch');
  await rm(path.join(f.root, 'batches/00000000.json'));
  await outside.put('report.json', batch());
  await symlink(path.join(outside.root, 'report.json'), path.join(f.root, 'batches/00000000.json'));
  await expect(f.reader.history()).rejects.toThrow();
  await writeFile(path.join(f.root, 'status.json'), ' '.repeat(2 * 1024 * 1024 + 1));
  await expect(f.reader.status()).rejects.toThrow('Invalid report size');
});

test('practice reports expose checked progress but strip models and private training fields', async () => {
  const f = await fixture();
  const section = {
    correct: 3,
    choices: 4,
    exactLines: 1,
    lines: 2,
    families: [
      { id: 'sentinel', title: 'Survive', correct: 3, choices: 4, exactLines: 1, lines: 2 },
    ],
  };
  const scores = { train: section, heldout: section };
  const curriculum = {
    version: 'krennic-practice-v1',
    hash: 'a'.repeat(64),
    phase: 'self-play',
    passed: true,
    epochs: 200,
    before: scores,
    after: scores,
    targetGames: 100000,
    startedGames: 0,
    benchmarkProgress: null,
    history: [
      {
        kind: 'after-warmup',
        games: 0,
        atUtc: '2026-09-24T00:00:00Z',
        modelHash: 'b'.repeat(64),
        anchorHash: 'c'.repeat(64),
        practice: scores,
        benchmark: {
          complete: true,
          schedule: 'fixed',
          games: 100,
          pairs: 50,
          byOpponent: { vader: { completed: 100, wins: 40, losses: 60, draws: 0, cutoffs: 0 } },
          qualification: 'development',
        },
      },
    ],
    baseline: { file: 'private-model.pt', weights: [123] },
    teacherRows: ['private observations'],
  };
  await f.put('status.json', { status: 'training', curriculum });
  const status = await f.reader.status();
  expect(status.practice?.after?.heldout.correct).toBe(3);
  expect(status.practice?.history[0]?.benchmark.byOpponent.vader?.wins).toBe(40);
  expect(JSON.stringify(status)).not.toContain('private');
  curriculum.history[0]!.benchmark.byOpponent.vader.wins = 101;
  await f.put('status.json', { status: 'training', curriculum });
  await expect(f.reader.status()).rejects.toThrow('Invalid benchmark counts');
});

test('rotation reports preserve per-deck learning and reject incomparable evaluations', async () => {
  const f = await fixture();
  const keys = ['greef', 'vader', 'mandalorian', 'dedra', 'aurra', 'krennic', 'chewbacca', 'luke'];
  const section = { correct: 0, choices: 0, exactLines: 0, lines: 0, families: [] };
  const benchmark = {
    completed: 800,
    planned: 800,
    modelHash: 'a'.repeat(64),
    byOpponent: Object.fromEntries(
      keys.map(key => [key, { completed: 100, wins: 50, losses: 50, draws: 0, cutoffs: 0 }]),
    ),
    opponentHashes: Object.fromEntries(keys.map(key => [key, 'b'.repeat(64)])),
  };
  const snapshot = {
    practice: { train: section, heldout: section },
    benchmark,
    atUtc: '2026-09-25T00:00:00Z',
  };
  const rotation = {
    version: 'eight-deck-specialist-rotation-v1',
    activeDeck: 'krennic',
    turn: 1,
    phase: 'next-turn',
    opponentIndex: 7,
    refreshDone: 50,
    initialEpochs: 500,
    refresherEpochs: 50,
    gamesPerOpponent: 1000,
    learnerOrder: keys,
    opponentOrder: keys,
    practiceHash: 'c'.repeat(64),
    decks: keys.map(key => ({
      key,
      games: key === 'krennic' ? 8000 : 0,
      updates: 500,
      initialEpochs: 500,
      refresherEpochs: key === 'krennic' ? 50 : 0,
      modelHash: 'd'.repeat(64),
      parameters: 100,
      strategies: ['aggro'],
      beforePractice: null,
      afterPractice: null,
      latestPractice: null,
      bank: '/private/model.pt',
    })),
    history: [
      {
        turn: 0,
        cycle: 1,
        deck: 'krennic',
        games: 8000,
        totalTrainingGames: 8000,
        epochs: 50,
        before: structuredClone(snapshot),
        after: structuredClone(snapshot),
        reference: 'fixed initial specialists',
      },
    ],
    evaluation: null,
    beforeRefresh: null,
    opponentHash: 'e'.repeat(64),
    evaluationReference: 'fixed post-500-epoch specialists',
    trainingOpponent: 'latest frozen bundle belonging to the opposing deck',
  };
  await f.put('status.json', { status: 'training', games: 8000, rotation });
  const status = await f.reader.status();
  expect(status.rotation?.decks.find(d => d.key === 'krennic')?.games).toBe(8000);
  expect(status.rotation?.decks.find(d => d.key === 'vader')?.games).toBe(0);
  expect(status.rotation?.history[0]?.after.benchmark.byOpponent.vader?.completed).toBe(100);
  expect(JSON.stringify(status)).not.toContain('/private');
  await f.put('status.json', {
    status: 'training',
    pid: process.pid,
    games: 8000,
    updatedAtUtc: '2026-09-25T00:01:00Z',
    rotation,
  });
  await f.put('failure.json', {
    status: 'failed',
    pid: process.pid,
    games: 8000,
    atUtc: '2026-09-25T00:02:00Z',
    error: 'private stack trace',
  });
  const failed = await f.reader.status();
  expect(failed.state).toBe('failed');
  expect(failed.rotation?.decks).toHaveLength(8);
  expect(failed.rotation?.decks.find(d => d.key === 'krennic')?.games).toBe(8000);
  expect(failed.rotation?.history).toHaveLength(1);
  rotation.history[0]!.after.benchmark.opponentHashes.vader = 'f'.repeat(64);
  await f.put('status.json', { status: 'training', rotation });
  await expect(f.reader.status()).rejects.toThrow('same opponents');
});

test('directed rotation batches keep learner identity and explicit mirror policy results', () => {
  const value = batch(0, {
    learner: 'greef',
    opponentHash: 'a'.repeat(64),
    learnerScore: { completed: 1000, wins: 600, losses: 350, draws: 50, cutoffs: 2 },
  });
  expect(compactBatch(value)).toMatchObject({
    learner: 'greef',
    opponentModelHash: 'a'.repeat(64),
  });
  expect(() => compactBatch({ ...value, learner: 'krennic' })).toThrow('learner-specific');
  const mirror = compactBatch({
    ...value,
    deckKeys: ['greef', 'greef'],
    mirror: true,
    evaluation: null,
    winsA: 0,
    winsB: 0,
  });
  expect(mirror.learnerScore?.wins).toBe(600);
  expect(matchupScore(mirror, 'greef', 'training')).toBeNull();
});

import { expect, test } from 'bun:test';
import { rotationProgressSchema } from '../../../../../shared/types/crossfire-rotation.ts';
import type { PracticeProgress } from '../../../../../shared/types/crossfire-practice.ts';
import type {
  TrainingBatch,
  TrainingStatus,
} from '../../../../../shared/types/crossfire-training.ts';
import {
  comparisonFor,
  cycleSize,
  evaluationsFor,
  matchupDescription,
  measurementsFor,
  phaseFor,
  practiceFor,
  rosterCards,
  runHealth,
  scoreFrom,
  trainingCsv,
} from './lab-data.ts';
import { matchupScore, matchupSeries } from './metrics.ts';

const keys = ['greef', 'vader', 'mandalorian', 'dedra', 'aurra', 'krennic', 'chewbacca', 'luke'];
const counts = (wins = 60, completed = 100) => ({
  completed,
  wins,
  losses: completed - wins,
  draws: 0,
  cutoffs: 0,
});
const split = {
  correct: 2,
  choices: 4,
  exactLines: 0,
  lines: 1,
  families: [{ id: 'opening', title: 'Opening', correct: 2, choices: 4, exactLines: 0, lines: 1 }],
};
const practice = { train: split, heldout: { ...split, correct: 1 } };
test('legacy reference labels use the model format, not a registry alias', () => {
  expect(matchupDescription(status({ run: 'league-run-01' }), 'evaluation')).toContain(
    'unchanged starting model',
  );
});
test('a focused leader cycle includes each opponent and its mirror', () => {
  expect(cycleSize(status({ focusLeader: 'krennic' }))).toBe(keys.length);
});
function status(overrides: Partial<TrainingStatus> = {}): TrainingStatus {
  return {
    run: 'legacy',
    fetchedAt: '2026-09-25T00:00:00Z',
    state: 'stopped',
    processAlive: null,
    updatedAt: null,
    games: 1000,
    updates: 20,
    cutoffs: 0,
    elapsedSeconds: 100,
    cpus: [],
    workers: null,
    currentBatch: null,
    lastCompletedBlock: 0,
    disk: null,
    model: { games: 1000, updates: 20, parameters: 5680, sha256: 'a'.repeat(64) },
    decks: keys.map(key => ({ key, name: key, short: key, color: '#22c55e' })),
    ...overrides,
  };
}
function batch(overrides: Partial<TrainingBatch> = {}): TrainingBatch {
  return {
    block: 0,
    cycle: 1,
    decks: ['krennic', 'vader'],
    mirror: false,
    startedAt: '2026-09-25T00:00:00Z',
    finishedAt: '2026-09-25T00:01:00Z',
    counts: { completed: 1000, winsA: 550, winsB: 400, draws: 50, cutoffs: 2 },
    byMode: {},
    evaluation: { krennic: counts(4, 20), vader: counts(14, 20) },
    ...overrides,
  };
}
function rotation() {
  const benchmark = (wins: number) => ({
    completed: 800,
    planned: 800,
    modelHash: 'b'.repeat(64),
    byOpponent: Object.fromEntries(keys.map(k => [k, counts(wins)])),
    opponentHashes: Object.fromEntries(keys.map(k => [k, 'c'.repeat(64)])),
  });
  const snapshot = (wins: number) => ({
    practice,
    benchmark: benchmark(wins),
    atUtc: '2026-09-25T00:00:00Z',
  });
  return rotationProgressSchema.parse({
    version: 'eight-deck-specialist-rotation-v1',
    activeDeck: 'luke',
    turn: 2,
    phase: 'games',
    opponentIndex: 0,
    refreshDone: 0,
    initialEpochs: 500,
    refresherEpochs: 50,
    gamesPerOpponent: 1000,
    learnerOrder: keys,
    opponentOrder: keys,
    practiceHash: 'd'.repeat(64),
    decks: keys.map(key => ({
      key,
      games: key === 'krennic' ? 8000 : 0,
      updates: 500,
      initialEpochs: 500,
      refresherEpochs: 0,
      modelHash: 'e'.repeat(64),
      parameters: 425184,
      strategies: ['aggro'],
      beforePractice: practice,
      afterPractice: practice,
      latestPractice: practice,
    })),
    history: [
      {
        turn: 0,
        cycle: 1,
        deck: 'krennic',
        games: 8000,
        totalTrainingGames: 8000,
        epochs: 50,
        before: snapshot(30),
        after: snapshot(60),
        reference: 'Fixed initial specialists',
      },
    ],
    evaluation: null,
    beforeRefresh: null,
    opponentHash: 'c'.repeat(64),
    evaluationReference: 'fixed post-500-epoch specialists',
    trainingOpponent: 'latest frozen bundle belonging to the opposing deck',
  });
}
function curriculum(): PracticeProgress {
  const point = (kind: 'before-warmup' | 'after-warmup', wins: number) => ({
    kind,
    games: 0,
    atUtc: '2026-09-25T00:00:00Z',
    modelHash: 'a'.repeat(64),
    anchorHash: 'b'.repeat(64),
    practice,
    benchmark: {
      complete: true as const,
      schedule: 'fixed',
      games: 600,
      pairs: 50,
      byOpponent: { vader: counts(wins) },
      qualification: 'development',
    },
  });
  return {
    version: 'krennic-practice-v1',
    hash: 'c'.repeat(64),
    phase: 'self-play',
    passed: true,
    epochs: 200,
    before: practice,
    after: practice,
    targetGames: 100000,
    startedGames: 0,
    benchmarkProgress: null,
    history: [point('before-warmup', 0), point('after-warmup', 40)],
  };
}

test('shared-policy rates preserve both deck perspectives and draws in the denominator', () => {
  const result = measurementsFor(status(), [batch()], 'training');
  expect(result.map(r => [r.deck, r.opponent, r.score.rate, r.score.games])).toEqual([
    ['krennic', 'vader', 0.55, 1000],
    ['vader', 'krennic', 0.4, 1000],
  ]);
  expect(result[0]!.score.draws).toBe(50);
});
test('directed training never borrows the opposing specialist’s or reverse learner’s results', () => {
  const forward = batch({ learner: 'krennic', opponentModelHash: 'a'.repeat(64) });
  const reverse = batch({
    learner: 'vader',
    decks: ['vader', 'krennic'],
    block: 9,
    counts: { completed: 1000, winsA: 800, winsB: 200, draws: 0, cutoffs: 0 },
  });
  const s = status({ rotation: rotation() }),
    values = measurementsFor(s, [reverse, forward], 'training');
  expect(comparisonFor(values, 'krennic', 'vader').selected?.score.rate).toBe(0.55);
  expect(comparisonFor(values, 'vader', 'krennic').selected?.score.rate).toBe(0.8);
  expect(matchupScore(forward, 'vader', 'training')).toBeNull();
  expect(matchupSeries([forward, reverse], 'krennic', 'vader')).toEqual([forward]);
  expect(values).toHaveLength(2);
});
test('an unplayed reverse pairing stays empty rather than showing an inferred rate', () => {
  const values = measurementsFor(
    status({ rotation: rotation() }),
    [batch({ learner: 'krennic' })],
    'training',
  );
  expect(comparisonFor(values, 'vader', 'krennic').selected).toBeUndefined();
});
test('missing cycles stay empty and history stays chronological', () => {
  const values = measurementsFor(status(), [batch({ block: 42, cycle: 3 }), batch()], 'training');
  expect(comparisonFor(values, 'krennic', 'vader', 2).selected).toBeUndefined();
  const result = comparisonFor(values, 'krennic', 'vader', 3);
  expect(result.previous?.cycle).toBe(1);
  expect(result.series.map(r => r.cycle)).toEqual([1, 3]);
});
test('mirrors and in-progress batches cannot enter completed matchup charts or exports', () => {
  const mirrors = batch({ mirror: true, decks: ['krennic', 'krennic'] });
  const unfinished = batch({ finishedAt: null });
  expect(measurementsFor(status(), [mirrors, unfinished], 'training')).toEqual([]);
  expect(trainingCsv([mirrors, unfinished]).split('\n')).toHaveLength(1);
});
test('frozen evaluations retain their own 20-game samples independently of 1000 training games', () => {
  const values = measurementsFor(status(), [batch()], 'evaluation');
  expect(values.map(v => [v.score.games, v.score.rate])).toEqual([
    [20, 0.2],
    [20, 0.7],
  ]);
});
test('rotation evaluations use completed 100-game post-refresher reports, including zero wins', () => {
  const r = rotation();
  r.history[0]!.after.benchmark.byOpponent.vader = counts(0);
  const values = measurementsFor(status({ rotation: r }), [batch()], 'evaluation');
  expect(values).toHaveLength(7);
  expect(comparisonFor(values, 'krennic', 'vader').selected?.score).toMatchObject({
    games: 100,
    rate: 0,
  });
  expect(comparisonFor(values, 'vader', 'krennic').selected).toBeUndefined();
});
test('empty samples are missing, while measured zero wins remain real results', () => {
  expect(scoreFrom(counts(0, 0))).toBeNull();
  expect(scoreFrom(counts(0, 100))?.rate).toBe(0);
});
test('every rotation deck keeps its own practice measurements and bundle counters', () => {
  const s = status({ rotation: rotation() });
  expect(practiceFor(s, 'luke')?.afterLabel).toBe('After 500 epochs');
  expect(rosterCards(s).find(c => c.deck === 'krennic')).toMatchObject({
    games: 8000,
    parameters: 425184,
    epochs: { completed: 500, target: 500 },
  });
  expect(rosterCards(s).find(c => c.deck === 'luke')?.active).toBe(true);
  expect(cycleSize(s)).toBe(64);
});
test('legacy roster cards do not invent per-deck counters from a shared model', () => {
  expect(
    rosterCards(status()).every(c => c.games === undefined && c.parameters === undefined),
  ).toBe(true);
});
test('the earlier curriculum is scoped to its learner and retains before/after reference data', () => {
  const s = status({ practice: curriculum(), focusLeader: 'krennic' });
  expect(practiceFor(s, 'vader')).toBeNull();
  expect(practiceFor(s, 'krennic')?.latest).toEqual(practice);
  expect(evaluationsFor(s, 'krennic')[1]).toMatchObject({
    before: { vader: { rate: 0, games: 100 } },
    after: { vader: { rate: 0.4, games: 100 } },
    comparable: true,
  });
  expect(evaluationsFor(s, 'vader')).toEqual([]);
});
test('a changed evaluation reference cannot produce an improvement delta', () => {
  const p = curriculum();
  p.history[1]!.anchorHash = 'f'.repeat(64);
  expect(evaluationsFor(status({ practice: p }), 'krennic')[1]?.comparable).toBe(false);
});
test('refresher comparisons keep their exact before/after models and include policy mirrors', () => {
  const reports = evaluationsFor(status({ rotation: rotation() }), 'krennic');
  expect(reports[0]).toMatchObject({
    beforeLabel: 'Before 50 epochs',
    afterLabel: 'After 50 epochs',
    before: { krennic: { games: 100, rate: 0.3 } },
    after: { krennic: { games: 100, rate: 0.6 } },
  });
});
test('the same progress card follows practice, evaluation, refresher, and next learner phases', () => {
  const r = rotation(),
    s = status({ rotation: r, currentBatch: batch() });
  r.phase = 'warmup';
  expect(phaseFor(s)).toMatchObject({ unit: 'epochs', completed: 500, target: 500 });
  r.phase = 'refresh';
  r.refreshDone = 30;
  expect(phaseFor(s)).toMatchObject({ unit: 'epochs', completed: 30, target: 50 });
  r.phase = 'evaluate-before';
  expect(phaseFor(s)).toMatchObject({ unit: 'games', completed: 0, target: 800 });
  r.phase = 'next-turn';
  expect(phaseFor(s)).toMatchObject({ completed: 0, target: 0 });
});
test('status distinguishes stale updates, a dead process, failure and ready runs', () => {
  const now = Date.parse('2026-09-25T00:05:00Z');
  expect(
    runHealth(
      status({ state: 'training', processAlive: true, updatedAt: '2026-09-25T00:00:00Z' }),
      now,
    ).label,
  ).toBe('Waiting for update');
  expect(runHealth(status({ state: 'training', processAlive: false }), now).label).toBe(
    'Process stopped',
  );
  expect(runHealth(status({ state: 'failed' }), now).live).toBe(false);
  expect(runHealth(status({ state: 'ready' }), now).label).toContain('Prepared');
});
test('CSV exports retain directed learner and frozen opponent provenance', () => {
  const text = trainingCsv([batch({ learner: 'krennic', opponentModelHash: 'a'.repeat(64) })]);
  expect(text).toContain('"learner","opponent_model"');
  expect(text).toContain(`"krennic","${'a'.repeat(64)}"`);
  expect(trainingCsv([batch()])).not.toContain('"both"');
});

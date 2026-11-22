import { afterEach, beforeEach, expect, spyOn, test } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { eq, inArray, sql } from 'drizzle-orm';
import { db } from '../../db';
import { tournament } from '../../db/schema/tournament.ts';
import { tournamentImport } from '../../db/schema/tournament_weekend.ts';
import * as melee from './melee.ts';
import * as workflow from '../imports/tournamentImportWorkflow.ts';
import * as statistics from '../card-statistics';
import * as groupStatistics from '../card-statistics/update-tournament-group-statistics.ts';
import * as thumbnails from '../decks/generateDeckThumbnail.ts';
import * as sideEffects from '../imports/tournamentImportedSideEffects.ts';
import * as events from './liveTournamentEvents.ts';
import { TournamentImportNotReadyError } from '../imports/tournamentImportNotReady.ts';
import { processNextTournamentImport } from './tournamentImportQueue.ts';

const enabled = process.env.SWUBASE_IMPORT_QUEUE_DB_TEST === '1';
const databaseTest = test.skipIf(!enabled);
if (enabled) {
  const target = new URL(process.env.DATABASE_URL!);
  if (target.hostname !== '127.0.0.1' || !target.pathname.startsWith('/swubase_')) {
    throw new Error('Tests require the isolated worktree database');
  }
}

const readyDetail = {
  meleeId: '12345',
  status: 'finished' as const,
  exactStart: null,
  playerCount: 2,
  hasDecklists: true,
  bracketInfo: undefined,
};
const ids: string[] = [];
function mockDependencies() {
  return {
    fetch: spyOn(globalThis, 'fetch').mockImplementation(async () => {
      throw new Error('Unexpected external request');
    }),
    detail: spyOn(melee, 'fetchLiveTournamentDetailFromMelee').mockResolvedValue(readyDetail),
    import: spyOn(workflow, 'runTournamentImport').mockResolvedValue(undefined),
    stats: spyOn(statistics, 'computeAndSaveTournamentStatistics').mockResolvedValue({
      cardStats: [],
      cardStatsLeader: [],
      cardStatsLeaderBase: [],
    }),
    groups: spyOn(
      groupStatistics,
      'updateTournamentGroupsStatisticsForTournament',
    ).mockResolvedValue(undefined),
    thumbnails: spyOn(thumbnails, 'generateDeckThumbnails').mockResolvedValue({
      results: [],
      errors: [],
    }),
    effects: spyOn(sideEffects, 'runTournamentImportedSideEffects').mockImplementation(
      async tournamentId => ({
        tournamentId,
        dailySnapshot: { status: 'failed', tournamentId, error: 'Mocked snapshot failure' },
        screenshotter: { status: 'skipped', tournamentId, reason: 'Test' },
        discord: { status: 'skipped', tournamentId, reason: 'Test' },
      }),
    ),
    publish: spyOn(events, 'publishTournamentImportFinished').mockResolvedValue([]),
  };
}
let mocks: ReturnType<typeof mockDependencies>;
beforeEach(async () => {
  if (!enabled) return;
  // The worker claims globally; refuse to touch pre-existing local jobs.
  expect(
    await db.select().from(tournamentImport).where(eq(tournamentImport.status, 'pending')),
  ).toEqual([]);
  mocks = mockDependencies();
});
afterEach(async () => {
  if (!enabled) return;
  if (mocks) Object.values(mocks).forEach(mock => mock.mockRestore());
  if (ids.length) await db.delete(tournament).where(inArray(tournament.id, ids.splice(0)));
});

async function enqueue(format = 1, imported = false) {
  const id = randomUUID();
  await db.insert(tournament).values({
    id,
    userId: 'swubase',
    name: 'Queue readiness fixture',
    type: 'pq',
    location: 'Test',
    continent: 'Europe',
    attendance: 2,
    format,
    days: 1,
    date: new Date('2026-11-22'),
    meleeId: '12345',
    imported,
  });
  ids.push(id);
  await db.insert(tournamentImport).values({ tournamentId: id });
  return id;
}
const readJob = async (id: string) =>
  (await db.select().from(tournamentImport).where(eq(tournamentImport.tournamentId, id)))[0]!;
const readImported = async (id: string) =>
  (await db.select().from(tournament).where(eq(tournament.id, id)))[0]!.imported;
function expectNoCompletion() {
  expect(mocks.stats).not.toHaveBeenCalled();
  expect(mocks.groups).not.toHaveBeenCalled();
  expect(mocks.thumbnails).not.toHaveBeenCalled();
  expect(mocks.effects).not.toHaveBeenCalled();
  expect(mocks.publish).not.toHaveBeenCalled();
}

databaseTest('a reopened event is deferred and successfully retried after the delay', async () => {
  const id = await enqueue();
  mocks.detail.mockResolvedValue({ ...readyDetail, status: 'running' });
  expect(await processNextTournamentImport()).toMatchObject({ type: 'skipped', tournamentId: id });
  expect(await readJob(id)).toMatchObject({
    status: 'pending',
    attempts: 1,
    startedAt: null,
    finishedAt: null,
  });
  expect(await readImported(id)).toBe(false);
  expect(mocks.import).not.toHaveBeenCalled();
  expectNoCompletion();

  expect(await processNextTournamentImport()).toMatchObject({
    type: 'skipped',
    reason: 'No pending tournament import found.',
  });
  expect(mocks.detail).toHaveBeenCalledTimes(1);
  await db
    .update(tournamentImport)
    .set({ updatedAt: sql`NOW() - INTERVAL '6 minutes'` })
    .where(eq(tournamentImport.tournamentId, id));
  mocks.detail.mockResolvedValue(readyDetail);
  expect(await processNextTournamentImport()).toMatchObject({
    type: 'processed',
    tournamentId: id,
    attempts: 2,
  });
  expect(mocks.import).toHaveBeenCalledWith(id, undefined, undefined, {
    requireCompletedRounds: true,
  });
  expect(await readImported(id)).toBe(true);
  expect(await readJob(id)).toMatchObject({ status: 'finished', attempts: 2, lastError: null });
  expect(mocks.effects).toHaveBeenCalledTimes(1);
  expect(mocks.publish).toHaveBeenCalledTimes(1);
});

databaseTest(
  'missing constructed decklists are deferred without running the importer',
  async () => {
    const id = await enqueue();
    mocks.detail.mockResolvedValue({ ...readyDetail, hasDecklists: false });
    expect(await processNextTournamentImport()).toMatchObject({
      type: 'skipped',
      tournamentId: id,
    });
    expect(await readJob(id)).toMatchObject({ status: 'pending', attempts: 1 });
    expect(await readImported(id)).toBe(false);
    expect(mocks.import).not.toHaveBeenCalled();
    expectNoCompletion();
  },
);

databaseTest(
  'decklists disappearing during preflight do not mark the tournament imported',
  async () => {
    const id = await enqueue();
    mocks.import.mockRejectedValue(new TournamentImportNotReadyError('Decklists disappeared'));
    expect(await processNextTournamentImport()).toMatchObject({
      type: 'skipped',
      tournamentId: id,
    });
    expect(await readJob(id)).toMatchObject({
      status: 'pending',
      lastError: 'Decklists disappeared',
    });
    expect(await readImported(id)).toBe(false);
    expectNoCompletion();
  },
);

databaseTest('a deferred event does not block another pending event', async () => {
  const first = await enqueue();
  mocks.detail.mockResolvedValueOnce({ ...readyDetail, status: 'running' });
  expect(await processNextTournamentImport()).toMatchObject({
    type: 'skipped',
    tournamentId: first,
  });
  const second = await enqueue();
  expect(await processNextTournamentImport()).toMatchObject({
    type: 'processed',
    tournamentId: second,
  });
  expect(await readJob(first)).toMatchObject({ status: 'pending', attempts: 1 });
  expect(mocks.import).toHaveBeenCalledTimes(1);
});

databaseTest('competing workers cannot import the same job twice', async () => {
  const id = await enqueue();
  const results = await Promise.all([processNextTournamentImport(), processNextTournamentImport()]);
  expect(results.filter(result => result.type === 'processed')).toHaveLength(1);
  expect(mocks.import).toHaveBeenCalledTimes(1);
  expect(mocks.effects).toHaveBeenCalledTimes(1);
  expect(await readJob(id)).toMatchObject({ status: 'finished', attempts: 1 });
});

databaseTest('real import failures remain failed and are not retried automatically', async () => {
  const id = await enqueue();
  mocks.import.mockRejectedValue(new Error('Database write failed'));
  await expect(processNextTournamentImport()).rejects.toThrow('Database write failed');
  expect(await readJob(id)).toMatchObject({ status: 'failed', attempts: 1 });
  expect(await readImported(id)).toBe(false);
  expectNoCompletion();
  expect(await processNextTournamentImport()).toMatchObject({
    type: 'skipped',
    reason: 'No pending tournament import found.',
  });
});

databaseTest(
  'already imported events skip readiness checks and all completion effects',
  async () => {
    const id = await enqueue(1, true);
    expect(await processNextTournamentImport()).toMatchObject({
      type: 'skipped',
      tournamentId: id,
    });
    expect(mocks.detail).not.toHaveBeenCalled();
    expect(mocks.import).not.toHaveBeenCalled();
    expectNoCompletion();
  },
);

databaseTest('finished limited events remain importable without decklists', async () => {
  const id = await enqueue(3);
  mocks.detail.mockResolvedValue({ ...readyDetail, hasDecklists: false });
  expect(await processNextTournamentImport()).toMatchObject({
    type: 'processed',
    tournamentId: id,
  });
  expect(await readImported(id)).toBe(true);
});

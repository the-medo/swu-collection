import { afterAll, afterEach, expect, test } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { eq, inArray } from 'drizzle-orm';
import { db } from '../../db';
import { tournament } from '../../db/schema/tournament.ts';
import {
  tournamentWeekend,
  tournamentWeekendTournament,
} from '../../db/schema/tournament_weekend.ts';
import { liveTournamentCheck } from './liveTournamentCheck.ts';
import { liveTournamentProgressCheck } from './liveTournamentProgressCheck.ts';

const enabled = process.env.SWUBASE_AUTOMATIC_TOP_CUT_DB_TEST === '1';
const databaseTest = test.skipIf(!enabled);
if (enabled) {
  const target = new URL(process.env.DATABASE_URL!);
  if (target.hostname !== '127.0.0.1' || !target.pathname.startsWith('/swubase_')) {
    throw new Error('Tests require the isolated worktree database');
  }
}

const tournamentIds: string[] = [];
const weekendIds: string[] = [];
const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});
afterAll(async () => {
  if (weekendIds.length) {
    await db.delete(tournamentWeekend).where(inArray(tournamentWeekend.id, weekendIds));
  }
  if (tournamentIds.length) {
    await db.delete(tournament).where(inArray(tournament.id, tournamentIds));
  }
});

async function createFixture() {
  const tournamentId = randomUUID();
  const weekendId = randomUUID();
  await db.insert(tournament).values({
    id: tournamentId,
    userId: 'swubase',
    name: 'Automatic cut fixture',
    type: 'pq',
    location: 'Test',
    continent: 'Europe',
    attendance: 8,
    format: 1,
    days: 1,
    date: new Date('2026-01-03'),
    meleeId: '12345',
    imported: true,
    bracketInfo: 'top8',
    updatedAt: new Date('2000-01-01'),
  });
  tournamentIds.push(tournamentId);
  await db
    .insert(tournamentWeekend)
    .values({ id: weekendId, name: 'Cut fixture', date: '2026-01-03' });
  weekendIds.push(weekendId);
  await db.insert(tournamentWeekendTournament).values({
    tournamentWeekendId: weekendId,
    tournamentId,
    status: 'finished',
    wasCheckedFinished: true,
    roundName: 'Finals',
    roundNumber: 3,
    matchesTotal: 1,
    matchesRemaining: 0,
  });
  return { tournamentId, weekendId };
}

function mockMelee(names: string[]) {
  const requests: string[] = [];
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = String(input);
    requests.push(url);
    if (url.includes('/Tournament/GetTournamentDetails')) {
      return Response.json({ Status: 'Finished', ParticipationCount: 12 });
    }
    if (url.includes('/Tournament/View/')) {
      return new Response(
        '<div id="standings-round-selector-container">' +
          names
            .map(
              (name, index) =>
                `<button class="round-selector" data-id="${101 + index}" data-name="${name}" data-is-completed="true"></button>`,
            )
            .join('') +
          '</div>',
      );
    }
    if (url.includes('/Standing/GetRoundStandings') || url.includes('/Match/GetRoundMatches/')) {
      return Response.json({ recordsTotal: 0, data: [] });
    }
    throw new Error(`Unexpected external request: ${url}`);
  }) as typeof fetch;
  return requests;
}

const readTournament = async (id: string) =>
  (await db.select().from(tournament).where(eq(tournament.id, id)))[0]!;

databaseTest(
  'attendance refresh corrects the cut even when progress checking is skipped',
  async () => {
    const input = await createFixture();
    const requests = mockMelee(['Round 1', 'Semifinals', 'Finals']);
    const before = await readTournament(input.tournamentId);
    expect(await liveTournamentCheck(input)).toMatchObject({ type: 'checked', progress: null });
    const after = await readTournament(input.tournamentId);
    expect(after).toMatchObject({ attendance: 12, bracketInfo: 'top4' });
    expect(after.updatedAt.getTime()).toBeGreaterThan(before.updatedAt.getTime());
    expect(requests.filter(url => url.includes('/Tournament/View/'))).toHaveLength(1);
    expect(requests.some(url => url.includes('/Match/'))).toBe(false);
  },
);

databaseTest(
  'progress refresh corrects the cut and preserves it when no cut is recognizable',
  async () => {
    const input = await createFixture();
    mockMelee(['Round 1', 'Semifinals', 'Finals']);
    const before = await readTournament(input.tournamentId);
    expect(await liveTournamentProgressCheck(input)).toMatchObject({ type: 'checked' });
    const after = await readTournament(input.tournamentId);
    expect(after.bracketInfo).toBe('top4');
    expect(after.updatedAt.getTime()).toBeGreaterThan(before.updatedAt.getTime());

    mockMelee(['Round 1', 'Round 2', 'Round 3']);
    expect(await liveTournamentProgressCheck(input)).toMatchObject({ type: 'checked' });
    expect(await readTournament(input.tournamentId)).toMatchObject({
      bracketInfo: 'top4',
      updatedAt: after.updatedAt,
    });

    mockMelee([]);
    expect(await liveTournamentProgressCheck(input)).toMatchObject({ type: 'skipped' });
    expect((await readTournament(input.tournamentId)).bracketInfo).toBe('top4');
  },
  15000,
);

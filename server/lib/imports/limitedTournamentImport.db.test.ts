import { afterAll, afterEach, expect, test } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { eq, inArray } from 'drizzle-orm';
import { Hono } from 'hono';
import { db } from '../../db';
import { tournament } from '../../db/schema/tournament.ts';
import { tournamentMatch } from '../../db/schema/tournament_match.ts';
import { tournamentDeck } from '../../db/schema/tournament_deck.ts';
import { discordNotification } from '../../db/schema/discord_notification.ts';
import { runTournamentImport } from './tournamentImportWorkflow.ts';
import { sendTournamentResultsDiscordMessage } from '../discord/tournamentResults.ts';
import { tournamentIdMatchesGetRoute } from '../../routes/tournaments/_id/matches/get.ts';
import type { LimitedMeleeMatch } from './limitedTournamentMatches.ts';
import {
  tournamentImport,
  tournamentWeekend,
  tournamentWeekendTournament,
} from '../../db/schema/tournament_weekend.ts';
import { checkTournamentWeekend } from '../live-tournaments/checkTournamentWeekend.ts';
import { adminTournamentIdRoundApplyMatchesPostRoute } from '../../routes/admin/tournaments/_id/rounds/_round/apply-matches/post.ts';
import { user } from '../../db/schema/auth-schema.ts';
import { deck } from '../../db/schema/deck.ts';
import { deckCard } from '../../db/schema/deck_card.ts';
import type { AuthExtension } from '../../auth/auth.ts';

const enabled = process.env.SWUBASE_LIMITED_IMPORT_DB_TEST === '1';
const databaseTest = test.skipIf(!enabled);
if (enabled) {
  const target = new URL(process.env.DATABASE_URL!);
  if (target.hostname !== '127.0.0.1' || !target.pathname.startsWith('/swubase_')) {
    throw new Error('Tests require the isolated worktree database');
  }
}
const ids: string[] = [];
const weekendIds: string[] = [];
const deckIds: string[] = [];
const userIds: string[] = [];
const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});
afterAll(async () => {
  if (!ids.length) return;
  if (weekendIds.length)
    await db.delete(tournamentWeekend).where(inArray(tournamentWeekend.id, weekendIds));
  await db.delete(tournamentImport).where(inArray(tournamentImport.tournamentId, ids));
  await db.delete(tournamentMatch).where(inArray(tournamentMatch.tournamentId, ids));
  await db.delete(tournamentDeck).where(inArray(tournamentDeck.tournamentId, ids));
  await db.delete(tournament).where(inArray(tournament.id, ids));
  if (deckIds.length) {
    await db.delete(deckCard).where(inArray(deckCard.deckId, deckIds));
    await db.delete(deck).where(inArray(deck.id, deckIds));
  }
  if (userIds.length) await db.delete(user).where(inArray(user.id, userIds));
});

const match = (first: string, second: string, result: string): LimitedMeleeMatch => ({
  Competitors: [first, second].map(DisplayName => ({ Team: { Players: [{ DisplayName }] } })),
  ResultString: result,
});
const fixtures = (): Record<number, LimitedMeleeMatch[]> => ({
  101: [match('A', 'B', 'A won 2-0-0'), match('C', 'D', 'C won 2-1-0')],
  102: [match('A', 'D', 'A won 2-1-0'), match('B', 'C', 'C won 2-0-0')],
  103: [match('C', 'A', 'A won 2-1-0')],
});
const view =
  '<div id="standings-round-selector-container">' +
  [101, 102, 103]
    .map(
      (id, index) =>
        `<button class="round-selector" data-id="${id}" data-name="Round ${index + 1}" data-is-completed="true"></button>`,
    )
    .join('') +
  '</div>';

function mockMelee(rows: Record<number, LimitedMeleeMatch[]>, failedRound?: number, html = view) {
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = String(input);
    if (url.includes('/Tournament/View/')) return new Response(html);
    const round = Number(url.match(/GetRoundMatches\/(\d+)$/)?.[1]);
    if (round === failedRound) return new Response('Unavailable', { status: 503 });
    if (rows[round]) return Response.json({ data: rows[round], recordsTotal: rows[round].length });
    throw new Error(`Unexpected external request: ${url}`);
  }) as typeof fetch;
}

async function createTournament(format = 3) {
  const id = randomUUID();
  await db.insert(tournament).values({
    id,
    userId: 'swubase',
    name: 'Limited import fixture',
    type: 'pq',
    location: 'Test',
    continent: 'Europe',
    attendance: 4,
    format,
    days: 1,
    date: new Date('2026-01-01'),
    meleeId: '12345',
    bracketInfo: 'top4',
  });
  ids.push(id);
  return id;
}
const readMatches = (id: string) =>
  db
    .select()
    .from(tournamentMatch)
    .where(eq(tournamentMatch.tournamentId, id))
    .orderBy(tournamentMatch.round);

databaseTest(
  'limited reruns preserve existing deck links and cards',
  async () => {
    const id = await createTournament();
    const savedDecks = await db
      .insert(deck)
      .values(['A', 'B'].map(name => ({ userId: 'swubase', format: 3, name })))
      .returning();
    deckIds.push(...savedDecks.map(row => row.id));
    await db.insert(tournamentDeck).values(
      savedDecks.map(row => ({
        tournamentId: id,
        deckId: row.id,
        meleePlayerUsername: row.name,
        topRelativeToPlayerCount: false,
        recordWin: 1,
        recordLose: 1,
        recordDraw: 0,
        points: 3,
      })),
    );
    await db.insert(deckCard).values(
      savedDecks.map(row => ({
        deckId: row.id,
        cardId: 'battlefield-marine',
        board: 1,
        quantity: 1,
      })),
    );
    mockMelee(fixtures());
    await runTournamentImport(id);
    await runTournamentImport(id);
    const rows = await readMatches(id);
    expect(rows).toHaveLength(5);
    expect(rows.find(row => row.round === 1 && row.p1Username === 'A')).toMatchObject({
      p1DeckId: savedDecks[0]!.id,
      p2DeckId: savedDecks[1]!.id,
    });
    expect(rows.find(row => row.round === 3)).toMatchObject({
      p1DeckId: null,
      p2DeckId: savedDecks[0]!.id,
    });
    expect(
      await db
        .select()
        .from(deckCard)
        .where(
          inArray(
            deckCard.deckId,
            savedDecks.map(row => row.id),
          ),
        ),
    ).toHaveLength(2);
    expect(
      await db.select().from(tournamentDeck).where(eq(tournamentDeck.tournamentId, id)),
    ).toHaveLength(2);
  },
  10000,
);

databaseTest(
  'skips unstarted rounds and rejects ambiguous round numbers before replacing data',
  async () => {
    const id = await createTournament();
    mockMelee(
      fixtures(),
      undefined,
      view.replace(
        '</div>',
        '<button class="round-selector" data-id="104" data-name="Round 4" data-is-completed="false"></button></div>',
      ),
    );
    await runTournamentImport(id);
    const before = await readMatches(id);
    expect(before).toHaveLength(5);
    await expect(runTournamentImport(id, '', [4])).rejects.toThrow('selected round');
    mockMelee(fixtures(), undefined, view.replace('Round 2', 'Round 1'));
    await expect(runTournamentImport(id)).rejects.toThrow('Ambiguous Melee round numbers');
    expect(await readMatches(id)).toEqual(before);
  },
  10000,
);

databaseTest(
  'full imports and reruns persist deckless matches exposed by the existing endpoint',
  async () => {
    for (const format of [3, 4]) {
      const id = await createTournament(format);
      mockMelee(fixtures());
      await runTournamentImport(id);
      await runTournamentImport(id);
      const rows = await readMatches(id);
      expect(rows).toHaveLength(5);
      expect(rows.every(row => row.p1DeckId === null && row.p2DeckId === null)).toBe(true);
      expect(rows.find(row => row.round === 3)).toMatchObject({
        p1Username: 'C',
        p2Username: 'A',
        p1Points: 6,
        p2Points: 6,
        gameWin: 1,
        gameLose: 2,
        result: 0,
      });
      expect(
        await db.select().from(tournamentDeck).where(eq(tournamentDeck.tournamentId, id)),
      ).toEqual([]);
      const app = new Hono().route('/tournament/:id/matches', tournamentIdMatchesGetRoute);
      const response = await app.request(`/tournament/${id}/matches`);
      expect(response.status).toBe(200);
      expect((await response.json()).data).toHaveLength(5);
    }
  },
  15000,
);

databaseTest(
  'selected-round imports preserve other rows and compute points from earlier rounds',
  async () => {
    const id = await createTournament();
    const source = fixtures();
    mockMelee(source);
    await runTournamentImport(id);
    const before = await readMatches(id);
    const beforeTimestamp = (await db.select().from(tournament).where(eq(tournament.id, id)))[0]!
      .updatedAt;
    source[103] = [match('C', 'A', 'C won 2-0-0')];
    await runTournamentImport(id, '', [3]);
    const after = await readMatches(id);
    expect(after.filter(row => row.round < 3)).toEqual(before.filter(row => row.round < 3));
    expect(after.find(row => row.round === 3)).toMatchObject({
      p1Points: 6,
      p2Points: 6,
      result: 3,
    });
    expect(
      (await db.select().from(tournament).where(eq(tournament.id, id)))[0]!.updatedAt.getTime(),
    ).toBeGreaterThan(beforeTimestamp.getTime());
    await expect(runTournamentImport(id, '', [99])).rejects.toThrow('selected round');
    expect(await readMatches(id)).toEqual(after);
  },
  10000,
);

databaseTest(
  'failed fetches, empty rounds, and database failures preserve existing matches',
  async () => {
    const id = await createTournament();
    mockMelee(fixtures());
    await runTournamentImport(id);
    const before = await readMatches(id);
    mockMelee(fixtures(), 102);
    await expect(runTournamentImport(id)).rejects.toThrow('Failed to fetch round');
    expect(await readMatches(id)).toEqual(before);
    const empty = fixtures();
    empty[102] = [];
    mockMelee(empty);
    await expect(runTournamentImport(id)).rejects.toThrow('No matches available');
    expect(await readMatches(id)).toEqual(before);
    const invalid = fixtures();
    const longName = 'x'.repeat(256);
    invalid[103] = [match(longName, 'A', `${longName} won 2-0-0`)];
    mockMelee(invalid);
    await expect(runTournamentImport(id)).rejects.toThrow();
    expect(await readMatches(id)).toEqual(before);
  },
  15000,
);

databaseTest(
  'limited Discord results are skipped even for force and dry-run, without claiming or sending',
  async () => {
    let requests = 0;
    const fetchFn = (async () => {
      requests++;
      throw new Error('Must not send');
    }) as unknown as typeof fetch;
    for (const format of [3, 4]) {
      const id = await createTournament(format);
      for (const dryRun of [false, true]) {
        expect(
          await sendTournamentResultsDiscordMessage({
            tournamentId: id,
            force: true,
            dryRun,
            fetchFn,
          }),
        ).toMatchObject({ status: 'skipped', tournamentId: id });
      }
      expect(
        await db.select().from(discordNotification).where(eq(discordNotification.scopeId, id)),
      ).toEqual([]);
    }
    expect(requests).toBe(0);
  },
);

databaseTest(
  'finished limited events enqueue once without decklists and stop polling once queued',
  async () => {
    const id = await createTournament();
    const [weekend] = await db
      .insert(tournamentWeekend)
      .values({
        name: 'Limited import test',
        date: '2026-01-03',
      })
      .returning();
    weekendIds.push(weekend!.id);
    await db.insert(tournamentWeekendTournament).values({
      tournamentWeekendId: weekend!.id,
      tournamentId: id,
      status: 'finished',
      wasCheckedFinished: true,
      hasDecklists: false,
    });
    let requests = 0;
    globalThis.fetch = (async (input: string | URL | Request) => {
      requests++;
      if (String(input).includes('/Tournament/GetTournamentDetails')) {
        return Response.json({ Status: 'Finished', ParticipationCount: 4 });
      }
      throw new Error('Unexpected external request');
    }) as typeof fetch;
    const first = await checkTournamentWeekend(weekend!.id);
    expect(first?.errors).toEqual([]);
    expect(first?.results[0]).toMatchObject({
      type: 'checked',
      queuedImport: true,
      hasDecklists: false,
    });
    expect(
      await db.select().from(tournamentImport).where(eq(tournamentImport.tournamentId, id)),
    ).toHaveLength(1);
    for (const status of ['pending', 'running', 'failed', 'finished'] as const) {
      await db
        .update(tournamentImport)
        .set({ status })
        .where(eq(tournamentImport.tournamentId, id));
      expect((await checkTournamentWeekend(weekend!.id))?.eligibleTournamentCount).toBe(0);
    }
    expect(requests).toBe(1);
  },
);

databaseTest(
  'admin round application rejects deckless rows but preserves unknown constructed opponents',
  async () => {
    const userId = `limited-admin-test-${randomUUID()}`;
    const [admin] = await db
      .insert(user)
      .values({
        id: userId,
        name: 'Test admin',
        displayName: userId,
        role: 'admin',
        currency: 'USD',
        email: `${userId}@example.invalid`,
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    userIds.push(userId);
    const app = new Hono<AuthExtension>();
    app.use('*', async (c, next) => {
      c.set('user', admin!);
      await next();
    });
    app.route(
      '/tournaments/:tournamentId/rounds/:round',
      adminTournamentIdRoundApplyMatchesPostRoute,
    );
    const id = await createTournament(1);
    const [ownDeck] = await db
      .insert(deck)
      .values({ userId: 'swubase', format: 1, name: 'Fixture' })
      .returning();
    deckIds.push(ownDeck!.id);
    await db.insert(tournamentDeck).values({
      tournamentId: id,
      deckId: ownDeck!.id,
      topRelativeToPlayerCount: false,
      recordWin: 0,
      recordLose: 0,
      recordDraw: 0,
      points: 0,
    });
    await db.insert(tournamentMatch).values({
      tournamentId: id,
      round: 1,
      p1Username: 'A',
      p1DeckId: ownDeck!.id,
      p1Points: 0,
      p2Username: 'Unknown deck',
      p2DeckId: null,
      p2Points: 0,
      gameWin: 2,
      gameLose: 1,
      gameDraw: 0,
      result: 3,
      isBye: false,
    });
    expect((await app.request(`/tournaments/${id}/rounds/1`, { method: 'POST' })).status).toBe(200);
    expect(
      (await db.select().from(tournamentDeck).where(eq(tournamentDeck.tournamentId, id)))[0],
    ).toMatchObject({ recordWin: 1, points: 3 });
    await db
      .update(tournamentMatch)
      .set({ p1DeckId: null })
      .where(eq(tournamentMatch.tournamentId, id));
    expect((await app.request(`/tournaments/${id}/rounds/1`, { method: 'POST' })).status).toBe(409);
    expect(
      (await db.select().from(tournamentDeck).where(eq(tournamentDeck.tournamentId, id)))[0],
    ).toMatchObject({ recordWin: 1, points: 3 });
  },
);

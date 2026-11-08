import { expect, spyOn, test } from 'bun:test';
import { and, eq, inArray } from 'drizzle-orm';
import { Hono } from 'hono';
import type { AuthExtension } from '../../auth/auth.ts';
import { tournamentWeekendWatchedPlayerRoundsGetRoute } from '../../routes/tournament-weekends/_id/tournament/_tournamentId/watched-player-rounds/get.ts';
import { db } from '../../db';
import { user } from '../../db/schema/auth-schema.ts';
import { deck } from '../../db/schema/deck.ts';
import { tournament } from '../../db/schema/tournament.ts';
import { tournamentDeck } from '../../db/schema/tournament_deck.ts';
import {
  player,
  playerWatch,
  tournamentStanding,
  tournamentWeekend,
  tournamentWeekendMatch,
  tournamentWeekendTournament,
} from '../../db/schema/tournament_weekend.ts';
import { getLiveTournamentHome, getLiveWatchedPlayerRounds } from './tournamentWeekendLiveHome.ts';
import * as liveHome from './tournamentWeekendLiveHome.ts';
import {
  clearLiveTournamentHomeCache,
  createLiveTournamentSummaryPatchEvent,
  createLiveWatchedPlayersPatchEvent,
  getCachedLiveTournamentHomeResponse,
} from './liveTournamentHomeCache.ts';

const enabled = process.env.SWUBASE_WATCHLIST_DB_TEST === '1';
if (enabled) {
  const target = new URL(process.env.DATABASE_URL!);
  if (target.hostname !== '127.0.0.1' || !target.pathname.startsWith('/swubase_'))
    throw new Error('Tests require the isolated worktree database.');
}

test.skipIf(!enabled)(
  'watch history, final placements, account scoping, and live cache refresh',
  async () => {
    const id = crypto.randomUUID();
    const userId = `watch-test-${id}`;
    const eventId = crypto.randomUUID();
    const weekendId = crypto.randomUUID();
    const deckIds = [crypto.randomUUID(), crypto.randomUUID()];
    const names = [`Ari-${id}`, `Mara-${id}`, `Final-only-${id}`];
    const stamp = '2026-11-08T10:30:00Z';
    try {
      await db.insert(user).values({
        id: userId,
        name: 'Watch test',
        displayName: userId,
        currency: 'USD',
        email: `${userId}@example.invalid`,
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await db.insert(player).values(names.map(displayName => ({ displayName })));
      await db
        .insert(playerWatch)
        .values([names[0]!, names[2]!].map(playerDisplayName => ({ userId, playerDisplayName })));
      await db.insert(tournament).values({
        id: eventId,
        userId,
        type: 'pq',
        location: 'FR',
        continent: 'Europe',
        name: 'Watch test',
        attendance: 32,
        format: 1,
        days: 1,
        date: new Date('2026-11-07'),
      });
      await db
        .insert(tournamentWeekend)
        .values({ id: weekendId, date: '2026-11-07', name: 'Watch test' });
      await db.insert(tournamentWeekendTournament).values({
        tournamentWeekendId: weekendId,
        tournamentId: eventId,
        status: 'running',
        roundNumber: 3,
      });
      await db.insert(tournamentStanding).values(
        [1, 2].map(roundNumber => ({
          tournamentId: eventId,
          playerDisplayName: names[0]!,
          roundNumber,
          rank: 5 - roundNumber,
          points: roundNumber * 3,
          gameRecord: '4-1',
          matchRecord: `${roundNumber}-0-0`,
        })),
      );
      await db.insert(tournamentWeekendMatch).values([
        {
          tournamentId: eventId,
          roundNumber: 1,
          matchKey: 'first',
          playerDisplayName1: names[1]!,
          playerDisplayName2: names[0]!,
          player1GameWin: 1,
          player2GameWin: 2,
          updatedAt: stamp,
        },
        {
          tournamentId: eventId,
          roundNumber: 2,
          matchKey: 'bye',
          playerDisplayName1: names[0]!,
          playerDisplayName2: null,
          player1GameWin: 2,
          player2GameWin: null,
        },
        {
          tournamentId: eventId,
          roundNumber: 3,
          matchKey: 'pending',
          playerDisplayName1: names[0]!,
          playerDisplayName2: names[1]!,
          player1GameWin: 0,
          player2GameWin: 0,
        },
      ]);
      const cached = await getCachedLiveTournamentHomeResponse(weekendId, userId);
      const watched = cached.data!.watchedPlayers.find(row => row.displayName === names[0])!
        .tournaments[0]!;
      expect(watched.standing?.roundNumber).toBe(2);
      expect(watched).not.toHaveProperty('matches');
      const rounds = await getLiveWatchedPlayerRounds(weekendId, eventId, names[0]!, userId);
      expect(rounds!.map(row => row.outcome)).toEqual(['win', 'bye', null]);
      expect(rounds![0]!.playerGameWins).toBe(2);
      expect(watched.latestMatch?.roundNumber).toBe(3);
      expect(watched.finalStanding).toBeNull();
      expect((await getLiveTournamentHome(weekendId))!.watchedPlayers).toEqual([]);
      expect((await getLiveTournamentHome(weekendId, 'unrelated-account'))!.watchedPlayers).toEqual(
        [],
      );

      let requestUser: AuthExtension['Variables']['user'] = null;
      const roundsApp = new Hono<AuthExtension>()
        .use('*', async (c, next) => {
          c.set('user', requestUser);
          await next();
        })
        .route(
          '/:id/tournament/:tournamentId/watched-player-rounds',
          tournamentWeekendWatchedPlayerRoundsGetRoute,
        );
      const roundsUrl = `/${weekendId}/tournament/${eventId}/watched-player-rounds?displayName=${encodeURIComponent(names[0]!)}`;
      expect((await roundsApp.request(roundsUrl)).status).toBe(401);
      requestUser = { id: userId } as AuthExtension['Variables']['user'];
      const response = await roundsApp.request(roundsUrl);
      expect(response.status).toBe(200);
      expect((await response.json()).data).toEqual(rounds);
      expect((await roundsApp.request(roundsUrl.replace(weekendId, 'invalid'))).status).toBe(400);
      expect((await roundsApp.request(roundsUrl.split('?')[0]!)).status).toBe(400);
      expect(
        (await roundsApp.request(roundsUrl.replace(eventId, crypto.randomUUID()))).status,
      ).toBe(404);
      expect(
        (await roundsApp.request(roundsUrl.replace(weekendId, crypto.randomUUID()))).status,
      ).toBe(404);
      expect((await roundsApp.request(roundsUrl.replace(names[0]!, names[1]!))).status).toBe(404);
      const emptyResponse = await roundsApp.request(roundsUrl.replace(names[0]!, names[2]!));
      expect(emptyResponse.status).toBe(200);
      expect((await emptyResponse.json()).data).toEqual([]);
      requestUser = { id: 'unrelated-account' } as AuthExtension['Variables']['user'];
      expect((await roundsApp.request(roundsUrl)).status).toBe(404);

      // A match involving two watched players supplies each summary in their own perspective.
      await db.insert(playerWatch).values({ userId, playerDisplayName: names[1]! });
      const bothWatched = await getLiveTournamentHome(weekendId, userId);
      expect(
        bothWatched!.watchedPlayers.find(row => row.displayName === names[1])!.tournaments[0]!
          .latestMatch?.roundNumber,
      ).toBe(3);
      await db
        .delete(playerWatch)
        .where(and(eq(playerWatch.userId, userId), eq(playerWatch.playerDisplayName, names[1]!)));

      await db
        .update(tournamentWeekendMatch)
        .set({ player1GameWin: 2, player2GameWin: 0, updatedAt: stamp })
        .where(
          and(
            eq(tournamentWeekendMatch.tournamentId, eventId),
            eq(tournamentWeekendMatch.matchKey, 'pending'),
          ),
        );
      const progress = await createLiveTournamentSummaryPatchEvent(
        'live_tournament.progress_updated',
        weekendId,
        eventId,
      );
      expect(progress?.data.patch.kind).toBe('tournament_summary');
      expect(JSON.stringify(progress)).not.toContain(names[0]!);
      const refreshed = await getCachedLiveTournamentHomeResponse(weekendId, userId);
      expect(refreshed.data!.resources).toBe(cached.data!.resources);
      expect(refreshed.data!.tournamentGroups).toBe(cached.data!.tournamentGroups);
      expect(refreshed.data!.watchedPlayers[0]!.tournaments[0]!.latestMatch?.outcome).toBe('win');

      // A personal read that overlaps a public update must stay marked stale.
      let releaseRead = () => {};
      let readStarted = () => {};
      const started = new Promise<void>(resolve => {
        readStarted = resolve;
      });
      const blocked = new Promise<void>(resolve => {
        releaseRead = resolve;
      });
      const originalWatched = liveHome.getLiveTournamentHomeWatchedPlayers;
      const watchedSpy = spyOn(
        liveHome,
        'getLiveTournamentHomeWatchedPlayers',
      ).mockImplementationOnce(async (...args) => {
        const result = await originalWatched(...args);
        readStarted();
        await blocked;
        return result;
      });
      try {
        const pendingWatchPatch = createLiveWatchedPlayersPatchEvent(weekendId, userId);
        await started;
        await db
          .update(tournamentWeekendMatch)
          .set({ player1GameWin: 0, player2GameWin: 2 })
          .where(
            and(
              eq(tournamentWeekendMatch.tournamentId, eventId),
              eq(tournamentWeekendMatch.matchKey, 'pending'),
            ),
          );
        await createLiveTournamentSummaryPatchEvent(
          'live_tournament.progress_updated',
          weekendId,
          eventId,
        );
        releaseRead();
        await pendingWatchPatch;
        const afterRace = await getCachedLiveTournamentHomeResponse(weekendId, userId);
        expect(afterRace.data!.watchedPlayers[0]!.tournaments[0]!.latestMatch?.outcome).toBe(
          'loss',
        );
      } finally {
        releaseRead();
        watchedSpy.mockRestore();
      }

      // An expired full rebuild must not overwrite a newer private watchlist patch.
      const realNow = Date.now();
      const clock = spyOn(Date, 'now').mockReturnValue(realNow + 60_000);
      let releaseFullRead = () => {};
      let fullReadStarted = () => {};
      const fullStarted = new Promise<void>(resolve => {
        fullReadStarted = resolve;
      });
      const fullBlocked = new Promise<void>(resolve => {
        releaseFullRead = resolve;
      });
      const originalHome = liveHome.getLiveTournamentHome;
      const homeSpy = spyOn(liveHome, 'getLiveTournamentHome').mockImplementationOnce(
        async (...args) => {
          const result = await originalHome(...args);
          fullReadStarted();
          await fullBlocked;
          return result;
        },
      );
      try {
        const rebuilding = getCachedLiveTournamentHomeResponse(weekendId, userId);
        await fullStarted;
        await db
          .delete(playerWatch)
          .where(and(eq(playerWatch.userId, userId), eq(playerWatch.playerDisplayName, names[2]!)));
        await createLiveWatchedPlayersPatchEvent(weekendId, userId);
        releaseFullRead();
        expect((await rebuilding).data!.watchlist).toHaveLength(1);
      } finally {
        releaseFullRead();
        homeSpy.mockRestore();
        clock.mockRestore();
      }
      await db.insert(playerWatch).values({ userId, playerDisplayName: names[2]! });
      await createLiveWatchedPlayersPatchEvent(weekendId, userId);

      await db.insert(deck).values(deckIds.map(id => ({ id, userId, format: 1 })));
      await db.insert(tournamentDeck).values(
        deckIds.map((deckId, index) => ({
          tournamentId: eventId,
          deckId,
          placement: index + 1,
          topRelativeToPlayerCount: true,
          recordWin: 3,
          recordLose: index,
          recordDraw: 0,
          points: 9,
          meleePlayerUsername: ` ${names[index === 0 ? 0 : 2]!.toUpperCase()} `,
        })),
      );
      await db.update(tournament).set({ imported: true }).where(eq(tournament.id, eventId));
      await db
        .update(tournamentWeekendTournament)
        .set({ status: 'finished' })
        .where(eq(tournamentWeekendTournament.tournamentId, eventId));
      await createLiveTournamentSummaryPatchEvent('tournament_import.finished', weekendId, eventId);
      const final = (await getCachedLiveTournamentHomeResponse(weekendId, userId)).data!;
      expect(final.watchedPlayers[0]!.tournaments[0]!.finalStanding).toEqual({
        placement: 1,
        matchRecord: '3-0-0',
        points: 9,
      });
      expect(final.watchedPlayers[1]!.tournaments[0]!.finalStanding?.placement).toBe(2);
      expect(await getLiveWatchedPlayerRounds(weekendId, eventId, names[2]!, userId)).toEqual([]);
    } finally {
      clearLiveTournamentHomeCache(weekendId);
      await db.delete(tournamentDeck).where(eq(tournamentDeck.tournamentId, eventId));
      await db.delete(tournamentWeekend).where(eq(tournamentWeekend.id, weekendId));
      await db.delete(tournament).where(eq(tournament.id, eventId));
      await db.delete(deck).where(inArray(deck.id, deckIds));
      await db.delete(player).where(inArray(player.displayName, names));
      await db.delete(user).where(eq(user.id, userId));
    }
  },
);

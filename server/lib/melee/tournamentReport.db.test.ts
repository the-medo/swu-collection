// SWUBASE_MELEE_DB_TEST=1 bun --env-file=.env --env-file=.env.worktree test server/lib/melee/tournamentReport.db.test.ts
import { afterAll, expect, test } from 'bun:test';
import { randomInt, randomUUID } from 'node:crypto';
import { eq, inArray } from 'drizzle-orm';
import { db } from '../../db';
import { user } from '../../db/schema/auth-schema.ts';
import { meleeConnection } from '../../db/schema/melee_connection.ts';
import { userMeleeTournaments } from '../../db/schema/user_melee_tournaments.ts';
import { tournament } from '../../db/schema/tournament.ts';
import { tournamentDeck } from '../../db/schema/tournament_deck.ts';
import { tournamentMatch } from '../../db/schema/tournament_match.ts';
import { deck } from '../../db/schema/deck.ts';
import { deckCard } from '../../db/schema/deck_card.ts';
import { createTournamentReportService } from './tournamentReport.ts';

const databaseTest = test.skipIf(process.env.SWUBASE_MELEE_DB_TEST !== '1');
if (process.env.SWUBASE_MELEE_DB_TEST === '1') {
  const target = new URL(process.env.DATABASE_URL!);
  if (target.hostname !== '127.0.0.1' || !target.pathname.startsWith('/swubase_'))
    throw new Error('Tests require the isolated worktree database.');
}
const userId = `tournament-report-test-${randomUUID()}`;
const eventId = randomUUID();
const ownDeckId = randomUUID();
const opponentDeckId = randomUUID();
const ambiguousDeckId = randomUUID();
const deckIds = [ownDeckId, opponentDeckId, ambiguousDeckId];
let seeded = false;
afterAll(async () => {
  if (!seeded) return;
  await db.delete(tournamentMatch).where(eq(tournamentMatch.tournamentId, eventId));
  await db.delete(tournamentDeck).where(eq(tournamentDeck.tournamentId, eventId));
  await db.delete(deckCard).where(inArray(deckCard.deckId, deckIds));
  await db.delete(deck).where(inArray(deck.id, deckIds));
  await db.delete(tournament).where(eq(tournament.id, eventId));
  await db.delete(user).where(eq(user.id, userId));
});
databaseTest(
  'report uses owned history, historical placement matching, both player positions, and public decks only',
  async () => {
    seeded = true;
    await db.insert(user).values({
      id: userId,
      name: 'Report test',
      displayName: userId,
      currency: 'USD',
      email: `${userId}@example.invalid`,
      emailVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const service = createTournamentReportService(db);
    await expect(service.get(userId, eventId)).rejects.toMatchObject({ status: 409 });
    await db.insert(meleeConnection).values({
      userId,
      meleeUserId: randomUUID(),
      username: 'report-test-account',
      displayName: 'Author',
    });
    await expect(service.get(userId, eventId)).rejects.toMatchObject({ status: 404 });
    const meleeId = randomInt(1_800_000_000, 2_000_000_000);
    await db.insert(tournament).values({
      id: eventId,
      userId,
      type: 'pq',
      location: 'Test',
      continent: 'Europe',
      name: 'Report fixture',
      attendance: 32,
      meleeId: String(meleeId),
      format: 1,
      days: 1,
      date: new Date('2026-10-10'),
    });
    await db.insert(userMeleeTournaments).values({
      userId,
      tournamentId: eventId,
      meleeId,
      meleePlacement: 7,
      name: 'Report fixture',
      date: new Date('2026-10-10'),
      attendance: 32,
      record: '2-0-1',
      status: 4,
      refreshedAt: new Date(),
    });
    await db.insert(deck).values([
      {
        id: ownDeckId,
        userId,
        format: 1,
        public: 1,
        name: 'Author deck',
        leaderCardId1: 'sabine-wren--galvanized-revolutionary',
        baseCardId: 'energy-conversion-lab',
      },
      {
        id: opponentDeckId,
        userId,
        format: 1,
        public: 0,
        name: 'Private opponent deck',
        leaderCardId1: 'secret-leader',
        baseCardId: 'secret-base',
      },
      { id: ambiguousDeckId, userId, format: 1, public: 0, name: 'Tied candidate' },
    ]);
    await db.insert(tournamentDeck).values({
      tournamentId: eventId,
      deckId: ownDeckId,
      placement: 7,
      meleePlayerUsername: 'Historic display name',
      topRelativeToPlayerCount: false,
      recordWin: 2,
      recordLose: 0,
      recordDraw: 1,
      points: 7,
    });
    await db
      .insert(deckCard)
      .values({ deckId: ownDeckId, cardId: 'battlefield-marine', board: 1, quantity: 3 });
    expect((await service.get(userId, eventId)).hasMetaDecks).toBe(false);
    await db.update(tournament).set({ imported: true }).where(eq(tournament.id, eventId));
    await db.insert(tournamentMatch).values([
      {
        tournamentId: eventId,
        round: 1,
        p1Username: 'Author',
        p1DeckId: ownDeckId,
        p1Points: 0,
        p2Username: 'Opponent',
        p2DeckId: null,
        p2Points: 0,
        gameWin: 2,
        gameLose: 0,
        gameDraw: 0,
        result: 3,
        isBye: false,
      },
      {
        tournamentId: eventId,
        round: 1,
        p1Username: 'Renamed opponent',
        p1DeckId: opponentDeckId,
        p1Points: 0,
        p2Username: 'Author',
        p2DeckId: ownDeckId,
        p2Points: 0,
        gameWin: 0,
        gameLose: 2,
        gameDraw: 0,
        result: 0,
        isBye: false,
      },
      {
        tournamentId: eventId,
        round: 2,
        p1Username: 'Opponent',
        p1DeckId: opponentDeckId,
        p1Points: 3,
        p2Username: 'Author',
        p2DeckId: ownDeckId,
        p2Points: 3,
        gameWin: 1,
        gameLose: 1,
        gameDraw: 0,
        result: 1,
        isBye: false,
      },
      {
        tournamentId: eventId,
        round: 3,
        p1Username: 'Author',
        p1DeckId: ownDeckId,
        p1Points: 4,
        gameWin: 0,
        gameLose: 0,
        gameDraw: 0,
        result: 0,
        isBye: true,
      },
    ]);
    const result = await service.get(userId, eventId);
    expect(result.hasMetaDecks).toBe(true);
    expect(result.deck).toMatchObject({
      id: ownDeckId,
      hasDecklist: true,
      leaderId: 'sabine-wren--galvanized-revolutionary',
    });
    expect(result.rounds.map(round => round.outcome)).toEqual(['win', 'draw', 'bye']);
    expect(result.rounds[1]!.opponentName).toBe('Opponent');
    expect(result.rounds[2]!.record).toEqual({ wins: 2, losses: 0, draws: 1 });
    expect(result.rounds.every(round => round.opponentDeck === null)).toBe(true);
    expect(JSON.stringify(result)).not.toContain('secret');
    expect(JSON.stringify(result)).not.toContain(opponentDeckId);
    await expect(service.get(userId, randomUUID())).rejects.toMatchObject({ status: 404 });

    await db.update(deck).set({ public: 2 }).where(eq(deck.id, opponentDeckId));
    const unlistedOpponent = await service.get(userId, eventId);
    expect(unlistedOpponent.rounds.every(round => round.opponentDeck === null)).toBe(true);
    await db.update(deck).set({ public: 1 }).where(eq(deck.id, opponentDeckId));
    const publicOpponent = await service.get(userId, eventId);
    expect(publicOpponent.rounds[0]!.opponentDeck).toMatchObject({
      id: opponentDeckId,
      hasDecklist: false,
    });
    await db.update(deck).set({ public: 2 }).where(eq(deck.id, ownDeckId));
    const unlistedOwn = await service.get(userId, eventId);
    expect(unlistedOwn.deck).toBeNull();
    expect(unlistedOwn.hasMetaDecks).toBe(false);
    await db.update(deck).set({ public: 0 }).where(eq(deck.id, ownDeckId));
    const privateOwn = await service.get(userId, eventId);
    expect(privateOwn.deck).toBeNull();
    expect(privateOwn.rounds).toHaveLength(3);
    expect(privateOwn.hasMetaDecks).toBe(false);
    await db.update(deck).set({ public: 1 }).where(eq(deck.id, ownDeckId));
    await db.update(deckCard).set({ quantity: 0 }).where(eq(deckCard.deckId, ownDeckId));
    expect((await service.get(userId, eventId)).hasMetaDecks).toBe(false);
    await db.update(deckCard).set({ quantity: 3 }).where(eq(deckCard.deckId, ownDeckId));

    // A tied placement must not silently select another player's deck or rounds.
    await db.insert(tournamentDeck).values({
      tournamentId: eventId,
      deckId: ambiguousDeckId,
      placement: 7,
      meleePlayerUsername: 'Another historic name',
      topRelativeToPlayerCount: false,
      recordWin: 2,
      recordLose: 0,
      recordDraw: 1,
      points: 7,
    });
    const ambiguous = await service.get(userId, eventId);
    expect(ambiguous.deck).toBeNull();
    expect(ambiguous.rounds).toEqual([]);
    expect(ambiguous.hasMetaDecks).toBe(true);
  },
);

// CARD_STATS_DB_TEST=1 bun --env-file=.env.worktree test server/routes/card-stats/deck-counts.db.test.ts
import { expect, test } from 'bun:test';
import { inArray, eq } from 'drizzle-orm';
import { db } from '../../db';
import { user } from '../../db/schema/auth-schema.ts';
import { meta } from '../../db/schema/meta.ts';
import { tournament } from '../../db/schema/tournament.ts';
import { deck } from '../../db/schema/deck.ts';
import { deckCard } from '../../db/schema/deck_card.ts';
import { tournamentDeck } from '../../db/schema/tournament_deck.ts';
import { cardStatsDeckCountsRoute } from './deck-counts.ts';

test.skipIf(process.env.CARD_STATS_DB_TEST !== '1')(
  'whole-meta counts include all tournament entries, normalize bases, and ignore card copies',
  async () => {
    const database = new URL(process.env.DATABASE_URL!);
    if (database.hostname !== '127.0.0.1' || !database.pathname.startsWith('/swubase_')) {
      throw new Error('Select an isolated worktree database.');
    }
    const userId = `card-stats-${crypto.randomUUID()}`;
    const tournamentIds = Array.from({ length: 3 }, () => crypto.randomUUID());
    const deckIds = Array.from({ length: 5 }, () => crypto.randomUUID());
    let metaIds: number[] = [];
    try {
      await db
        .insert(user)
        .values({
          id: userId,
          name: 'Card stats test',
          email: `${userId}@invalid.local`,
          emailVerified: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          displayName: userId,
          currency: 'USD',
        });
      metaIds = (
        await db
          .insert(meta)
          .values(
            [0, 1].map(index => ({
              name: `${userId}-${index}`,
              set: 'sor',
              format: 1,
              season: 1,
              date: '2025-01-01',
            })),
          )
          .returning({ id: meta.id })
      ).map(row => row.id);
      await db.insert(tournament).values(
        tournamentIds.map((id, index) => ({
          id,
          userId,
          name: userId,
          type: index === 1 ? 'sq' : 'pq',
          location: 'FR',
          continent: 'Europe',
          attendance: 200,
          format: 1,
          meta: metaIds[index === 2 ? 1 : 0],
          days: 1,
          date: new Date('2025-01-01'),
          imported: true,
        })),
      );
      await db.insert(deck).values(
        deckIds.map((id, index) => ({
          id,
          userId,
          format: 1,
          leaderCardId1: index === 4 ? null : index === 2 ? 'leader-b' : 'leader-a',
          baseCardId: index === 3 ? null : index === 1 ? 'command-center' : 'echo-base',
        })),
      );
      // A deck used at two events counts twice. Unknown decks and another meta do not count.
      const entries = [
        [0, 0],
        [0, 1],
        [0, 3],
        [0, 4],
        [1, 0],
        [1, 2],
        [2, 1],
      ];
      await db.insert(tournamentDeck).values(
        entries.map(([event, list]) => ({
          tournamentId: tournamentIds[event],
          deckId: deckIds[list],
          topRelativeToPlayerCount: false,
          recordWin: 0,
          recordLose: 0,
          recordDraw: 0,
          points: 0,
        })),
      );
      await db.insert(deckCard).values([
        { deckId: deckIds[0], cardId: 'test-card', board: 1, quantity: 2 },
        { deckId: deckIds[0], cardId: 'test-card', board: 2, quantity: 1 },
      ]);

      const response = await cardStatsDeckCountsRoute.request(`/?meta_id=${metaIds[0]}`);
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        data: {
          totalDeckCount: 4,
          byLeader: { 'leader-a': 3, 'leader-b': 1 },
          byLeaderBase: { 'leader-a|Command': 3, 'leader-b|Command': 1 },
        },
      });
      for (const query of ['', '?meta_id=0', '?meta_id=-1', '?meta_id=abc', '?meta_id=1.5']) {
        expect((await cardStatsDeckCountsRoute.request(`/${query}`)).status).toBe(400);
      }
      expect(await (await cardStatsDeckCountsRoute.request('/?meta_id=2147483647')).json()).toEqual(
        { data: { totalDeckCount: 0, byLeader: {}, byLeaderBase: {} } },
      );
    } finally {
      await db.delete(deckCard).where(inArray(deckCard.deckId, deckIds));
      await db.delete(tournamentDeck).where(inArray(tournamentDeck.tournamentId, tournamentIds));
      await db.delete(deck).where(inArray(deck.id, deckIds));
      await db.delete(tournament).where(inArray(tournament.id, tournamentIds));
      if (metaIds.length) await db.delete(meta).where(inArray(meta.id, metaIds));
      await db.delete(user).where(eq(user.id, userId));
    }
  },
);

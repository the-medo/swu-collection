// CARD_DECKS_DB_TEST=1 bun --env-file=.env --env-file=.env.worktree test server/routes/decks/card/_cardId/get.db.test.ts
import { expect, test } from 'bun:test';
import { Hono } from 'hono';
import { inArray } from 'drizzle-orm';
import type { AuthExtension } from '../../../../auth/auth.ts';
import { db } from '../../../../db';
import { user } from '../../../../db/schema/auth-schema.ts';
import { deck } from '../../../../db/schema/deck.ts';
import { deckCard } from '../../../../db/schema/deck_card.ts';
import { cardPoolCards, cardPools } from '../../../../db/schema/card_pool.ts';
import { cardPoolDeckCards, cardPoolDecks } from '../../../../db/schema/card_pool_deck.ts';
import { entityPrice } from '../../../../db/schema/entity_price.ts';
import { decksForCardGetRoute } from './get.ts';

test.skipIf(process.env.CARD_DECKS_DB_TEST !== '1')(
  'card decks lookup returns ten distinct recent public decks, using actual normal and limited deck contents',
  async () => {
    const database = new URL(process.env.DATABASE_URL!);
    if (database.hostname !== '127.0.0.1' || !database.pathname.startsWith('/swubase_')) {
      throw new Error('Select an isolated worktree database.');
    }
    const userId = `card-decks-${crypto.randomUUID()}`;
    const cardId = `card-decks-${crypto.randomUUID()}`;
    const leaderId = `${cardId}-leader`;
    const secondLeaderId = `${cardId}-leader-2`;
    const baseId = `${cardId}-base`;
    const poolId = crypto.randomUUID();
    const newest = Date.now();
    const fixtures: (typeof deck.$inferInsert)[] = Array.from({ length: 23 }, (_, index) => ({
      id: crypto.randomUUID(),
      userId,
      format: 1,
      name: `Card decks fixture ${index}`,
      public: index === 13 ? 0 : index === 14 ? 2 : 1,
      updatedAt: new Date(newest - (index === 8 ? 7 : index) * 60_000),
      leaderCardId1: index === 21 ? leaderId : null,
      leaderCardId2: index === 21 ? secondLeaderId : null,
      baseCardId: index === 22 ? baseId : null,
      cardPoolId: index >= 18 && index <= 20 ? poolId : null,
    }));
    // A limited deck uses its pool rows even if a stale normal-deck row exists.
    fixtures[18].updatedAt = new Date(newest + 60_000);
    const deckIds = fixtures.map(item => item.id!);
    let viewer: NonNullable<AuthExtension['Variables']['user']> | null = null;
    const app = new Hono<AuthExtension>()
      .use('*', async (c, next) => {
        c.set('user', viewer);
        await next();
      })
      .route('/deck/card/:cardId', decksForCardGetRoute);
    const request = (id = cardId, query = '') =>
      app.request(`/deck/card/${encodeURIComponent(id)}${query}`);
    const ids = (result: { data: { deck: { id: string } }[] }) =>
      result.data.map(item => item.deck.id);

    try {
      await db.insert(user).values({
        id: userId,
        name: 'Deck lookup fixture',
        displayName: 'Public deck owner',
        email: `${userId}@invalid.local`,
        emailVerified: false,
        currency: 'USD',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await db.insert(cardPools).values({ id: poolId, userId, visibility: 'private' });
      await db.insert(deck).values(fixtures);
      await db.insert(deckCard).values([
        ...deckIds.slice(0, 18).map((deckId, index) => ({
          deckId,
          cardId,
          board: index === 16 ? 3 : index === 1 ? 2 : 1,
          quantity: index === 15 ? 0 : index === 17 ? -1 : 2,
        })),
        { deckId: deckIds[0], cardId, board: 2, quantity: 3 },
        { deckId: deckIds[0], cardId, board: 3, quantity: 4 },
        { deckId: deckIds[19], cardId, board: 1, quantity: 5 },
      ]);
      await db.insert(cardPoolDecks).values(
        deckIds.slice(18, 21).map(deckId => ({
          deckId,
          cardPoolId: poolId,
          userId,
          visibility: 'public' as const,
        })),
      );
      await db.insert(cardPoolCards).values([
        { cardPoolId: poolId, cardPoolNumber: 1, cardId },
        { cardPoolId: poolId, cardPoolNumber: 2, cardId },
      ]);
      await db.insert(cardPoolDeckCards).values([
        { deckId: deckIds[18], cardPoolNumber: 1, location: 'deck' },
        { deckId: deckIds[18], cardPoolNumber: 2, location: 'deck' },
        { deckId: deckIds[19], cardPoolNumber: 1, location: 'pool' },
        { deckId: deckIds[20], cardPoolNumber: 1, location: 'trash' },
      ]);
      await db.insert(entityPrice).values([
        { entityId: deckIds[18], sourceType: 'cardmarket', type: 'deck', price: '25.50' },
        { entityId: deckIds[18], sourceType: 'tcgplayer', type: 'collection', price: '30.00' },
      ]);
      const before = await db.select().from(deck).where(inArray(deck.id, deckIds));
      const expected = [...fixtures.slice(0, 13), fixtures[18]]
        .sort(
          (a, b) => b.updatedAt!.getTime() - a.updatedAt!.getTime() || a.id!.localeCompare(b.id!),
        )
        .slice(0, 10)
        .map(item => item.id!);

      const response = await request(cardId, '?limit=100&public=0&order=asc&variantId=ignored');
      expect(response.status).toBe(200);
      expect(response.headers.get('Cache-Control')).toBe('no-store');
      const result = await response.json();
      expect(ids(result)).toEqual(expected);
      expect(new Set(ids(result)).size).toBe(10);
      expect(
        result.data.every((item: { deck: { public: number } }) => item.deck.public === 1),
      ).toBe(true);
      expect(result.data[0].user).toEqual({ id: userId, displayName: 'Public deck owner' });
      expect(result.data[0].entityPrices).toHaveLength(1);
      expect(result.data[0].entityPrices[0].price).toBe('25.50');
      expect(result.data[0].deck.updatedAt).toBe(fixtures[18].updatedAt!.toISOString());
      expect(ids(await (await request(leaderId)).json())).toEqual([deckIds[21]]);
      expect(ids(await (await request(secondLeaderId)).json())).toEqual([deckIds[21]]);
      expect(ids(await (await request(baseId)).json())).toEqual([deckIds[22]]);

      for (const role of ['user', 'admin']) {
        viewer = { id: userId, role } as NonNullable<AuthExtension['Variables']['user']>;
        expect(ids(await (await request(cardId, `?userId=${userId}`)).json())).toEqual(expected);
      }
      expect((await (await request(`${cardId}-missing`)).json()).data).toEqual([]);
      expect((await (await request("' OR 1=1 --")).json()).data).toEqual([]);
      for (const invalid of [' ', 'x'.repeat(256)]) {
        expect((await request(invalid)).status).toBe(400);
      }
      // Filtering also holds after the limit no longer masks excluded rows.
      await db.delete(deckCard).where(inArray(deckCard.deckId, deckIds.slice(0, 13)));
      expect(ids(await (await request()).json())).toEqual([deckIds[18]]);
      expect(await db.select().from(deck).where(inArray(deck.id, deckIds))).toEqual(before);
    } finally {
      await db.delete(entityPrice).where(inArray(entityPrice.entityId, deckIds));
      await db.delete(cardPoolDeckCards).where(inArray(cardPoolDeckCards.deckId, deckIds));
      await db.delete(cardPoolDecks).where(inArray(cardPoolDecks.deckId, deckIds));
      await db.delete(cardPoolCards).where(inArray(cardPoolCards.cardPoolId, [poolId]));
      await db.delete(deckCard).where(inArray(deckCard.deckId, deckIds));
      await db.delete(deck).where(inArray(deck.id, deckIds));
      await db.delete(cardPools).where(inArray(cardPools.id, [poolId]));
      await db.delete(user).where(inArray(user.id, [userId]));
    }
  },
);

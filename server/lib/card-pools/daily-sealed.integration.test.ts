import { expect, test } from 'bun:test';
import { and, eq, inArray } from 'drizzle-orm';
import { Hono } from 'hono';
import type { AuthExtension } from '../../auth/auth.ts';
import { db } from '../../db';
import { cardList } from '../../db/lists.ts';
import { user } from '../../db/schema/auth-schema.ts';
import { cardPools, cardPoolCards } from '../../db/schema/card_pool.ts';
import { cardPoolDeckCards, cardPoolDecks } from '../../db/schema/card_pool_deck.ts';
import { deck } from '../../db/schema/deck.ts';
import { dailyCardPoolGetRoute } from '../../routes/card-pools/daily/get.ts';
import { cardPoolsIdDecksPostRoute } from '../../routes/card-pools/_id/decks/post.ts';
import { cardPoolsIdDecksGetRoute } from '../../routes/card-pools/_id/decks/get.ts';
import { cardPoolsIdDecksDeckIdPatchRoute } from '../../routes/card-pools/_id/decks/_deckId/patch.ts';
import { cardPoolsIdDecksDeckIdCardPatchRoute } from '../../routes/card-pools/_id/decks/_deckId/card/patch.ts';
import { generateDailySealedPool, getDailySealedPool } from './daily-sealed.ts';
import { getDailySealedDate } from '../../../shared/types/dailySealed.ts';

const enabled = process.env.SWUBASE_DAILY_SEALED_DB_TEST === '1';
if (enabled) {
  const database = new URL(process.env.DATABASE_URL!);
  if (database.hostname !== '127.0.0.1' || !database.pathname.startsWith('/swubase_'))
    throw new Error('Daily sealed tests require an isolated worktree database.');
}

test.skipIf(!enabled)(
  'daily generation is atomic under retries and only public pool/deck data reaches the homepage',
  async () => {
    const date = '2098-06-12';
    const ids = [crypto.randomUUID(), crypto.randomUUID()];
    const pools: string[] = [];
    const decks: string[] = [];
    const app = (userId?: string) =>
      new Hono<AuthExtension>()
        .use('*', async (c, next) => {
          c.set(
            'user',
            userId ? ({ id: userId } as NonNullable<AuthExtension['Variables']['user']>) : null,
          );
          await next();
        })
        .route('/daily', dailyCardPoolGetRoute)
        .route('/:id/decks', cardPoolsIdDecksPostRoute)
        .route('/:id/decks', cardPoolsIdDecksGetRoute)
        .route('/:id/decks/:deckId/card', cardPoolsIdDecksDeckIdCardPatchRoute)
        .route('/:id/decks/:deckId', cardPoolsIdDecksDeckIdPatchRoute);
    const owner = app(ids[0]);
    const viewer = app();
    const read = async () => (await (await viewer.request(`/daily?date=${date}`)).json()).data;
    const create = async (poolId: string, visibility?: string, userId = ids[0]) => {
      const response = await app(userId).request(`/${poolId}/decks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: `Test ${visibility ?? 'default'} deck`, visibility }),
      });
      expect(response.status).toBe(201);
      const { data } = await response.json();
      decks.push(data.deck.id);
      expect(data.createdCardsCount).toBe(120);
      return data.deck.id as string;
    };

    expect((await db.select().from(cardPools).where(eq(cardPools.dailyDate, date))).length).toBe(0);
    try {
      expect(await read()).toMatchObject({ date, today: getDailySealedDate(), pool: null });
      const current = (await (await viewer.request('/daily')).json()).data;
      expect(current.today).toBe(getDailySealedDate());
      expect(current.date).toBe(current.today);
      expect((await viewer.request('/daily?date=2026-02-30')).status).toBe(400);
      expect((await viewer.request('/daily?date=not-a-date')).status).toBe(400);
      const runs = await Promise.all(
        Array.from({ length: 5 }, () => generateDailySealedPool({ date })),
      );
      const pool = runs[0]!.pool;
      pools.push(pool.id);
      expect(runs.filter(run => run.created)).toHaveLength(1);
      expect(new Set(runs.map(run => run.pool.id)).size).toBe(1);
      expect(pool).toMatchObject({
        userId: 'swubase',
        visibility: 'public',
        type: 'sealed',
        status: 'ready',
        dailyDate: date,
      });
      const cards = await db
        .select()
        .from(cardPoolCards)
        .where(eq(cardPoolCards.cardPoolId, pool.id));
      expect(cards).toHaveLength(120);
      expect(new Set(cards.map(c => c.cardPoolNumber)).size).toBe(120);
      expect(cards.every(c => !!cardList[c.cardId])).toBe(true);
      expect(cards.filter(c => cardList[c.cardId]?.type === 'Leader')).toHaveLength(8);
      expect((await generateDailySealedPool({ date, set: 'law' })).created).toBe(false);
      expect(
        await db.select().from(cardPoolCards).where(eq(cardPoolCards.cardPoolId, pool.id)),
      ).toEqual(cards);
      expect(
        (await read()).pool.leaders.reduce(
          (total: number, leader: { copies: number }) => total + leader.copies,
          0,
        ),
      ).toBe(8);

      await db.insert(user).values(
        ids.map(id => ({
          id,
          name: id,
          displayName: id,
          email: `${id}@invalid.local`,
          emailVerified: false,
          currency: 'USD',
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
      );
      const publicDeck = await create(pool.id, 'public');
      const secondPublicDeck = await create(pool.id, 'public', ids[1]);
      const privateDeck = await create(pool.id, 'private');
      const unlistedDeck = await create(pool.id, 'unlisted');
      const secondPool = await generateDailySealedPool({ date: '2098-06-13' });
      if (secondPool.created) pools.push(secondPool.pool.id);
      await create(secondPool.pool.id, 'public');

      // Newly created public decks are drafts; 30 main cards and both selections
      // are required. Cards in the remaining pool/trash and leaders don't count.
      const mainCards = cards.filter(c =>
        ['Unit', 'Upgrade', 'Event'].includes(cardList[c.cardId]!.type),
      );
      const leader = cards.find(c => cardList[c.cardId]?.type === 'Leader')!;
      const base = Object.values(cardList).find(c => c?.type === 'Base')!;
      const complete = async (id: string, mainCount: number) => {
        await db
          .update(deck)
          .set({ leaderCardId1: leader.cardId, baseCardId: base.cardId })
          .where(eq(deck.id, id));
        await db
          .update(cardPoolDeckCards)
          .set({ location: 'pool' })
          .where(eq(cardPoolDeckCards.deckId, id));
        await db
          .update(cardPoolDeckCards)
          .set({ location: 'trash' })
          .where(
            and(
              eq(cardPoolDeckCards.deckId, id),
              inArray(
                cardPoolDeckCards.cardPoolNumber,
                mainCards.slice(35, 45).map(c => c.cardPoolNumber),
              ),
            ),
          );
        await db
          .update(cardPoolDeckCards)
          .set({ location: 'deck' })
          .where(
            and(
              eq(cardPoolDeckCards.deckId, id),
              inArray(
                cardPoolDeckCards.cardPoolNumber,
                mainCards.slice(0, mainCount).map(c => c.cardPoolNumber),
              ),
            ),
          );
      };
      expect((await read()).pool.decks).toHaveLength(0);
      await complete(publicDeck, 29);
      await db
        .update(cardPoolDeckCards)
        .set({ location: 'deck' })
        .where(
          and(
            eq(cardPoolDeckCards.deckId, publicDeck),
            eq(cardPoolDeckCards.cardPoolNumber, leader.cardPoolNumber),
          ),
        );
      expect((await read()).pool.decks).toHaveLength(0);
      await complete(publicDeck, 30);
      expect((await read()).pool.decks.map((d: { id: string }) => d.id)).toEqual([publicDeck]);
      for (const incomplete of [
        { baseCardId: null },
        { leaderCardId1: null },
        { baseCardId: '' },
      ]) {
        await db.update(deck).set(incomplete).where(eq(deck.id, publicDeck));
        expect((await read()).pool.decks).toHaveLength(0);
        await complete(publicDeck, 30);
      }
      await complete(secondPublicDeck, 31);
      await complete(privateDeck, 32);
      await complete(unlistedDeck, 33);

      // Filter before limiting, so a run of newer drafts cannot bury completed builds.
      const drafts: string[] = [];
      for (let i = 0; i < 13; i++) drafts.push(await create(pool.id, 'public'));
      expect((await read()).pool.decks.map((d: { id: string }) => d.id)).toEqual([
        secondPublicDeck,
        publicDeck,
      ]);
      expect((await read()).pool.publicDeckCount).toBe(15);
      await db.delete(cardPoolDeckCards).where(inArray(cardPoolDeckCards.deckId, drafts));
      await db.delete(cardPoolDecks).where(inArray(cardPoolDecks.deckId, drafts));
      await db.delete(deck).where(inArray(deck.id, drafts));

      const payload = await read();
      expect(payload.today).toBe(getDailySealedDate());
      expect(payload.date).toBe(date);
      expect(payload.nextRefreshAt).toBe('2098-06-13T00:00:00.000Z');
      expect(payload.pool.publicDeckCount).toBe(2);
      expect(payload.pool.builderCount).toBe(2);
      expect(payload.pool.decks).toHaveLength(2);
      expect(payload.pool.decks.some((d: { id: string }) => d.id === privateDeck)).toBe(false);
      expect(JSON.stringify(payload)).not.toContain('@invalid.local');
      expect((await (await owner.request(`/daily?date=${date}`)).json()).data).toEqual(payload);

      // Personal attempts use the authenticated deck endpoint, never the public gallery.
      const ownDecks = await (await owner.request(`/${pool.id}/decks?userId=${ids[0]}`)).json();
      expect(
        ownDecks.data.some((item: { deck: { id: string } }) => item.deck.id === privateDeck),
      ).toBe(true);
      expect(
        ownDecks.data.every((item: { deck: { userId: string } }) => item.deck.userId === ids[0]),
      ).toBe(true);
      for (const client of [viewer, app(ids[1])]) {
        const otherDecks = await (
          await client.request(`/${pool.id}/decks?userId=${ids[0]}`)
        ).json();
        expect(
          otherDecks.data.every((item: { deck: { public: number } }) => item.deck.public === 1),
        ).toBe(true);
      }

      // Resuming an older attempt must make it the "Open your build" destination.
      await db
        .update(deck)
        .set({ updatedAt: new Date('2000-01-01T00:00:00Z') })
        .where(and(eq(deck.cardPoolId, pool.id), eq(deck.userId, ids[0]!)));
      await db
        .update(deck)
        .set({ updatedAt: new Date('2001-01-01T00:00:00Z') })
        .where(eq(deck.id, unlistedDeck));
      const latestBuild = async () => {
        const response = await owner.request(
          `/${pool.id}/decks?userId=${ids[0]}&sort=updated_at&order=desc&limit=1`,
        );
        expect(response.status).toBe(200);
        return (await response.json()).data[0].deck.id;
      };
      const moveCard = (
        client = owner,
        poolId = pool.id,
        cardPoolNumber = mainCards[0]!.cardPoolNumber,
      ) =>
        client.request(`/${poolId}/decks/${privateDeck}/card`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cardPoolNumbers: [cardPoolNumber], location: 'pool' }),
        });
      expect(await latestBuild()).toBe(unlistedDeck);
      expect((await moveCard()).status).toBe(200);
      expect(await latestBuild()).toBe(privateDeck);
      const [edited] = await db.select().from(deck).where(eq(deck.id, privateDeck));
      expect((await moveCard(viewer)).status).toBe(401);
      expect((await moveCard(app(ids[1]))).status).toBe(403);
      expect((await moveCard(owner, secondPool.pool.id)).status).toBe(404);
      expect((await moveCard(owner, pool.id, 9999)).status).toBe(404);
      const [afterRejectedEdits] = await db.select().from(deck).where(eq(deck.id, privateDeck));
      expect(afterRejectedEdits!.updatedAt).toEqual(edited!.updatedAt);

      // A late generation keeps the latest eligible pool playable and honestly dated.
      const now = new Date('2098-06-15T12:00:00Z');
      const fallback = await getDailySealedPool(undefined, now);
      expect(fallback).toMatchObject({
        date: '2098-06-15',
        today: '2098-06-15',
        pool: { id: secondPool.pool.id, date: '2098-06-13' },
      });
      expect(fallback.availableDates.slice(0, 2)).toEqual(['2098-06-13', date]);
      expect((await getDailySealedPool(date, now)).pool?.id).toBe(pool.id);
      expect((await getDailySealedPool('2098-06-14', now)).pool).toBeNull();
      // Future pools never appear in today's fallback or in the available-date calendar.
      expect((await getDailySealedPool(undefined, new Date('2098-06-12T12:00:00Z'))).pool?.id).toBe(
        pool.id,
      );
      expect(
        (await getDailySealedPool(undefined, new Date('2098-06-12T12:00:00Z'))).availableDates,
      ).not.toContain('2098-06-13');
      const ready = {
        visibility: 'public' as const,
        archivedAt: null,
        status: 'ready' as const,
        userId: 'swubase',
      };
      for (const hidden of [
        { visibility: 'private' as const },
        { visibility: 'unlisted' as const },
        { archivedAt: now.toISOString() },
        { status: 'in_progress' as const },
        { userId: ids[0]! },
      ]) {
        await db
          .update(cardPools)
          .set({ ...ready, ...hidden })
          .where(eq(cardPools.id, secondPool.pool.id));
        const result = await getDailySealedPool(undefined, now);
        expect(result.pool?.id).toBe(pool.id);
        expect(result.availableDates).not.toContain('2098-06-13');
      }
      await db.update(cardPools).set(ready).where(eq(cardPools.id, secondPool.pool.id));
      const generated = await getDailySealedPool(undefined, new Date('2098-06-13T12:00:00Z'));
      expect(generated.pool?.date).toBe(generated.today);

      expect(
        (
          await owner.request(`/${pool.id}/decks/${publicDeck}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ visibility: 'unlisted' }),
          })
        ).status,
      ).toBe(200);
      expect((await read()).pool.publicDeckCount).toBe(1);
      expect((await read()).pool.builderCount).toBe(1);

      for (const visibility of ['private', 'unlisted'] as const) {
        await db.update(cardPools).set({ visibility }).where(eq(cardPools.id, pool.id));
        expect((await read()).pool).toBeNull();
      }
      await db
        .update(cardPools)
        .set({ visibility: 'public', archivedAt: new Date().toISOString() })
        .where(eq(cardPools.id, pool.id));
      expect((await read()).pool).toBeNull();
      await db
        .update(cardPools)
        .set({ archivedAt: null, status: 'in_progress' })
        .where(eq(cardPools.id, pool.id));
      expect((await read()).pool).toBeNull();
      expect((await getDailySealedPool('2098-06-14')).pool).toBeNull();
    } finally {
      if (decks.length) {
        await db.delete(cardPoolDeckCards).where(inArray(cardPoolDeckCards.deckId, decks));
        await db.delete(cardPoolDecks).where(inArray(cardPoolDecks.deckId, decks));
        await db.delete(deck).where(inArray(deck.id, decks));
      }
      if (pools.length) {
        await db.delete(cardPoolCards).where(inArray(cardPoolCards.cardPoolId, pools));
        await db.delete(cardPools).where(inArray(cardPools.id, pools));
      }
      await db.delete(user).where(inArray(user.id, ids));
    }
  },
  30_000,
);

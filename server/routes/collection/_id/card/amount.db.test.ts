// CARD_GALLERY_LIST_DB_TEST=1 bun --env-file=.env --env-file=.env.worktree test server/routes/collection/_id/card/amount.db.test.ts
import { expect, test } from 'bun:test';
import { Hono } from 'hono';
import { and, eq, inArray } from 'drizzle-orm';
import type { AuthExtension } from '../../../../auth/auth.ts';
import { db } from '../../../../db';
import { user } from '../../../../db/schema/auth-schema.ts';
import { collection } from '../../../../db/schema/collection.ts';
import { collectionCard } from '../../../../db/schema/collection_card.ts';
import { cardList } from '../../../../db/lists.ts';
import { collectionCardAmountPutRoute } from './amount.ts';
import { collectionsBulkDataPostRoute } from '../../bulk/data/post.ts';

test.skipIf(process.env.CARD_GALLERY_LIST_DB_TEST !== '1')(
  'absolute quantities preserve row identity and metadata, authorize owners, and update collection sync',
  async () => {
    const database = new URL(process.env.DATABASE_URL!);
    if (database.hostname !== '127.0.0.1' || !database.pathname.startsWith('/swubase_'))
      throw new Error('Use an isolated worktree database.');
    const owners = [crypto.randomUUID(), crypto.randomUUID()];
    const listIds = Array.from({ length: 4 }, () => crypto.randomUUID());
    const card = Object.values(cardList).find(
      card => card && Object.keys(card.variants).length > 1,
    )!;
    const variantIds = Object.keys(card.variants);
    const id = {
      cardId: card.cardId,
      variantId: variantIds[0],
      foil: false,
      condition: 1,
      language: 'EN',
    };
    let account: string | null = owners[0];
    const app = new Hono<AuthExtension>()
      .use('*', async (c, next) => {
        c.set(
          'user',
          account ? ({ id: account } as NonNullable<AuthExtension['Variables']['user']>) : null,
        );
        await next();
      })
      .route('/collection/:id/card/amount', collectionCardAmountPutRoute)
      .route('/collection/bulk/data', collectionsBulkDataPostRoute);
    const set = (amount: unknown, collectionId = listIds[0], identity: object = id) =>
      app.request(`/collection/${collectionId}/card/amount`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: identity, amount }),
      });
    const rows = (collectionId = listIds[0]) =>
      db.select().from(collectionCard).where(eq(collectionCard.collectionId, collectionId));
    const updatedAt = async (collectionId = listIds[0]) =>
      (await db.select().from(collection).where(eq(collection.id, collectionId)))[0].updatedAt;
    try {
      await db.insert(user).values(
        owners.map(id => ({
          id,
          name: 'Gallery quantity test',
          displayName: id,
          email: `${id}@invalid.local`,
          emailVerified: false,
          currency: 'USD',
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
      );
      await db.insert(collection).values(
        listIds.map((id, i) => ({
          id,
          userId: owners[i === 3 ? 1 : 0],
          title: `Gallery list ${i}`,
          collectionType: (i % 3) + 1,
          public: i === 3,
          updatedAt: new Date('2000-01-01'),
        })),
      );
      account = null;
      expect((await set(2)).status).toBe(401);
      account = owners[0];
      expect((await set(2, listIds[3])).status).toBe(404);
      expect((await set(2, crypto.randomUUID())).status).toBe(404);
      expect((await set(2, 'bad-id')).status).toBe(400);
      for (const amount of [-1, 1.5, 1001, '2', null]) expect((await set(amount)).status).toBe(400);
      expect((await set(2, listIds[0], { ...id, variantId: 'unknown-variant' })).status).toBe(400);
      for (const name of ['toString', '__proto__']) {
        expect((await set(2, listIds[0], { ...id, cardId: name })).status).toBe(400);
        expect((await set(2, listIds[0], { ...id, variantId: name })).status).toBe(400);
      }
      for (const patch of [
        { condition: 7 },
        { language: 'XX' },
        { foil: 'invalid' },
        { note: 'not identity' },
      ])
        expect((await set(2, listIds[0], { ...id, ...patch })).status).toBe(400);

      expect((await set(0)).status).toBe(200);
      expect(await rows()).toHaveLength(0);
      expect(await updatedAt()).toEqual(new Date('2000-01-01'));
      for (const listId of listIds.slice(0, 3)) {
        expect((await set(2, listId)).status).toBe(200);
        const changedAt = await updatedAt(listId);
        expect(changedAt).not.toEqual(new Date('2000-01-01'));
        expect((await set(2, listId)).status).toBe(200);
        expect(await updatedAt(listId)).toEqual(changedAt);
        expect((await rows(listId))[0].amount).toBe(2);
      }
      const concurrent = await Promise.all(Array.from({ length: 6 }, () => set(3)));
      expect(concurrent.every(response => response.status === 200)).toBe(true);
      expect((await rows())[0].amount).toBe(3);
      await db
        .update(collectionCard)
        .set({ amount2: 4, note: 'Keep this note', price: '12.34' })
        .where(eq(collectionCard.collectionId, listIds[0]));
      await db.insert(collectionCard).values([
        { collectionId: listIds[0], ...id, foil: true, amount: 5 },
        { collectionId: listIds[0], ...id, condition: 2, amount: 6 },
        { collectionId: listIds[0], ...id, language: 'FR', amount: 7 },
        { collectionId: listIds[0], ...id, variantId: variantIds[1], amount: 8 },
      ]);
      const before = await rows();
      const saved = await (await set(1)).json();
      expect(saved.data).toMatchObject({
        ...id,
        amount: 1,
        amount2: 4,
        note: 'Keep this note',
        price: '12.34',
      });
      const unchanged = before.filter(row => row.amount !== 3);
      expect((await rows()).filter(row => row.amount !== 1)).toEqual(unchanged);
      expect((await (await set(0)).json()).data).toMatchObject({
        amount: 0,
        amount2: 4,
        note: 'Keep this note',
        price: '12.34',
      });
      expect(await rows()).toHaveLength(5);
      const zeroChangedAt = await updatedAt();
      expect((await set(0)).status).toBe(200);
      expect(await updatedAt()).toEqual(zeroChangedAt);
      const sync = await app.request('/collection/bulk/data', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          collections: listIds
            .slice(0, 3)
            .map(collectionId => ({ collectionId, lastUpdatedAt: '2000-01-01T00:00:00.000Z' })),
        }),
      });
      expect(sync.status).toBe(200);
      expect((await sync.json()).collectionCardsMap[listIds[0]]).toHaveLength(5);
      await db
        .update(collectionCard)
        .set({ amount2: 0 })
        .where(and(eq(collectionCard.collectionId, listIds[0]), eq(collectionCard.amount, 0)));
      expect((await set(0)).status).toBe(200);
      expect(await rows()).toHaveLength(4);
      expect(await rows(listIds[3])).toHaveLength(0);
    } finally {
      await db.delete(collectionCard).where(inArray(collectionCard.collectionId, listIds));
      await db.delete(collection).where(inArray(collection.id, listIds));
      await db.delete(user).where(inArray(user.id, owners));
    }
  },
);

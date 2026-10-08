// CARD_IN_LISTS_DB_TEST=1 bun --env-file=.env --env-file=.env.worktree test server/routes/collection/card/_cardId/get.db.test.ts
import { expect, test } from 'bun:test';
import { Hono } from 'hono';
import { inArray } from 'drizzle-orm';
import type { AuthExtension } from '../../../../auth/auth.ts';
import { db } from '../../../../db';
import { user } from '../../../../db/schema/auth-schema.ts';
import { collection } from '../../../../db/schema/collection.ts';
import { collectionCard } from '../../../../db/schema/collection_card.ts';
import { collectionCardLookupGetRoute } from './get.ts';
import { collectionIdCardPutRoute } from '../../_id/card/put.ts';
import type { CollectionCardLookupResponse } from '../../../../../shared/types/CollectionCardLookup.ts';

test.skipIf(process.env.CARD_IN_LISTS_DB_TEST !== '1')(
  'card lookup returns all variants across owned list types and excludes other owners even when public',
  async () => {
    const database = new URL(process.env.DATABASE_URL!);
    if (database.hostname !== '127.0.0.1' || !database.pathname.startsWith('/swubase_')) {
      throw new Error('Select an isolated worktree database.');
    }
    const userIds = ['owner', 'other', 'empty'].map(
      role => `card-lookup-${role}-${crypto.randomUUID()}`,
    );
    const listIds = Array.from({ length: 6 }, () => crypto.randomUUID());
    const cardId = `card-lookup-${crypto.randomUUID()}`;
    let account: string | null = userIds[0];
    const app = new Hono<AuthExtension>()
      .use('*', async (c, next) => {
        c.set(
          'user',
          account ? ({ id: account } as NonNullable<AuthExtension['Variables']['user']>) : null,
        );
        await next();
      })
      .route('/collection/card/:cardId', collectionCardLookupGetRoute)
      .route('/collection/:id/card', collectionIdCardPutRoute);
    const request = (id = cardId, query = '') =>
      app.request(`/collection/card/${encodeURIComponent(id)}${query}`);
    try {
      await db.insert(user).values(
        userIds.map(id => ({
          id,
          name: 'Card lookup fixture',
          displayName: id,
          email: `${id}@invalid.local`,
          emailVerified: false,
          currency: 'USD',
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
      );
      await db.insert(collection).values(
        listIds.map((id, index) => ({
          id,
          userId: index < 3 || index === 5 ? userIds[0] : userIds[1],
          title: `Lookup list ${index}`,
          collectionType: (index % 3) + 1,
          public: index === 1 || index === 3,
        })),
      );
      await db.insert(collectionCard).values([
        ...listIds.map((collectionId, index) => ({
          collectionId,
          cardId: index === 5 ? `${cardId}-different` : cardId,
          variantId: 'standard',
          language: 'EN',
          condition: 1,
          amount: index + 1,
        })),
        {
          collectionId: listIds[0],
          cardId,
          variantId: 'hyperspace',
          foil: true,
          language: 'FR',
          condition: 2,
          amount: 7,
          amount2: 2,
          note: 'Owner note',
          price: '1.23',
        },
        {
          collectionId: listIds[0],
          cardId,
          variantId: 'hyperspace',
          foil: false,
          language: 'DE',
          condition: 3,
          amount: 0,
          amount2: 4,
        },
      ]);
      const before = await db.select().from(collection).where(inArray(collection.id, listIds));
      const response = await request(cardId, `?userId=${userIds[1]}&variantId=standard`);
      expect(response.status).toBe(200);
      expect(response.headers.get('Cache-Control')).toBe('private, no-store');
      expect(response.headers.get('Vary')).toBe('Cookie');
      const result = (await response.json()) as CollectionCardLookupResponse;
      expect(result.data.map(list => list.collection.id)).toEqual(listIds.slice(0, 3));
      expect(result.data.map(list => list.collection.collectionType)).toEqual([1, 2, 3]);
      expect(result.data[0].cards).toHaveLength(3);
      expect(result.data[0].cards).toContainEqual({
        cardId,
        variantId: 'hyperspace',
        foil: true,
        language: 'FR',
        condition: 2,
        amount: 7,
        amount2: 2,
        note: 'Owner note',
        price: '1.23',
      });
      expect(result.data[0].cards).toContainEqual({
        cardId,
        variantId: 'hyperspace',
        foil: false,
        language: 'DE',
        condition: 3,
        amount: 0,
        amount2: 4,
        note: null,
        price: null,
      });
      expect((await (await request('missing-card')).json()).data).toEqual([]);
      expect((await (await request("' OR 1=1 --")).json()).data).toEqual([]);
      for (const invalid of [' ', 'x'.repeat(256)]) {
        expect((await request(invalid)).status).toBe(400);
      }
      expect(await db.select().from(collection).where(inArray(collection.id, listIds))).toEqual(
        before,
      );
      const update = (variantId: string) =>
        app.request(`/collection/${listIds[0]}/card`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: { cardId, variantId, foil: false, condition: 1, language: 'EN' },
            data: { note: 'Updated row' },
          }),
        });
      const missing = await update('missing-variant');
      expect(missing.status).toBe(404);
      expect(await missing.json()).toEqual({ message: 'This card is no longer in this list.' });
      expect((await update('standard')).status).toBe(201);

      account = userIds[1];
      const other = (await (
        await request(cardId, `?userId=${userIds[0]}`)
      ).json()) as CollectionCardLookupResponse;
      expect(other.data.map(list => list.collection.id).sort()).toEqual(listIds.slice(3, 5).sort());
      account = userIds[2];
      expect((await (await request()).json()).data).toEqual([]);
      account = null;
      expect((await request()).status).toBe(401);
      expect((await request(' ')).status).toBe(401);
    } finally {
      await db.delete(collectionCard).where(inArray(collectionCard.collectionId, listIds));
      await db.delete(collection).where(inArray(collection.id, listIds));
      await db.delete(user).where(inArray(user.id, userIds));
    }
  },
);

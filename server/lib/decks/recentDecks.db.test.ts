import { expect, test } from 'bun:test';
import { eq, inArray } from 'drizzle-orm';
import { Hono } from 'hono';
import type { AuthExtension } from '../../auth/auth.ts';
import { db } from '../../db';
import { user } from '../../db/schema/auth-schema.ts';
import { deck } from '../../db/schema/deck.ts';
import { deckCard } from '../../db/schema/deck_card.ts';
import { deckInformation } from '../../db/schema/deck_information.ts';
import { deckRoute } from '../../routes/deck.ts';
import { deckGetRoute } from '../../routes/decks/get.ts';
import { createDeckForUser } from './createDeck.ts';

const enabled = process.env.SWUBASE_RECENT_DECKS_DB_TEST === '1';
if (enabled) {
  const url = new URL(process.env.DATABASE_URL!);
  if (url.hostname !== '127.0.0.1' || !url.pathname.startsWith('/swubase_'))
    throw new Error('Recent-deck tests require an isolated worktree database.');
}

test.skipIf(!enabled)(
  'recent Premier decks include owned drafts and follow card edits without exposing private decks',
  async () => {
    const owners = [crypto.randomUUID(), crypto.randomUUID()];
    const app = (userId?: string) =>
      new Hono<AuthExtension>()
        .use('*', async (c, next) => {
          c.set(
            'user',
            userId ? ({ id: userId } as NonNullable<AuthExtension['Variables']['user']>) : null,
          );
          await next();
        })
        .route('/deck', deckRoute);
    await db.insert(user).values(
      owners.map(id => ({
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
    const owner = app(owners[0]);
    const listing = `/deck?userId=${owners[0]}&format=1&sort=deck.updated_at&order=desc&limit=3`;
    const oldDate = new Date('2020-01-01T00:00:00Z');
    try {
      const created = [];
      for (const [index, visibility] of [0, 2, 1, 0].entries()) {
        const row = await createDeckForUser(owners[0]!, {
          name: `Premier fixture ${index}`,
          format: 1,
          public: visibility,
        });
        await db
          .update(deck)
          .set({ updatedAt: new Date(oldDate.getTime() + index * 1000) })
          .where(eq(deck.id, row.id));
        created.push(row);
      }
      await createDeckForUser(owners[0]!, { name: 'Newer sealed fixture', format: 3, public: 0 });
      await createDeckForUser(owners[1]!, { name: 'Other owner fixture', format: 1, public: 1 });
      const list = async (target = owner) => {
        const response = await target.request(listing);
        expect(response.status).toBe(200);
        const result = await response.json();
        return result.data.map((row: { deck: { id: string } }) => row.deck.id);
      };
      expect(await list()).toEqual([created[3]!.id, created[2]!.id, created[1]!.id]);
      expect(await list(app())).toEqual([created[2]!.id]);
      expect(await list(app(owners[1]))).toEqual([created[2]!.id]);

      const targetId = created[0]!.id;
      const card = { deckId: targetId, cardId: 'recent-deck-test-card', board: 1 };
      const mutate = (method: string, body: unknown, target = owner) =>
        target.request(`/deck/${targetId}/card`, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      const updatedAt = async () =>
        (await db.select().from(deck).where(eq(deck.id, targetId)))[0]!.updatedAt;
      for (const [method, body, status, quantity] of [
        ['POST', { cardId: card.cardId, board: 1, quantity: 1 }, 201, 1],
        ['PUT', { id: card, data: { quantity: 3 } }, 201, 3],
        ['DELETE', card, 200, null],
        ['POST', { cardId: card.cardId, board: 1, quantity: 2 }, 201, 2],
        ['PUT', { id: card, data: { quantity: 0 } }, 201, null],
      ] as const) {
        await db.update(deck).set({ updatedAt: oldDate }).where(eq(deck.id, targetId));
        expect((await mutate(method, body, app())).status).toBe(401);
        expect((await mutate(method, body, app(owners[1]))).status).toBe(401);
        expect(await updatedAt()).toEqual(oldDate);
        expect((await mutate(method, body)).status).toBe(status);
        expect((await updatedAt()).getTime()).toBeGreaterThan(oldDate.getTime());
        expect((await list())[0]).toBe(targetId);
        const cards = await db.select().from(deckCard).where(eq(deckCard.deckId, targetId));
        if (quantity === null) expect(cards).toHaveLength(0);
        else expect(cards[0]!.quantity).toBe(quantity);
      }
      // Deleting an absent card should not manufacture new activity.
      await db.update(deck).set({ updatedAt: oldDate }).where(eq(deck.id, targetId));
      expect((await mutate('DELETE', card)).status).toBe(200);
      expect(await updatedAt()).toEqual(oldDate);
    } finally {
      const created = await db
        .select({ id: deck.id })
        .from(deck)
        .where(inArray(deck.userId, owners));
      const ids = created.map(row => row.id);
      if (ids.length) {
        await db.delete(deckCard).where(inArray(deckCard.deckId, ids));
        await db.delete(deckInformation).where(inArray(deckInformation.deckId, ids));
        await db.delete(deck).where(inArray(deck.id, ids));
      }
      await db.delete(user).where(inArray(user.id, owners));
    }
  },
  20000,
);

test.skipIf(!enabled)(
  'community discovery excludes the system owner before pagination and exposes only public decks',
  async () => {
    const ownerId = crypto.randomUUID();
    const created: string[] = [];
    const app = (viewerId?: string) =>
      new Hono<AuthExtension>()
        .use('*', async (c, next) => {
          c.set(
            'user',
            viewerId ? ({ id: viewerId } as NonNullable<AuthExtension['Variables']['user']>) : null,
          );
          await next();
        })
        .route('/deck', deckGetRoute);
    await db.insert(user).values({
      id: ownerId,
      name: ownerId,
      displayName: ownerId,
      email: `${ownerId}@invalid.local`,
      emailVerified: false,
      currency: 'USD',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    try {
      // Future timestamps isolate ordering from any existing sanitized development data.
      const start = Date.parse('2098-01-01T00:00:00Z');
      const fixture = async (userId: string, visibility: number, seconds: number, format = 1) => {
        const row = await createDeckForUser(userId, {
          name: `Community discovery fixture ${seconds}`,
          format,
          public: visibility,
        });
        created.push(row.id);
        await db
          .update(deck)
          .set({
            createdAt: new Date(start + seconds * 1000),
            updatedAt: new Date(start - seconds * 1000),
          })
          .where(eq(deck.id, row.id));
        return row.id;
      };
      const earliestPremier = await fixture(ownerId, 1, 0.5);
      const older = await fixture(ownerId, 1, 1);
      const premier = await fixture(ownerId, 1, 2);
      const eternal = await fixture(ownerId, 1, 3, 6);
      const sealed = await fixture(ownerId, 1, 4, 3);
      await fixture(ownerId, 0, 5);
      await fixture(ownerId, 2, 6);
      const imported = await fixture('swubase', 1, 7);
      const listing = '/deck?excludeUserId=swubase&sort=deck.created_at&order=desc&limit=3';
      for (const client of [app(), app(ownerId), app('swubase')]) {
        const response = await client.request(listing);
        expect(response.status).toBe(200);
        const result = await response.json();
        expect(result.data.map((row: { deck: { id: string } }) => row.deck.id)).toEqual([
          sealed,
          eternal,
          premier,
        ]);
        expect(result.data.every((row: { deck: { public: number } }) => row.deck.public === 1)).toBe(
          true,
        );
        const premierResult = await (await client.request(`${listing}&format=1`)).json();
        expect(premierResult.data.map((row: { deck: { id: string } }) => row.deck.id)).toEqual([
          premier,
          older,
          earliestPremier,
        ]);
      }
      const nextPage = await (await app().request(`${listing}&offset=3`)).json();
      expect(nextPage.data[0].deck.id).toBe(older);
      expect(nextPage.data.some((row: { deck: { id: string } }) => row.deck.id === imported)).toBe(
        false,
      );
      const unfiltered = await (
        await app().request('/deck?sort=deck.created_at&order=desc&limit=1')
      ).json();
      expect(unfiltered.data[0].deck.id).toBe(imported);
      expect((await app().request('/deck?excludeUserId=')).status).toBe(400);
    } finally {
      if (created.length) {
        await db.delete(deckInformation).where(inArray(deckInformation.deckId, created));
        await db.delete(deck).where(inArray(deck.id, created));
      }
      await db.delete(user).where(eq(user.id, ownerId));
    }
  },
  20000,
);

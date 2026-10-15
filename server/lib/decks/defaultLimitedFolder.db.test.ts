import { expect, test } from 'bun:test';
import { Hono } from 'hono';
import { eq, inArray } from 'drizzle-orm';
import type { AuthExtension } from '../../auth/auth.ts';
import { db } from '../../db';
import { user } from '../../db/schema/auth-schema.ts';
import { cardPools, cardPoolCards } from '../../db/schema/card_pool.ts';
import { cardPoolDeckCards, cardPoolDecks } from '../../db/schema/card_pool_deck.ts';
import { deck } from '../../db/schema/deck.ts';
import { deckInformation } from '../../db/schema/deck_information.ts';
import { deckFolder, deckFolderDeck } from '../../db/schema/deck_folder.ts';
import { userSettings } from '../../db/schema/user_settings.ts';
import { deckFoldersRoute } from '../../routes/deck-folders.ts';
import { userSettingsPostRoute } from '../../routes/user-settings/post.ts';
import { userSettingsGetRoute } from '../../routes/user-settings/get.ts';
import { userSetupGetRoute } from '../../routes/user-setup/get.ts';
import { cardPoolsIdDecksPostRoute } from '../../routes/card-pools/_id/decks/post.ts';
import { deckRoute } from '../../routes/deck.ts';

const enabled = process.env.SWUBASE_DECK_FOLDERS_DB_TEST === '1';
if (enabled) {
  const url = new URL(process.env.DATABASE_URL!);
  if (url.hostname !== '127.0.0.1' || !url.pathname.startsWith('/swubase_'))
    throw new Error('Use an isolated worktree database.');
}

test.skipIf(!enabled)(
  'limited default is account-owned, applies to every pool build, and survives stale preferences',
  async () => {
    const ids = [crypto.randomUUID(), crypto.randomUUID()];
    const poolIds = Array.from({ length: 4 }, () => crypto.randomUUID());
    const deckIds: string[] = [];
    const app = (id?: string) =>
      new Hono<AuthExtension>()
        .use('*', async (c, next) => {
          c.set('user', id ? ({ id } as NonNullable<AuthExtension['Variables']['user']>) : null);
          await next();
        })
        .route('/settings', userSettingsPostRoute)
        .route('/settings', userSettingsGetRoute)
        .route('/setup', userSetupGetRoute)
        .route('/folders', deckFoldersRoute)
        .route('/pools/:id/decks', cardPoolsIdDecksPostRoute)
        .route('/decks', deckRoute);
    const owner = app(ids[0]);
    const other = app(ids[1]);
    const post = (target: ReturnType<typeof app>, path: string, body: unknown) =>
      target.request(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    const setDefault = (id: string | null) =>
      post(owner, '/settings', { defaultLimitedFolderId: id });
    const setting = async () =>
      (await (await owner.request('/settings')).json()).defaultLimitedFolderId;
    const create = async (poolId: string, folderId: string | null, target = owner) => {
      const response = await post(target, `/pools/${poolId}/decks`, {
        name: 'Limited fixture',
        visibility: 'private',
      });
      expect(response.status).toBe(201);
      const { data } = await response.json();
      deckIds.push(data.deck.id);
      const [membership] = await db
        .select()
        .from(deckFolderDeck)
        .where(eq(deckFolderDeck.deckId, data.deck.id));
      expect(membership?.folderId ?? null).toBe(folderId);
      expect(
        await db.select().from(deckInformation).where(eq(deckInformation.deckId, data.deck.id)),
      ).toHaveLength(1);
      expect(data.createdCardsCount).toBe(1);
      expect(
        await db.select().from(cardPoolDeckCards).where(eq(cardPoolDeckCards.deckId, data.deck.id)),
      ).toHaveLength(1);
      return data.deck.id as string;
    };
    const duplicate = async (sourceId: string, folderId: string | null) => {
      const response = await post(owner, `/decks/${sourceId}/duplicate`, {});
      expect(response.status).toBe(201);
      const { data } = await response.json();
      deckIds.push(data.id);
      expect(data.userId).toBe(ids[0]!);
      const [membership] = await db
        .select()
        .from(deckFolderDeck)
        .where(eq(deckFolderDeck.deckId, data.id));
      expect(membership?.folderId ?? null).toBe(folderId);
      return data.id as string;
    };
    try {
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
      await db.insert(cardPools).values(
        poolIds.map((id, index) => ({
          id,
          userId: ids[index === 0 ? 0 : 1],
          name: 'Limited pool fixture',
          status: 'ready' as const,
          visibility: index === 0 ? ('private' as const) : ('public' as const),
          type: index === 3 ? ('draft' as const) : ('sealed' as const),
          dailyDate: index === 2 ? '2097-09-07' : null,
        })),
      );
      await db
        .insert(cardPoolCards)
        .values(
          poolIds.map(cardPoolId => ({ cardPoolId, cardPoolNumber: 1, cardId: 'command-center' })),
        );
      const root = (await (await post(owner, '/folders', { name: 'Limited' })).json()).data.id;
      const child = (
        await (await post(owner, '/folders', { name: 'Daily', parentId: root })).json()
      ).data.id;
      const foreign = (await (await post(other, '/folders', { name: 'Other account' })).json()).data
        .id;
      expect((await app().request('/settings')).status).toBe(401);
      expect((await post(app(), '/settings', { defaultLimitedFolderId: root })).status).toBe(401);
      expect(await setting()).toBeNull();
      await create(poolIds[0]!, null);
      expect((await setDefault('bad-id')).status).toBe(400);
      expect((await setDefault(crypto.randomUUID())).status).toBe(404);
      expect((await setDefault(foreign)).status).toBe(404);
      expect(
        (await post(owner, '/settings', { deckPrices: true, calendarWeekStartsOn: 6 })).status,
      ).toBe(200);
      expect((await setDefault(root.toUpperCase())).status).toBe(200);
      expect(await setting()).toBe(root);
      expect(await (await owner.request('/settings')).json()).toMatchObject({
        deckPrices: true,
        calendarWeekStartsOn: 6,
      });
      expect(
        (await (await owner.request('/setup')).json()).data.settings.defaultLimitedFolderId,
      ).toBe(root);
      for (const poolId of poolIds) await create(poolId, root);
      await create(poolIds[0]!, root); // Additional attempts also use the default.
      const contents = await (
        await owner.request(`/decks?userId=${ids[0]}&folderId=${root}`)
      ).json();
      expect(contents.data).toHaveLength(5);
      expect(
        (await (await owner.request('/folders')).json()).data.find(
          (f: { id: string }) => f.id === root,
        ),
      ).toMatchObject({ isDefaultLimited: true, deckCount: 5 });
      expect((await setDefault(child)).status).toBe(200);
      await create(poolIds[2]!, child);
      const copyId = await duplicate(deckIds[1]!, child);
      expect(
        await db.select().from(cardPoolDeckCards).where(eq(cardPoolDeckCards.deckId, copyId)),
      ).toHaveLength(1);
      expect((await post(other, '/settings', { defaultLimitedFolderId: foreign })).status).toBe(
        200,
      );
      const foreignDeck = await create(poolIds[2]!, foreign, other);
      await db.update(deck).set({ public: 1 }).where(eq(deck.id, foreignDeck));
      await duplicate(foreignDeck, child);
      const [normal] = await db
        .insert(deck)
        .values({ userId: ids[0]!, format: 1, name: 'Normal fixture', public: 0 })
        .returning();
      deckIds.push(normal!.id);
      await duplicate(normal!.id, null);
      expect((await setDefault(null)).status).toBe(200);
      expect(await setting()).toBeNull();
      await duplicate(copyId, null);
      expect(
        (await (await owner.request('/setup')).json()).data.settings.defaultLimitedFolderId,
      ).toBeNull();
      await create(poolIds[2]!, null);
      expect((await setDefault(child)).status).toBe(200);
      expect((await owner.request(`/folders/${root}`, { method: 'DELETE' })).status).toBe(200);
      expect(await setting()).toBeNull(); // Removing an ancestor clears the descendant preference.
      await create(poolIds[2]!, null);
      // A stale restored setting or foreign ID cannot attach another account's folder or break creation.
      for (const value of [root, foreign, 'malformed']) {
        await db
          .insert(userSettings)
          .values({ userId: ids[0]!, key: 'defaultLimitedFolderId', value })
          .onConflictDoUpdate({ target: [userSettings.userId, userSettings.key], set: { value } });
        await create(poolIds[2]!, null);
      }
      expect(await db.select().from(deck).where(inArray(deck.id, deckIds))).toHaveLength(
        deckIds.length,
      );
    } finally {
      await db.delete(deckFolder).where(inArray(deckFolder.userId, ids));
      if (deckIds.length) {
        await db.delete(cardPoolDeckCards).where(inArray(cardPoolDeckCards.deckId, deckIds));
        await db.delete(cardPoolDecks).where(inArray(cardPoolDecks.deckId, deckIds));
        await db.delete(deckInformation).where(inArray(deckInformation.deckId, deckIds));
        await db.delete(deck).where(inArray(deck.id, deckIds));
      }
      await db.delete(cardPoolCards).where(inArray(cardPoolCards.cardPoolId, poolIds));
      await db.delete(cardPools).where(inArray(cardPools.id, poolIds));
      await db.delete(userSettings).where(inArray(userSettings.userId, ids));
      await db.delete(user).where(inArray(user.id, ids));
    }
  },
  20_000,
);

import { expect, test } from 'bun:test';
import { Hono } from 'hono';
import { and, eq, inArray } from 'drizzle-orm';
import type { AuthExtension } from '../../auth/auth.ts';
import { db } from '../../db';
import { user } from '../../db/schema/auth-schema.ts';
import { deck } from '../../db/schema/deck.ts';
import { deckInformation } from '../../db/schema/deck_information.ts';
import { deckFolder, deckFolderDeck } from '../../db/schema/deck_folder.ts';
import { cardPools } from '../../db/schema/card_pool.ts';
import { cardPoolDecks } from '../../db/schema/card_pool_deck.ts';
import { deckFoldersRoute } from '../../routes/deck-folders.ts';
import { deckRoute } from '../../routes/deck.ts';

const enabled = process.env.SWUBASE_DECK_FOLDERS_DB_TEST === '1';
if (enabled) {
  const url = new URL(process.env.DATABASE_URL!);
  if (url.hostname !== '127.0.0.1' || !url.pathname.startsWith('/swubase_'))
    throw new Error('Deck folder tests require an isolated worktree database.');
}

test.skipIf(!enabled)(
  'folders enforce ownership, prevent concurrent cycles, preserve decks and isolate private listings',
  async () => {
    const ids = [crypto.randomUUID(), crypto.randomUUID()];
    const deckIds = [crypto.randomUUID(), crypto.randomUUID(), crypto.randomUUID()];
    const poolId = crypto.randomUUID();
    const appFor = (id?: string) =>
      new Hono<AuthExtension>()
        .use('*', async (c, next) => {
          c.set('user', id ? ({ id } as NonNullable<AuthExtension['Variables']['user']>) : null);
          await next();
        })
        .route('/folders', deckFoldersRoute)
        .route('/deck', deckRoute);
    const owner = appFor(ids[0]);
    const foreign = appFor(ids[1]);
    const request = (
      app: ReturnType<typeof appFor>,
      path: string,
      method: string,
      body?: unknown,
    ) =>
      app.request(path, {
        method,
        headers: { 'Content-Type': 'application/json' },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
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
    try {
      await db
        .insert(cardPools)
        .values({ id: poolId, userId: ids[0], name: 'Folder pool fixture' });
      await db.insert(deck).values(
        deckIds.map((id, index) => ({
          id,
          userId: ids[index === 2 ? 1 : 0]!,
          format: 1,
          name: `Folder deck ${index}`,
          public: index === 2 ? 1 : 0,
          cardPoolId: index === 1 ? poolId : null,
        })),
      );
      await db.insert(deckInformation).values(deckIds.map(deckId => ({ deckId })));
      await db
        .insert(cardPoolDecks)
        .values({ deckId: deckIds[1]!, cardPoolId: poolId, userId: ids[0]! });
      expect((await request(appFor(), '/folders', 'GET')).status).toBe(401);
      expect((await request(owner, '/folders', 'POST', { name: ' ' })).status).toBe(400);
      const rootResponse = await request(owner, '/folders', 'POST', { name: ' Root ' });
      expect(rootResponse.status).toBe(201);
      const root = (await rootResponse.json()).data.id;
      const child = (
        await (await request(owner, '/folders', 'POST', { name: 'Child', parentId: root })).json()
      ).data.id;
      const leaf = (
        await (await request(owner, '/folders', 'POST', { name: 'Leaf', parentId: child })).json()
      ).data.id;
      const other = (
        await (
          await request(foreign, '/folders', 'POST', { name: 'Private foreign folder' })
        ).json()
      ).data.id;
      expect((await request(foreign, `/folders/${root}`, 'PUT', { name: 'Stolen' })).status).toBe(
        404,
      );
      expect((await request(foreign, `/folders/${root}`, 'DELETE')).status).toBe(404);
      expect(
        (await request(foreign, '/folders', 'POST', { name: 'Foreign child', parentId: root }))
          .status,
      ).toBe(404);
      expect(
        (await request(owner, `/folders/${root}`, 'PUT', { name: 'Root', parentId: leaf })).status,
      ).toBe(409);
      expect(
        (
          await request(owner, '/folders/move', 'POST', {
            deckIds: [deckIds[0], deckIds[2]],
            folderId: leaf,
          })
        ).status,
      ).toBe(404);
      expect(
        await db.select().from(deckFolderDeck).where(inArray(deckFolderDeck.deckId, deckIds)),
      ).toHaveLength(0);
      expect(
        (
          await request(owner, '/folders/move', 'POST', {
            deckIds: deckIds.slice(0, 2),
            folderId: other,
          })
        ).status,
      ).toBe(404);
      expect(
        (
          await request(owner, '/folders/move', 'POST', {
            deckIds: [deckIds[0]],
            folderId: leaf,
          })
        ).status,
      ).toBe(200);
      const unfiled = await (await owner.request(`/deck?userId=${ids[0]}&folderId=unfiled`)).json();
      expect(unfiled.data.map((row: { deck: { id: string } }) => row.deck.id)).toEqual([
        deckIds[1],
      ]);
      expect(
        (
          await request(owner, '/folders/move', 'POST', {
            deckIds: deckIds.slice(0, 2),
            folderId: leaf,
          })
        ).status,
      ).toBe(200);
      const contents = await (
        await owner.request(`/deck?userId=${ids[0]}&folderId=${leaf}`)
      ).json();
      expect(contents.data.map((row: { deck: { id: string } }) => row.deck.id).sort()).toEqual(
        deckIds.slice(0, 2).sort(),
      );
      expect(
        (await (await owner.request(`/deck?userId=${ids[0]}&folderId=unfiled`)).json()).data,
      ).toHaveLength(0);
      expect((await appFor().request(`/deck?userId=${ids[0]}&folderId=${leaf}`)).status).toBe(401);
      expect((await foreign.request(`/deck?userId=${ids[0]}&folderId=${leaf}`)).status).toBe(403);
      expect((await foreign.request(`/deck?userId=${ids[1]}&folderId=${leaf}`)).status).toBe(404);
      const listing = (await (await owner.request('/folders')).json()).data;
      expect(listing.find((row: { id: string }) => row.id === leaf).deckCount).toBe(2);
      expect(listing.some((row: { id: string }) => row.id === other)).toBe(false);
      expect(
        (await (await appFor().request('/deck')).json()).data.some(
          (row: { deck: Record<string, unknown> }) => row.deck.folderId !== undefined,
        ),
      ).toBe(false);

      const a = (await (await request(owner, '/folders', 'POST', { name: 'A' })).json()).data.id;
      const b = (await (await request(owner, '/folders', 'POST', { name: 'B' })).json()).data.id;
      const position = (
        app: ReturnType<typeof appFor>,
        id: string,
        targetId: string | null,
        placement = 'inside',
      ) => request(app, `/folders/${id}/position`, 'PUT', { targetId, placement });
      const rootOrder = async () =>
        (await (await owner.request('/folders')).json()).data
          .filter((folder: { parentId: string | null }) => !folder.parentId)
          .map((folder: { id: string }) => folder.id);
      expect(await rootOrder()).toEqual([root, a, b]);
      expect((await position(owner, b, a, 'before')).status).toBe(200);
      expect(await rootOrder()).toEqual([root, b, a]);
      expect((await request(owner, `/folders/${b}`, 'PUT', { name: 'Z renamed' })).status).toBe(
        200,
      );
      expect(await rootOrder()).toEqual([root, b, a]);
      expect((await position(owner, a, b)).status).toBe(200);
      expect((await db.select().from(deckFolder).where(eq(deckFolder.id, a)))[0]!.parentId).toBe(b);
      const nestedPosition = (await db.select().from(deckFolder).where(eq(deckFolder.id, a)))[0]!
        .position;
      expect(
        (await request(owner, `/folders/${a}`, 'PUT', { name: 'Renamed nested A' })).status,
      ).toBe(200);
      const renamedNested = (await db.select().from(deckFolder).where(eq(deckFolder.id, a)))[0]!;
      expect(renamedNested.parentId).toBe(b);
      expect(renamedNested.position).toBe(nestedPosition);
      expect((await position(owner, a, b, 'after')).status).toBe(200);
      expect(await rootOrder()).toEqual([root, b, a]);
      expect((await position(owner, a, root, 'before')).status).toBe(200);
      expect(await rootOrder()).toEqual([a, root, b]);
      expect((await position(owner, a, null)).status).toBe(200);
      expect(await rootOrder()).toEqual([root, b, a]);
      expect((await position(appFor(), a, b)).status).toBe(401);
      expect((await position(foreign, a, other)).status).toBe(404);
      expect((await position(owner, a, other)).status).toBe(404);
      expect((await position(owner, root, leaf)).status).toBe(409);
      expect((await position(owner, a, a, 'after')).status).toBe(409);
      expect((await position(owner, a, null, 'before')).status).toBe(400);
      expect(await rootOrder()).toEqual([root, b, a]);
      const concurrent = await Promise.all([
        request(owner, `/folders/${a}`, 'PUT', { name: 'A', parentId: b }),
        position(owner, b, a),
      ]);
      expect(concurrent.map(response => response.status).sort()).toEqual([200, 409]);
      expect((await request(owner, `/folders/${root}`, 'DELETE')).status).toBe(200);
      expect(
        await db
          .select()
          .from(deckFolder)
          .where(inArray(deckFolder.id, [root, child, leaf])),
      ).toHaveLength(0);
      expect(
        await db.select().from(deckFolderDeck).where(inArray(deckFolderDeck.deckId, deckIds)),
      ).toHaveLength(0);
      expect(
        await db
          .select()
          .from(deck)
          .where(and(eq(deck.userId, ids[0]!), inArray(deck.id, deckIds))),
      ).toHaveLength(2);
      expect(
        await db.select().from(cardPoolDecks).where(eq(cardPoolDecks.deckId, deckIds[1]!)),
      ).toHaveLength(1);

      const sanitizer = await Bun.file('scripts/remote-dev/sql/001-core-data.sql').text();
      const clear = sanitizer.match(
        /^TRUNCATE TABLE deck_folder_share, deck_folder_deck, deck_folder;$/m,
      )?.[0];
      const assertion = sanitizer.match(
        / {2}IF EXISTS \(SELECT 1 FROM deck_folder\)[\s\S]*?END IF;/,
      )?.[0];
      expect(clear).toBeDefined();
      expect(assertion).toBeDefined();
      const rollback = new Error('Rollback sanitization fixture');
      try {
        await db.transaction(async tx => {
          await tx.execute(clear!);
          await tx.execute(`DO $$ BEGIN ${assertion} END $$;`);
          expect(await tx.select().from(deckFolder)).toHaveLength(0);
          throw rollback;
        });
      } catch (error) {
        if (error !== rollback) throw error;
      }
    } finally {
      await db.delete(deckFolder).where(inArray(deckFolder.userId, ids));
      await db.delete(cardPoolDecks).where(inArray(cardPoolDecks.deckId, deckIds));
      await db.delete(deckInformation).where(inArray(deckInformation.deckId, deckIds));
      await db.delete(deck).where(inArray(deck.id, deckIds));
      await db.delete(cardPools).where(eq(cardPools.id, poolId));
      await db.delete(user).where(inArray(user.id, ids));
    }
  },
  20000,
);

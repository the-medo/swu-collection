import { expect, spyOn, test } from 'bun:test';
import { and, eq, inArray } from 'drizzle-orm';
import { Hono } from 'hono';
import type { AuthExtension } from '../../auth/auth.ts';
import { db } from '../../db';
import { user } from '../../db/schema/auth-schema.ts';
import { deck } from '../../db/schema/deck.ts';
import { deckInformation } from '../../db/schema/deck_information.ts';
import { deckFolder, deckFolderDeck } from '../../db/schema/deck_folder.ts';
import { deckPostRoute } from '../../routes/decks/post.ts';
import { decksImportPostRoute } from '../../routes/decks/import/post.ts';

const enabled = process.env.SWUBASE_DECK_FOLDERS_DB_TEST === '1';
if (enabled) {
  const url = new URL(process.env.DATABASE_URL!);
  if (url.hostname !== '127.0.0.1' || !url.pathname.startsWith('/swubase_'))
    throw new Error('Deck creation tests require an isolated worktree database.');
}

test.skipIf(!enabled)(
  'creation and import save owned folder membership atomically',
  async () => {
    const ids = [crypto.randomUUID(), crypto.randomUUID()];
    const folderIds = [crypto.randomUUID(), crypto.randomUUID()];
    const app = (userId?: string) =>
      new Hono<AuthExtension>()
        .use('*', async (c, next) => {
          c.set(
            'user',
            userId ? ({ id: userId } as NonNullable<AuthExtension['Variables']['user']>) : null,
          );
          await next();
        })
        .route('/create', deckPostRoute)
        .route('/import', decksImportPostRoute);
    const owner = app(ids[0]);
    const request = (target: ReturnType<typeof app>, path: string, body: unknown) =>
      target.request(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    const fetchDeck = spyOn(globalThis, 'fetch').mockImplementation(async () =>
      Response.json({ metadata: { name: 'Folder import fixture' }, deck: [], sideboard: [] }),
    );
    await db
      .insert(user)
      .values(
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
        .insert(deckFolder)
        .values(folderIds.map((id, index) => ({ id, userId: ids[index]!, name: 'Destination' })));
      for (const [path, payload] of [
        ['/create', { name: 'Created fixture', format: 1, public: 0 }],
        ['/import', { deckLink: 'https://swudb.com/deck/folder-test', format: 1 }],
      ] as const) {
        expect((await request(app(), path, { ...payload, folderId: folderIds[0] })).status).toBe(
          401,
        );
        expect((await request(owner, path, { ...payload, folderId: 'invalid' })).status).toBe(400);
        const before = await db.select({ id: deck.id }).from(deck).where(eq(deck.userId, ids[0]!));
        for (const folderId of [folderIds[1], crypto.randomUUID()]) {
          const rejected = await request(owner, path, { ...payload, folderId });
          expect(rejected.status).toBe(404);
          expect(await rejected.json()).toHaveProperty('message');
        }
        expect(await db.select({ id: deck.id }).from(deck).where(eq(deck.userId, ids[0]!))).toEqual(
          before,
        );
        const response = await request(owner, path, { ...payload, folderId: folderIds[0] });
        expect(response.status).toBe(201);
        const result = await response.json();
        const deckId = path === '/create' ? result.data[0].id : result.data.deck.id;
        expect(
          await db.select().from(deckFolderDeck).where(eq(deckFolderDeck.deckId, deckId)),
        ).toEqual([{ deckId, folderId: folderIds[0] }]);
        expect(
          await db.select().from(deckInformation).where(eq(deckInformation.deckId, deckId)),
        ).toHaveLength(1);
        for (const folderId of [undefined, null]) {
          const noFolder = await request(owner, path, { ...payload, folderId });
          expect(noFolder.status).toBe(201);
          const data = await noFolder.json();
          const id = path === '/create' ? data.data[0].id : data.data.deck.id;
          expect(
            await db.select().from(deckFolderDeck).where(eq(deckFolderDeck.deckId, id)),
          ).toHaveLength(0);
        }
      }
      await db
        .delete(deckFolder)
        .where(and(eq(deckFolder.id, folderIds[0]!), eq(deckFolder.userId, ids[0]!)));
      expect(
        (
          await request(owner, '/create', {
            name: 'Removed destination',
            format: 1,
            public: 0,
            folderId: folderIds[0],
          })
        ).status,
      ).toBe(404);
    } finally {
      fetchDeck.mockRestore();
      const created = await db.select({ id: deck.id }).from(deck).where(inArray(deck.userId, ids));
      const deckIds = created.map(item => item.id);
      if (deckIds.length) {
        await db.delete(deckInformation).where(inArray(deckInformation.deckId, deckIds));
        await db.delete(deck).where(inArray(deck.id, deckIds));
      }
      await db.delete(deckFolder).where(inArray(deckFolder.userId, ids));
      await db.delete(user).where(inArray(user.id, ids));
    }
  },
  20000,
);

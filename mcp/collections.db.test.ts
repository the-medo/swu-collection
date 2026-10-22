import { expect, test } from 'bun:test';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq, inArray } from 'drizzle-orm';
import { readFile } from 'node:fs/promises';
import { user } from '../server/db/schema/auth-schema.ts';
import { collection } from '../server/db/schema/collection.ts';
import { collectionCard } from '../server/db/schema/collection_card.ts';
import { deck } from '../server/db/schema/deck.ts';
import { deckCard } from '../server/db/schema/deck_card.ts';
import {
  createCollectionRepository,
  collectionListInput,
  ownershipInput,
  missingCardsInput,
} from './collections.ts';
import { createCollectionTools } from './tools/collections.ts';
import { toolSuccess } from './tools/results.ts';

const enabled = process.env.SWUBASE_MCP_DB_TEST === '1';
test.skipIf(!enabled)(
  'collection tools preserve owner isolation, printing quantities, selection and board totals under restricted grants',
  async () => {
    const target = new URL(process.env.DATABASE_URL!);
    if (target.hostname !== '127.0.0.1' || !target.pathname.startsWith('/swubase_'))
      throw new Error('Use an isolated worktree database.');
    const admin = postgres(target.href, { max: 2 }),
      runtime = postgres(target.href, { max: 1 });
    const db = drizzle(admin),
      limited = drizzle(runtime);
    const users = [crypto.randomUUID(), crypto.randomUUID()];
    const ids = Array.from({ length: 6 }, () => crypto.randomUUID());
    const decks = [crypto.randomUUID(), crypto.randomUUID()];
    const role = 'mcp_collections_' + crypto.randomUUID().replaceAll('-', '');
    const cardId = 'coruscant-guard';
    try {
      await admin`create role ${admin(role)} nologin`;
      await admin
        .unsafe(
          (await readFile(new URL('./deploy/grants.sql', import.meta.url), 'utf8'))
            .replaceAll('swubase_mcp', role)
            .replace(':"DBNAME"', `"${target.pathname.slice(1)}"`),
        )
        .simple();
      await runtime`set role ${runtime(role)}`;
      await db
        .insert(user)
        .values(
          users.map(id => ({
            id,
            name: 'Private identity',
            displayName: id,
            email: id + '@invalid.local',
            emailVerified: false,
            currency: 'USD',
            createdAt: new Date(),
            updatedAt: new Date(),
          })),
        );
      await db
        .insert(collection)
        .values(
          ids.map((id, i) => ({
            id,
            userId: i >= 4 ? users[1]! : users[0]!,
            title: i === 0 ? 'Owned %_ literal' : 'Collection ' + i,
            description: 'PRIVATE DESCRIPTION',
            collectionType: i === 2 ? 2 : i === 3 ? 3 : 1,
            forDecks: i !== 1,
            public: i === 5,
          })),
        );
      await db
        .insert(collectionCard)
        .values([
          ...ids.map((id, i) => ({
            collectionId: id,
            cardId,
            variantId: 'printing-a',
            foil: false,
            language: 'EN',
            amount: i === 0 ? 2 : 20,
            amount2: 999,
            note: 'PRIVATE NOTE',
            price: '9876',
          })),
          {
            collectionId: ids[0]!,
            cardId,
            variantId: 'printing-b',
            foil: true,
            condition: 2,
            language: 'FR',
            amount: 1,
          },
          {
            collectionId: ids[0]!,
            cardId: 'unavailable-card',
            variantId: 'unknown',
            language: 'EN',
            amount: 2,
          },
          {
            collectionId: ids[0]!,
            cardId: 'zero-card',
            variantId: 'zero',
            language: 'EN',
            amount: 0,
            amount2: 9,
          },
        ]);
      await db
        .insert(deck)
        .values(
          decks.map((id, i) => ({
            id,
            userId: users[i]!,
            format: 1,
            name: 'Ownership fixture',
            public: 0,
            leaderCardId1: 'qui-gon-jinn--student-of-the-living-force',
            baseCardId: 'echo-base',
          })),
        );
      await db
        .insert(deckCard)
        .values(
          [1, 2, 3].map(board => ({
            deckId: decks[0]!,
            cardId,
            quantity: 2,
            board,
            note: 'PRIVATE DECK NOTE',
          })),
        );
      const repository = createCollectionRepository(limited);
      const list = await repository.list(users[0]!, collectionListInput.parse({}));
      expect(list.total).toBe(2);
      expect(
        (await repository.list(users[0]!, collectionListInput.parse({ type: 'all' }))).total,
      ).toBe(4);
      expect(
        (await repository.list(users[0]!, collectionListInput.parse({ query: '%_' }))).total,
      ).toBe(1);
      expect(JSON.stringify(list)).not.toContain('PRIVATE');
      const owned = await repository.ownership(
        users[0]!,
        ownershipInput.parse({ cardIds: [cardId, cardId] }),
      );
      expect(owned.cards).toHaveLength(1);
      expect(owned.cards[0]).toMatchObject({
        cardId,
        quantity: 3,
        holdings: expect.arrayContaining([
          expect.objectContaining({
            variantId: 'printing-b',
            foil: true,
            condition: 2,
            language: 'FR',
            quantity: 1,
          }),
        ]),
      });
      expect(JSON.stringify(owned)).not.toContain('PRIVATE');
      expect(JSON.stringify(owned)).not.toContain('9876');
      expect(JSON.stringify(owned)).not.toContain('999');
      expect(
        (
          await repository.ownership(
            users[0]!,
            ownershipInput.parse({ cardIds: [cardId], forDecksOnly: false }),
          )
        ).cards[0]!.quantity,
      ).toBe(23);
      expect(
        (
          await repository.ownership(
            users[0]!,
            ownershipInput.parse({ collectionIds: [ids[1]], forDecksOnly: true }),
          )
        ).cards,
      ).toEqual([]);
      for (const id of ids.slice(2))
        await expect(
          repository.ownership(users[0]!, ownershipInput.parse({ collectionIds: [id] })),
        ).rejects.toMatchObject({ status: 404 });
      const first = await repository.ownership(users[0]!, ownershipInput.parse({ limit: 1 }));
      const next = await repository.ownership(
        users[0]!,
        ownershipInput.parse({ limit: 1, offset: 1 }),
      );
      expect(first.total).toBe(2);
      expect(first.cards[0]!.cardId).not.toBe(next.cards[0]!.cardId);
      expect(next.cards[0]).toMatchObject({
        cardId: 'unavailable-card',
        name: null,
        quantity: 2,
        catalogAvailable: false,
      });
      const missing = await repository.missing(
        users[0]!,
        missingCardsInput.parse({ deckId: decks[0], includeLeadersAndBase: false }),
      );
      expect(missing.cards).toEqual([
        expect.objectContaining({ cardId, required: 4, owned: 3, missing: 1 }),
      ]);
      expect(missing.missingCopies).toBe(1);
      const allBoards = await repository.missing(
        users[0]!,
        missingCardsInput.parse({
          deckId: decks[0],
          includeLeadersAndBase: false,
          boards: ['main', 'sideboard', 'maybeboard'],
        }),
      );
      expect(allBoards.cards[0]!.missing).toBe(3);
      expect(
        (
          await repository.missing(
            users[0]!,
            missingCardsInput.parse({
              deckId: decks[0],
              forDecksOnly: false,
              includeLeadersAndBase: false,
            }),
          )
        ).complete,
      ).toBe(true);
      const leaders = await repository.missing(
        users[0]!,
        missingCardsInput.parse({ deckId: decks[0] }),
      );
      expect(leaders.cards).toContainEqual(
        expect.objectContaining({
          cardId: 'qui-gon-jinn--student-of-the-living-force',
          required: 1,
          missing: 1,
        }),
      );
      await expect(
        repository.missing(users[0]!, missingCardsInput.parse({ deckId: decks[1] })),
      ).rejects.toMatchObject({ status: 404 });
      const tools = createCollectionTools(repository);
      for (const tool of tools) {
        let executed = false;
        const result = await tool.invoke(
          tool.name === 'get_deck_missing_cards' ? { deckId: decks[0] } : {},
          {
            actor: { userId: users[0]!, clientId: 'test', scopes: ['cards:read', 'decks:read'] },
            websiteOrigin: 'https://example.invalid',
          },
          async (_name, work) => {
            executed = true;
            return toolSuccess((await work()).data);
          },
        );
        expect(result).toMatchObject({ isError: true, structuredContent: { code: 'forbidden' } });
        expect(executed).toBe(false);
        expect(tool.inputSchema.safeParse({ userId: users[1] }).success).toBe(false);
      }
      for (const query of [
        'select note from collection_card',
        'select amount2 from collection_card',
        'select price from collection_card',
        'select description from collection',
        'update collection_card set amount = 0',
      ])
        await expect(runtime.unsafe(query).execute()).rejects.toMatchObject({ code: '42501' });
    } finally {
      await runtime`reset role`;
      await runtime.end();
      await db.delete(collectionCard).where(inArray(collectionCard.collectionId, ids));
      await db.delete(collection).where(inArray(collection.id, ids));
      await db.delete(deckCard).where(inArray(deckCard.deckId, decks));
      await db.delete(deck).where(inArray(deck.id, decks));
      await db.delete(user).where(inArray(user.id, users));
      await admin`drop owned by ${admin(role)}`;
      await admin`drop role ${admin(role)}`;
      await admin.end();
    }
  },
  30000,
);

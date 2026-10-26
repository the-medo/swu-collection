import { expect, test } from 'bun:test';
import { eq, inArray } from 'drizzle-orm';
import { db } from '../../db';
import { user } from '../../db/schema/auth-schema.ts';
import { deck } from '../../db/schema/deck.ts';
import { deckCard } from '../../db/schema/deck_card.ts';
import { deckInformation } from '../../db/schema/deck_information.ts';
import { createDeckFromList, InvalidDecklistError } from './createDeckFromList.ts';
import { zDeckFromListRequest } from '../../../types/DeckFromList.ts';

const enabled = process.env.SWUBASE_DECK_FROM_LIST_DB_TEST === '1';
if (enabled) {
  const url = new URL(process.env.DATABASE_URL!);
  if (url.hostname !== '127.0.0.1' || !url.pathname.startsWith('/swubase_'))
    throw new Error('Decklist creation tests require an isolated worktree database.');
}

test.skipIf(!enabled)(
  'creates unlisted decks with all boards and metadata atomically',
  async () => {
    const userId = crypto.randomUUID();
    await db.insert(user).values({
      id: userId,
      name: userId,
      displayName: userId,
      email: `${userId}@invalid.local`,
      emailVerified: false,
      currency: 'USD',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const input = zDeckFromListRequest.parse({
      leaderCardId: 'sabine-wren--galvanized-revolutionary',
      baseCardId: 'command-center',
      cards: {
        'battlefield-marine': { 1: 3, 2: 2, 3: 1 },
        resupply: { 1: 0, 3: 1 },
      },
    });
    try {
      const created = await createDeckFromList(userId, input);
      expect(created).toMatchObject({
        userId,
        public: 2,
        format: 1,
        leaderCardId1: input.leaderCardId,
        baseCardId: input.baseCardId,
      });
      const rows = await db
        .select()
        .from(deckCard)
        .where(eq(deckCard.deckId, created.id))
        .orderBy(deckCard.cardId, deckCard.board);
      expect(rows.map(({ cardId, board, quantity }) => ({ cardId, board, quantity }))).toEqual([
        { cardId: 'battlefield-marine', board: 1, quantity: 3 },
        { cardId: 'battlefield-marine', board: 2, quantity: 2 },
        { cardId: 'battlefield-marine', board: 3, quantity: 1 },
        { cardId: 'resupply', board: 3, quantity: 1 },
      ]);
      expect(
        await db.select().from(deckInformation).where(eq(deckInformation.deckId, created.id)),
      ).toMatchObject([{ aspectAggression: 1, aspectHeroism: 1, aspectCommand: 1 }]);
      for (const invalid of [
        { ...input, leaderCardId: 'battlefield-marine' },
        { ...input, baseCardId: 'missing-base' },
        { ...input, cards: { 'missing-card': { 1: 1 } } },
        { ...input, cards: { 'command-center': { 1: 1 } } },
      ]) {
        await expect(createDeckFromList(userId, invalid)).rejects.toBeInstanceOf(
          InvalidDecklistError,
        );
      }
      // Bypass the HTTP schema to force a database failure after the deck insert.
      await expect(
        createDeckFromList(userId, {
          ...input,
          cards: { 'battlefield-marine': { 1: 2_147_483_648 } },
        }),
      ).rejects.toThrow();
      expect(await db.select({ id: deck.id }).from(deck).where(eq(deck.userId, userId))).toEqual([
        { id: created.id },
      ]);
    } finally {
      const created = await db.select({ id: deck.id }).from(deck).where(eq(deck.userId, userId));
      const ids = created.map(row => row.id);
      if (ids.length) {
        await db.delete(deckCard).where(inArray(deckCard.deckId, ids));
        await db.delete(deckInformation).where(inArray(deckInformation.deckId, ids));
        await db.delete(deck).where(inArray(deck.id, ids));
      }
      await db.delete(user).where(eq(user.id, userId));
    }
  },
  20000,
);

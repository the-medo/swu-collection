import { and, eq } from 'drizzle-orm';
import { db } from '../../db';
import { deck as deckTable } from '../../db/schema/deck.ts';
import { deckCard as deckCardTable } from '../../db/schema/deck_card.ts';
import { deckImportSource } from '../../db/schema/deck_import_source.ts';
import { getMergedCardList } from '../cards/cardListProvider.ts';
import {
  type DeckBuilder,
  type ExternalDeck,
  parseImportedDeck,
  type ParsedImportedDeck,
} from './deckBuilders.ts';
import { updateDeckInformation } from './updateDeckInformation.ts';

export const importDeckForUser = async ({
  userId,
  builder,
  deckId,
  sourceDeck,
  format,
}: {
  userId: string;
  builder: DeckBuilder;
  deckId: string;
  sourceDeck: ExternalDeck;
  format: number;
}) => {
  const parsedDeck = parseImportedDeck(sourceDeck, await getMergedCardList());
  const description = describeImportErrors(parsedDeck.errors);
  const now = new Date();

  const newDeck = await db.transaction(async tx => {
    const [createdDeck] = await tx
      .insert(deckTable)
      .values({
        userId,
        format,
        name: parsedDeck.name,
        leaderCardId1: parsedDeck.leaderCardId1,
        leaderCardId2: parsedDeck.leaderCardId2,
        baseCardId: parsedDeck.baseCardId,
        public: 2,
        description,
      })
      .returning();

    if (!createdDeck) throw new Error('Failed to create imported deck.');

    if (parsedDeck.cards.length > 0) {
      await tx
        .insert(deckCardTable)
        .values(parsedDeck.cards.map(card => ({ ...card, deckId: createdDeck.id })));
    }

    await tx.insert(deckImportSource).values({
      deckId: createdDeck.id,
      source: builder.source,
      sourceDeckId: deckId,
      createdAt: now,
      refreshedAt: now,
    });

    return createdDeck;
  });

  await updateDeckInformation(newDeck.id);
  return { deck: newDeck, errors: parsedDeck.errors };
};

export const refreshImportedDeckForUser = async ({
  deckId,
  userId,
  parsedDeck,
}: {
  deckId: string;
  userId: string;
  parsedDeck: ParsedImportedDeck;
}) => {
  const refreshedDeck = await db.transaction(async tx => {
    const [updatedDeck] = await tx
      .update(deckTable)
      .set({
        leaderCardId1: parsedDeck.leaderCardId1,
        leaderCardId2: parsedDeck.leaderCardId2,
        baseCardId: parsedDeck.baseCardId,
        updatedAt: new Date(),
      })
      .where(and(eq(deckTable.id, deckId), eq(deckTable.userId, userId)))
      .returning();

    if (!updatedDeck) throw new Error('Imported deck no longer exists.');

    await tx.delete(deckCardTable).where(eq(deckCardTable.deckId, deckId));
    if (parsedDeck.cards.length > 0) {
      await tx.insert(deckCardTable).values(parsedDeck.cards.map(card => ({ ...card, deckId })));
    }
    await tx
      .update(deckImportSource)
      .set({ refreshedAt: new Date() })
      .where(eq(deckImportSource.deckId, deckId));

    return updatedDeck;
  });

  await updateDeckInformation(refreshedDeck.id);
  return { deck: refreshedDeck, errors: parsedDeck.errors };
};

export const describeImportErrors = (errors: string[]) =>
  errors.length > 0
    ? `There was a problem pairing these cards to our system. Please add them manually: ${errors.join('; ')}`
    : '';

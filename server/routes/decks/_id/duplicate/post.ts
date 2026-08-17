import { Hono } from 'hono';
import type { AuthExtension } from '../../../../auth/auth.ts';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '../../../../db';
import { deck as deckTable } from '../../../../db/schema/deck.ts';
import { deckCard as deckCardTable } from '../../../../db/schema/deck_card.ts';
import { updateDeckInformation } from '../../../../lib/decks/updateDeckInformation.ts';
import { cardPoolDecks, cardPoolDeckCards } from '../../../../db/schema/card_pool_deck.ts';
import { CardPoolLocation } from '../../../../../shared/types/cardPools.ts';
import { resolveDeckReference } from '../../../../lib/decks/resolveDeckReference.ts';
import { canReadDeck, getDeckPermissions } from '../../../../lib/decks/getDeckPermissions.ts';
import {
  loadCurrentVersionedCards,
  reconstructDeckVersion,
} from '../../../../lib/decks/deckVersionRepository.ts';

export const deckIdDuplicatePostRoute = new Hono<AuthExtension>().post('/', async c => {
  const referenceId = z.guid().parse(c.req.param('id'));
  const user = c.get('user');
  if (!user) return c.json({ message: 'Unauthorized' }, 401);

  // 1. Get the source deck
  const resolved = await resolveDeckReference(referenceId);
  const sourceDeck = resolved?.deck;

  if (!sourceDeck) {
    return c.json({ message: "Source deck doesn't exist" }, 404);
  }

  // 2. Check if the deck is public/unlisted or owned by the user
  const permissions = await getDeckPermissions(
    sourceDeck,
    user.id,
    false,
    resolved!.reference.kind,
  );
  if (!canReadDeck(sourceDeck, permissions)) {
    return c.json({ message: 'Unauthorized to duplicate this deck' }, 403);
  }

  // 3. Create a new deck as a copy
  const sourceMetadata = resolved!.version?.sealedAt
    ? {
        name: resolved!.version.name ?? sourceDeck.name,
        description: resolved!.version.description ?? '',
        format: resolved!.version.format ?? sourceDeck.format,
        leaderCardId1: resolved!.version.leaderCardId1,
        leaderCardId2: resolved!.version.leaderCardId2,
        baseCardId: resolved!.version.baseCardId,
      }
    : sourceDeck;
  const newDeckName = `Copy of ${sourceMetadata.name}`;

  const newDeck = (
    await db
      .insert(deckTable)
      .values({
        userId: user.id,
        format: sourceMetadata.format,
        name: newDeckName,
        description: sourceMetadata.description,
        leaderCardId1: sourceMetadata.leaderCardId1,
        leaderCardId2: sourceMetadata.leaderCardId2,
        baseCardId: sourceMetadata.baseCardId,
        public: 2, // Always set new copies to unlisted
        cardPoolId: sourceDeck.cardPoolId,
      })
      .returning()
  )[0];

  // 4. Check if source deck is associated with a card pool
  const sourcePoolDeck = (
    await db.select().from(cardPoolDecks).where(eq(cardPoolDecks.deckId, sourceDeck.id))
  )[0];

  if (sourcePoolDeck) {
    // Source is a card pool deck
    // 4a. Create a new row in card_pool_decks for the duplicated deck
    await db.insert(cardPoolDecks).values({
      deckId: newDeck.id,
      cardPoolId: sourcePoolDeck.cardPoolId,
      userId: user.id,
      visibility: 'unlisted',
    });

    // 4b. Copy all rows from card_pool_deck_cards for the new deck too,
    // keeping 'deck' as 'deck' and moving all others to 'pool'
    const sourceCpCards = await db
      .select()
      .from(cardPoolDeckCards)
      .where(eq(cardPoolDeckCards.deckId, sourceDeck.id));

    if (sourceCpCards.length > 0) {
      await db.insert(cardPoolDeckCards).values(
        sourceCpCards.map(cp => ({
          deckId: newDeck.id,
          cardPoolNumber: cp.cardPoolNumber,
          location: cp.location === 'deck' ? CardPoolLocation.Deck : CardPoolLocation.Pool,
        })),
      );
    }
  } else {
    // Not a card pool deck: proceed with copying deck_card rows
    const sourceCards = resolved!.version
      ? resolved!.version.sealedAt
        ? (await reconstructDeckVersion(db, sourceDeck.id, resolved!.version.versionNumber)).cards
        : await loadCurrentVersionedCards(db, sourceDeck.id)
      : await db.select().from(deckCardTable).where(eq(deckCardTable.deckId, sourceDeck.id));

    if (sourceCards.length > 0) {
      await db.insert(deckCardTable).values(
        sourceCards.map(card => ({
          deckId: newDeck.id,
          cardId: card.cardId,
          board: card.board,
          note: card.note,
          quantity: card.quantity,
        })),
      );
    }
  }

  // 6. Update deck information
  await updateDeckInformation(newDeck.id);

  return c.json(
    {
      message: 'Deck duplicated successfully',
      data: newDeck,
    },
    201,
  );
});

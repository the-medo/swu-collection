import { Hono } from 'hono';
import { z } from 'zod';
import { and, eq, getTableColumns } from 'drizzle-orm';
import { deck as deckTable } from '../../../../db/schema/deck.ts';
import { deckCard as deckCardTable } from '../../../../db/schema/deck_card.ts';
import { cardPoolDeckCards } from '../../../../db/schema/card_pool_deck.ts';
import { cardPoolCards } from '../../../../db/schema/card_pool.ts';
import { db } from '../../../../db';
import type { DeckCard } from '../../../../../types/ZDeckCard.ts';
import type { AuthExtension } from '../../../../auth/auth.ts';
import { transformCardPoolDeckCardsToDeckCards } from '../../../../lib/decks/transformCardPoolDeckCards.ts';
import { getMergedCardList } from '../../../../lib/cards/cardListProvider.ts';
import { canViewDeck, isAdminUser } from '../../../../lib/decks/deckBranchAccess.ts';

export const deckIdCardGetRoute = new Hono<AuthExtension>().get('/', async c => {
  const paramDeckId = z.guid().parse(c.req.param('id'));
  const user = c.get('user');
  const isAdmin = await isAdminUser(user?.id);

  // First, get deck to know if it has a cardPoolId and ensure access rights
  const deckRow = (
    await db
      .select()
      .from(deckTable)
      .where(eq(deckTable.id, paramDeckId))
  )[0];

  if (!deckRow || !(await canViewDeck(deckRow, user?.id, isAdmin))) {
    return c.json({ message: "Deck doesn't exist or you don't have access to it" }, 404);
  }

  // If no card pool is linked, return data as before from deck_card table
  if (!deckRow.cardPoolId) {
    const { deckId, ...columns } = getTableColumns(deckCardTable);
    const deckContents = (await db
      .select(columns)
      .from(deckCardTable)
      .innerJoin(deckTable, eq(deckCardTable.deckId, deckTable.id))
      .where(eq(deckTable.id, paramDeckId))) as unknown as DeckCard[];

    return c.json({ data: deckContents });
  }

  // Otherwise, collect deck cards from card_pool_deck_cards mapped to card ids via card_pool_cards
  const poolRows = await db
    .select({
      cardId: cardPoolCards.cardId,
      location: cardPoolDeckCards.location,
    })
    .from(cardPoolDeckCards)
    .innerJoin(deckTable, eq(cardPoolDeckCards.deckId, deckTable.id))
    .innerJoin(
      cardPoolCards,
      and(
        eq(cardPoolCards.cardPoolId, deckTable.cardPoolId),
        eq(cardPoolCards.cardPoolNumber, cardPoolDeckCards.cardPoolNumber),
      ),
    )
    .where(eq(deckTable.id, paramDeckId));

  const transformed = transformCardPoolDeckCardsToDeckCards(
    poolRows,
    paramDeckId,
    await getMergedCardList(),
  );

  return c.json({ data: transformed as unknown as DeckCard[] });
});

import { Hono } from 'hono';
import { z } from 'zod';
import { and, eq, getTableColumns } from 'drizzle-orm';
import { deckCard as deckCardTable } from '../../../../db/schema/deck_card.ts';
import { cardPoolDeckCards } from '../../../../db/schema/card_pool_deck.ts';
import { cardPoolCards } from '../../../../db/schema/card_pool.ts';
import { db } from '../../../../db';
import type { DeckCard } from '../../../../../types/ZDeckCard.ts';
import { auth, type AuthExtension } from '../../../../auth/auth.ts';
import { transformCardPoolDeckCardsToDeckCards } from '../../../../lib/decks/transformCardPoolDeckCards.ts';
import { getMergedCardList } from '../../../../lib/cards/cardListProvider.ts';
import { resolveDeckReference } from '../../../../lib/decks/resolveDeckReference.ts';
import { canReadDeck, getDeckPermissions } from '../../../../lib/decks/getDeckPermissions.ts';
import {
  loadCurrentVersionedCards,
  reconstructDeckVersion,
} from '../../../../lib/decks/deckVersionRepository.ts';

export const deckIdCardGetRoute = new Hono<AuthExtension>().get('/', async c => {
  const referenceId = z.guid().parse(c.req.param('id'));
  const user = c.get('user');
  const resolved = await resolveDeckReference(referenceId);
  if (!resolved) return c.json({ message: "Deck doesn't exist" }, 404);

  const isAdmin = user
    ? (
        await auth.api.userHasPermission({
          body: { userId: user.id, permission: { admin: ['access'] } },
        })
      ).success
    : false;
  const permissions = await getDeckPermissions(
    resolved.deck,
    user?.id ?? null,
    isAdmin,
    resolved.reference.kind,
  );
  if (!canReadDeck(resolved.deck, permissions)) {
    return c.json({ message: "Deck doesn't exist or you don't have access to it" }, 404);
  }

  if (resolved.version) {
    if (resolved.deck.cardPoolId) {
      return c.json({ message: 'Limited decks do not support versions' }, 400);
    }
    const cards = resolved.version.sealedAt
      ? (await reconstructDeckVersion(db, resolved.deck.id, resolved.version.versionNumber)).cards
      : await loadCurrentVersionedCards(db, resolved.deck.id);
    return c.json({
      data: cards.map(card => ({ deckId: resolved.deck.id, ...card })),
      reference: resolved.reference,
    });
  }

  if (!resolved.deck.cardPoolId) {
    const { deckId, ...columns } = getTableColumns(deckCardTable);
    const contents = await db
      .select(columns)
      .from(deckCardTable)
      .where(eq(deckCardTable.deckId, resolved.deck.id));
    return c.json({ data: contents as unknown as DeckCard[], reference: resolved.reference });
  }

  const poolRows = await db
    .select({ cardId: cardPoolCards.cardId, location: cardPoolDeckCards.location })
    .from(cardPoolDeckCards)
    .innerJoin(
      cardPoolCards,
      and(
        eq(cardPoolCards.cardPoolId, resolved.deck.cardPoolId),
        eq(cardPoolCards.cardPoolNumber, cardPoolDeckCards.cardPoolNumber),
      ),
    )
    .where(eq(cardPoolDeckCards.deckId, resolved.deck.id));
  const transformed = transformCardPoolDeckCardsToDeckCards(
    poolRows,
    resolved.deck.id,
    await getMergedCardList(),
  );
  return c.json({ data: transformed as unknown as DeckCard[], reference: resolved.reference });
});

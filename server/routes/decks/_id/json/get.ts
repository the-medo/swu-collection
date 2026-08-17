import { Hono } from 'hono';
import { z } from 'zod';
import { and, eq, inArray } from 'drizzle-orm';
import type { AuthExtension } from '../../../../auth/auth.ts';
import { auth } from '../../../../auth/auth.ts';
import { deckCard as deckCardTable } from '../../../../db/schema/deck_card.ts';
import { cardPoolDeckCards } from '../../../../db/schema/card_pool_deck.ts';
import { cardPoolCards } from '../../../../db/schema/card_pool.ts';
import { user as userTable } from '../../../../db/schema/auth-schema.ts';
import { db } from '../../../../db';
import { getMergedCardList } from '../../../../lib/cards/cardListProvider.ts';
import { createDeckJsonExport } from '../../../../lib/decks/deckExport.ts';
import type { Deck } from '../../../../../types/Deck.ts';
import type { User } from '../../../../../types/User.ts';
import type { DeckCard } from '../../../../../types/ZDeckCard.ts';
import { transformCardPoolDeckCardsToDeckCards } from '../../../../lib/decks/transformCardPoolDeckCards.ts';
import { resolveDeckReference } from '../../../../lib/decks/resolveDeckReference.ts';
import { canReadDeck, getDeckPermissions } from '../../../../lib/decks/getDeckPermissions.ts';
import {
  loadCurrentVersionedCards,
  reconstructDeckVersion,
} from '../../../../lib/decks/deckVersionRepository.ts';

export const deckIdJsonGetRoute = new Hono<AuthExtension>().get('/', async c => {
  const rawId = c.req.param('id') ?? '';
  const normalizedId = /^[0-9a-fA-F]{32}$/.test(rawId)
    ? `${rawId.slice(0, 8)}-${rawId.slice(8, 12)}-${rawId.slice(12, 16)}-${rawId.slice(16, 20)}-${rawId.slice(20)}`.toLowerCase()
    : rawId;
  const referenceId = z.guid().parse(normalizedId);
  const user = c.get('user');
  const resolved = await resolveDeckReference(referenceId);
  if (!resolved) {
    return c.json({ message: "Deck doesn't exist or you don't have access to it" }, 404);
  }

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

  const deckOwner = (
    await db.select().from(userTable).where(eq(userTable.id, resolved.deck.userId)).limit(1)
  )[0];
  const cardList = await getMergedCardList();
  let deckCards: DeckCard[];

  if (resolved.version) {
    if (resolved.deck.cardPoolId) {
      return c.json({ message: 'Limited decks do not support versions' }, 400);
    }
    const cards = resolved.version.sealedAt
      ? (await reconstructDeckVersion(db, resolved.deck.id, resolved.version.versionNumber)).cards
      : await loadCurrentVersionedCards(db, resolved.deck.id);
    deckCards = cards.map(card => ({ deckId: resolved.deck.id, ...card }));
  } else if (!resolved.deck.cardPoolId) {
    deckCards = (await db
      .select()
      .from(deckCardTable)
      .where(
        and(eq(deckCardTable.deckId, resolved.deck.id), inArray(deckCardTable.board, [1, 2])),
      )) as DeckCard[];
  } else {
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
    deckCards = transformCardPoolDeckCardsToDeckCards(poolRows, resolved.deck.id, cardList);
  }

  const effectiveDeck = resolved.version?.sealedAt
    ? {
        ...resolved.deck,
        name: resolved.version.name ?? resolved.deck.name,
        description: resolved.version.description ?? '',
        format: resolved.version.format ?? resolved.deck.format,
        leaderCardId1: resolved.version.leaderCardId1,
        leaderCardId2: resolved.version.leaderCardId2,
        baseCardId: resolved.version.baseCardId,
      }
    : resolved.deck;

  return c.json(
    createDeckJsonExport(
      effectiveDeck as unknown as Deck,
      deckCards,
      deckOwner as unknown as User,
      cardList,
    ),
  );
});

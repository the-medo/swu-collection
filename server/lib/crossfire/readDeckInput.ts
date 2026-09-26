import { and, eq, inArray, or } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { z } from 'zod';
import { deck } from '../../db/schema/deck.ts';
import { deckCard } from '../../db/schema/deck_card.ts';
import { cardPoolDeckCards, cardPoolDecks } from '../../db/schema/card_pool_deck.ts';
import { cardPoolCards } from '../../db/schema/card_pool.ts';
import type { CardIdentityCatalog, DeckInput } from '../../../play/admission/decks.ts';

/** Caller supplies the authenticated session user ID (or null for public/shared
 * decks only) and preview-aware catalog.
 * This private helper does not interpret browser identity, grant admin bypass,
 * fetch card data itself, or disclose the source deck to another participant. */
export async function readDeckInput(
  db: PostgresJsDatabase,
  userId: string | null,
  deckId: string,
  catalog: CardIdentityCatalog,
): Promise<DeckInput | null> {
  if (userId !== null) z.string().min(1).max(128).parse(userId);
  z.uuid().parse(deckId);
  return db.transaction(tx => readDeckInputInTransaction(tx, userId, deckId, catalog), {
    isolationLevel: 'repeatable read',
    accessMode: 'read only',
  });
}

/** Reuse the caller's consistent transaction when freezing and persisting admission. */
export async function readDeckInputInTransaction(
  tx: Pick<PostgresJsDatabase, 'select'>,
  userId: string | null,
  deckId: string,
  catalog: CardIdentityCatalog,
): Promise<DeckInput | null> {
  if (userId !== null) z.string().min(1).max(128).parse(userId);
  z.uuid().parse(deckId);
  const [source] = await tx
    .select({
      id: deck.id,
      format: deck.format,
      leader: deck.leaderCardId1,
      leader2: deck.leaderCardId2,
      base: deck.baseCardId,
      cardPoolId: deck.cardPoolId,
      owner: deck.userId,
    })
    .from(deck)
    .where(
      and(
        eq(deck.id, deckId),
        userId === null
          ? inArray(deck.public, [1, 2])
          : or(eq(deck.userId, userId), inArray(deck.public, [1, 2])),
      ),
    );
  if (!source) return null;
  const result: DeckInput = {
    source: { deckId, format: source.format, kind: source.cardPoolId ? 'limited' : 'normal' },
    leader: source.leader,
    leader2: source.leader2,
    base: source.base,
    mainboard: [],
    sideboard: [],
    reserve: [],
  };
  if (!source.cardPoolId) {
    const cards = await tx
      .select({ cardId: deckCard.cardId, quantity: deckCard.quantity, board: deckCard.board })
      .from(deckCard)
      .where(and(eq(deckCard.deckId, deckId), inArray(deckCard.board, [1, 2])));
    for (const row of cards) {
      if (row.quantity === 0) continue;
      (row.board === 1 ? result.mainboard : result.sideboard).push({
        cardId: row.cardId,
        quantity: row.quantity,
      });
    }
  } else {
    // The two deck metadata records must agree; a stale public copy must not
    // grant access to a private limited deck. Pool-wide visibility is separate.
    const [poolDeck] = await tx
      .select({ id: cardPoolDecks.deckId })
      .from(cardPoolDecks)
      .where(
        and(
          eq(cardPoolDecks.deckId, deckId),
          eq(cardPoolDecks.cardPoolId, source.cardPoolId),
          eq(cardPoolDecks.userId, source.owner),
          userId === null
            ? inArray(cardPoolDecks.visibility, ['public', 'unlisted'])
            : or(
                eq(cardPoolDecks.userId, userId),
                inArray(cardPoolDecks.visibility, ['public', 'unlisted']),
              ),
        ),
      );
    if (!poolDeck) return null;
    const cards = await tx
      .select({ cardId: cardPoolCards.cardId, location: cardPoolDeckCards.location })
      .from(cardPoolDeckCards)
      .leftJoin(
        cardPoolCards,
        and(
          eq(cardPoolCards.cardPoolId, source.cardPoolId),
          eq(cardPoolCards.cardPoolNumber, cardPoolDeckCards.cardPoolNumber),
        ),
      )
      .where(eq(cardPoolDeckCards.deckId, deckId));
    for (const row of cards) {
      if (row.location === 'trash') continue;
      if (!row.cardId) throw new Error('Crossfire limited deck has an unresolved physical card');
      const printed = Object.hasOwn(catalog, row.cardId) ? catalog[row.cardId]?.type : undefined;
      if (printed === 'Leader' || printed === 'Base') continue;
      (row.location === 'deck' ? result.mainboard : result.reserve).push({
        cardId: row.cardId,
        quantity: 1,
      });
    }
  }
  return result;
}

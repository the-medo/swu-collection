import type { DeckCard } from '../../../types/ZDeckCard.ts';
import { cardList } from '../../db/lists.ts';

type Location = 'deck' | 'pool' | 'trash' | (string & {});

export interface CardPoolDeckCardLike {
  cardId: string;
  location: Location;
}

/**
 * Transforms raw card pool deck card rows into DeckCard[] for a given deck.
 * Rules:
 * - location "deck" maps to board 1
 * - any other location maps to board 2 (e.g., "pool", "trash")
 * - multiple rows for the same cardId should be summed (quantity is the count of rows)
 */
export function transformCardPoolDeckCardsToDeckCards(
  rows: CardPoolDeckCardLike[],
  deckId: string,
): DeckCard[] {
  const mapKey = (cardId: string, board: number) => `${cardId}::${board}`;
  const aggregated = new Map<string, DeckCard>();

  for (const row of rows) {
    if (cardList[row.cardId]?.type === 'Leader' || cardList[row.cardId]?.type === 'Base') continue;
    const board = row.location === 'deck' ? 1 : 2;
    const key = mapKey(row.cardId, board);
    const existing = aggregated.get(key);
    if (existing) {
      existing.quantity += 1;
    } else {
      aggregated.set(key, {
        deckId,
        cardId: row.cardId,
        board,
        note: '',
        quantity: 1,
      });
    }
  }

  return Array.from(aggregated.values());
}

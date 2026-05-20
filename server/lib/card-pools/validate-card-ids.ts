import type { CardList } from '../../../lib/swu-resources/types.ts';

/**
 * Returns a list of invalid card ids (those not present in the merged card list).
 * The result is unique and keeps the first-seen order of invalid items.
 */
export function findInvalidCardIds(cardIds: string[], cardList: CardList): string[] {
  const seen = new Set<string>();
  const invalid: string[] = [];
  for (const id of cardIds) {
    if (!cardList[id] && !seen.has(id)) {
      seen.add(id);
      invalid.push(id);
    }
  }
  return invalid;
}

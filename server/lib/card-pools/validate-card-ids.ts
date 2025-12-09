import { cardList } from '../../db/lists.ts';

/**
 * Returns a list of invalid card ids (those not present in cardList).
 * The result is unique and keeps the first-seen order of invalid items.
 */
export function findInvalidCardIds(cardIds: string[]): string[] {
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

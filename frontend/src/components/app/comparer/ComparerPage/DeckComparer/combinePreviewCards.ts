import type { CardComparisonData } from '../types.ts';

/** Prefer cards played by every deck, counting main and sideboard together. */
export function combinePreviewCardIds(cards: CardComparisonData[], otherDeckIds: string[]) {
  const appearances = new Map<string, Set<string>>();
  for (const card of cards) {
    if (card.board !== 1 && card.board !== 2) continue;
    const decks = appearances.get(card.cardId) ?? new Set<string>();
    // The empty key represents the main deck; deck IDs are nonempty UUIDs.
    if (card.mainDeckQuantity > 0) decks.add('');
    for (const id of otherDeckIds) {
      if ((card.otherDecksQuantities[id] ?? 0) > 0) decks.add(id);
    }
    if (decks.size) appearances.set(card.cardId, decks);
  }

  const shared = [...appearances.keys()].filter(
    id => appearances.get(id)!.size === otherDeckIds.length + 1,
  );
  return [...new Set([...shared, ...appearances.keys()])].slice(0, 2);
}

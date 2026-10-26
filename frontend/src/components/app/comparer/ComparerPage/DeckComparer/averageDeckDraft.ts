import type { CardComparisonData } from '../types.ts';
import {
  MAX_DECKLIST_QUANTITY,
  type DeckBoard,
  type DecklistCards,
} from '../../../../../../../types/DeckFromList.ts';

export type AverageDeckEntry = { quantity: string; board: DeckBoard };
export type AverageDeckEntries = Record<string, AverageDeckEntry>;
export type AverageDeckDraft = {
  entries: AverageDeckEntries;
  leader?: string;
  secondLeader?: string;
  base?: string;
  name?: string;
};
export type AverageDeckEditor = {
  entries: AverageDeckEntries;
  update: (key: string, entry: AverageDeckEntry) => void;
  disabled: boolean;
};

export const averageDeckRowKey = (card: Pick<CardComparisonData, 'cardId' | 'board'>) =>
  `${card.cardId}-${card.board}`;

export function defaultAverageDeckEntries(
  cards: CardComparisonData[],
  otherDeckIds: string[],
): AverageDeckEntries {
  return Object.fromEntries(
    cards
      .filter(card => card.board === 1 || card.board === 2)
      .map(card => {
        const average =
          (card.mainDeckQuantity +
            otherDeckIds.reduce((sum, id) => sum + (card.otherDecksQuantities[id] ?? 0), 0)) /
          (otherDeckIds.length + 1);
        return [
          averageDeckRowKey(card),
          {
            quantity: String(average < 0.5 ? 1 : Math.round(average)),
            board: average < 0.5 ? 3 : (card.board as DeckBoard),
          },
        ];
      }),
  );
}

export function isValidDeckCount(value: string) {
  const count = Number(value);
  return /^\d+$/.test(value) && Number.isSafeInteger(count) && count <= MAX_DECKLIST_QUANTITY;
}

// Walk each source card/board once, independent of overlapping display groups (traits, keywords).
export function averageDeckPayload(cards: CardComparisonData[], entries: AverageDeckEntries) {
  const result: DecklistCards = Object.create(null);
  const seen = new Set<string>();
  let valid = true;
  for (const card of cards) {
    const key = averageDeckRowKey(card);
    if (seen.has(key) || (card.board !== 1 && card.board !== 2)) continue;
    seen.add(key);
    const entry = entries[key];
    if (!entry || !isValidDeckCount(entry.quantity)) {
      valid = false;
      continue;
    }
    const quantity = Number(entry.quantity);
    if (!quantity) continue;
    const boards = result[card.cardId] ?? {};
    const total = (boards[entry.board] ?? 0) + quantity;
    if (total > MAX_DECKLIST_QUANTITY) valid = false;
    boards[entry.board] = total;
    result[card.cardId] = boards;
  }
  return { cards: result, valid };
}

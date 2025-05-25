// Types for the comparer components

/**
 * Data structure for card comparison
 */
export interface CardComparisonData {
  cardId: string;
  mainDeckQuantity: number;
  otherDecksQuantities: Record<string, number>;
  board: number; // 1 = main deck, 2 = sideboard, 3 = maybeboard
  cardType?: string;
}
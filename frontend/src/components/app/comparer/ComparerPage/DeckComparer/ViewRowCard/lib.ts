import { CardComparisonData } from '../../types.ts';

/**
 * Formats a difference value with a + sign if positive
 */
export const formatDifference = (diff: number, toFixed?: boolean): string => {
  if (toFixed) {
    return diff > 0 ? `+${diff.toFixed(1)}` : `${diff.toFixed(1)}`;
  }
  return diff > 0 ? `+${diff}` : `${diff}`;
};

/**
 * Calculates average quantity from an array of quantities
 */
export const calculateAverage = (quantities: number[]): { avg: number; formatted: string } => {
  const sum = quantities.reduce((acc, qty) => acc + qty, 0);
  const avg = sum / quantities.length;
  const formatted = Number.isInteger(avg) ? String(avg) : avg.toFixed(1);
  return { avg, formatted };
};

/**
 * Gets the text color class based on the difference value
 */
export const getDiffColorClass = (diff: number): string => {
  return diff > 0 ? 'text-green-600' : 'text-red-600';
};

/**
 * Gets all quantities for a card across decks
 */
export const getCardQuantities = (
  card: CardComparisonData,
  otherDeckIds: string[]
): number[] => {
  const quantities = [card.mainDeckQuantity];

  // Add quantities from other decks
  otherDeckIds.forEach(deckId => {
    quantities.push(card.otherDecksQuantities[deckId] || 0);
  });

  return quantities;
};

/**
 * Calculates totals for a group of cards for each deck
 */
export const calculateGroupTotals = (
  cards: CardComparisonData[],
  otherDeckIds: string[]
): { mainDeckTotal: number; otherDeckTotals: Record<string, number>; allTotals: number[] } => {
  const mainDeckTotal = cards.reduce((sum, card) => sum + card.mainDeckQuantity, 0);
  const otherDeckTotals: Record<string, number> = {};

  otherDeckIds.forEach(deckId => {
    otherDeckTotals[deckId] = cards.reduce(
      (sum, card) => sum + (card.otherDecksQuantities[deckId] || 0),
      0
    );
  });

  const allTotals = [mainDeckTotal, ...Object.values(otherDeckTotals)];

  return { mainDeckTotal, otherDeckTotals, allTotals };
};

/**
 * Calculates the average for a group with appropriate formatting
 */
export const calculateAndRenderGroupAverage = (mainDeckTotal: number, allTotals: number[]): {
  avgTotal: number;
  formattedAvgTotal: string;
  totalDiff: number;
  hasDiff: boolean;
  textColorClass: string;
  formattedDiff: string;
} => {
  // Calculate average total for the group
  const avgTotal = allTotals.reduce((sum, total) => sum + total, 0) / allTotals.length;
  const formattedAvgTotal = Number.isInteger(avgTotal) ? String(avgTotal) : avgTotal.toFixed(1);

  // Calculate diff for the group total average
  const totalDiff = avgTotal - mainDeckTotal;
  const hasDiff = Math.abs(totalDiff) >= 0.01;

  // Determine text color and format based on diff
  const textColorClass = getDiffColorClass(totalDiff);
  const formattedDiff = formatDifference(totalDiff, true);

  return {
    avgTotal,
    formattedAvgTotal,
    totalDiff,
    hasDiff,
    textColorClass,
    formattedDiff
  };
};

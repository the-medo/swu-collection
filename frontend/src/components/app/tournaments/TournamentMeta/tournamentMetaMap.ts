import type { AnalysisDataItem } from './tournamentMetaLib.ts';

export const META_MAP_MIN_BUBBLE_SIZE = 16;

export interface MetaMapPoint {
  key: string;
  count: number;
  wins: number;
  losses: number;
  x: number;
  y: number;
  size: number;
}

export const buildMetaMapPoints = (
  analysisData: readonly AnalysisDataItem[],
  totalDecks: number,
): MetaMapPoint[] => {
  if (totalDecks <= 0) return [];

  const recorded = analysisData.filter(
    item => item.count > 0 && (item.wins ?? 0) + (item.losses ?? 0) > 0,
  );
  const maximumCount = Math.max(1, ...recorded.map(item => item.count));

  // Draw larger bubbles first so smaller groups remain reachable when they overlap.
  return [...recorded]
    .sort((a, b) => b.count - a.count)
    .map(item => {
      const wins = item.wins ?? 0;
      const losses = item.losses ?? 0;
      return {
        key: item.key,
        count: item.count,
        wins,
        losses,
        x: (wins / (wins + losses)) * 100,
        // Keep the selected field as the denominator, including groups without records.
        y: (item.count / totalDecks) * 100,
        // Area follows occurrences above a visible minimum for small samples.
        size: Math.max(META_MAP_MIN_BUBBLE_SIZE, 56 * Math.sqrt(item.count / maximumCount)),
      };
    });
};

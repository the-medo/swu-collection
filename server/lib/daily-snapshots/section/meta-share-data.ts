import type { SectionMetaShare2WeeksDataPoint } from '../../../../types/DailySnapshots.ts';

export const buildMetaShareDataPoints = (
  rows: SectionMetaShare2WeeksDataPoint[],
): SectionMetaShare2WeeksDataPoint[] =>
  // Keep every combination exactly once; the UI groups leaders and equivalent bases.
  rows.map(row => ({
    leaderCardId: row.leaderCardId,
    baseCardId: row.baseCardId,
    total: row.total ?? 0,
    top8: row.top8 ?? 0,
    winners: row.winners ?? 0,
  }));

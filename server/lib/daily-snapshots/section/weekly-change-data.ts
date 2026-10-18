import type { SectionWeeklyChangeDataPoint } from '../../../../types/DailySnapshots.ts';

type WeeklyChangeRow = {
  leaderCardId: string;
  baseCardId: string;
  winners: number;
  top8: number;
  total: number;
};

const keyOf = (r: { leaderCardId: string; baseCardId: string }) =>
  `${r.leaderCardId}|${r.baseCardId}`;

export const buildWeeklyChangeDataPoints = (
  rowsWeek1: WeeklyChangeRow[],
  rowsWeek2: WeeklyChangeRow[],
): SectionWeeklyChangeDataPoint[] => {
  const map1 = new Map(rowsWeek1.map(row => [keyOf(row), row]));
  const map2 = new Map(rowsWeek2.map(row => [keyOf(row), row]));
  const allKeys = new Set([...map1.keys(), ...map2.keys()]);

  // Keep every combination: leaders and equivalent bases are grouped by the UI.
  // Truncating here loses counts and can change both the top leaders and their ranks.
  return [...allKeys].map(key => {
    const week1 = map1.get(key);
    const week2 = map2.get(key);
    const row = (week1 ?? week2)!;
    return {
      leaderCardId: row.leaderCardId,
      baseCardId: row.baseCardId,
      week1: {
        total: week1?.total ?? 0,
        top8: week1?.top8 ?? 0,
        champions: week1?.winners ?? 0,
      },
      week2: {
        total: week2?.total ?? 0,
        top8: week2?.top8 ?? 0,
        champions: week2?.winners ?? 0,
      },
    };
  });
};

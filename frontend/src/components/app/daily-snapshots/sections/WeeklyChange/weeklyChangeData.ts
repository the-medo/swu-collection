import type { SectionWeeklyChangeDataPoint } from '../../../../../../../types/DailySnapshots.ts';
import { getSnapshotDeckKey, isKnownSnapshotDeckKey } from '../snapshotDeckKey.ts';

type Counts = SectionWeeklyChangeDataPoint['week1'];
export type WeeklyChangeMetric = keyof Counts;
type Week = 'week1' | 'week2';
type Group = { id: string; week1: Counts; week2: Counts };

export type WeeklyChangeStats = {
  grouped: Group[];
  totals: Record<Week, Counts>;
};

const emptyCounts = (): Counts => ({ total: 0, top8: 0, champions: 0 });
const weeks = ['week1', 'week2'] as const;
const metrics = ['total', 'top8', 'champions'] as const;

export const getWeeklyChangeStats = (
  dataPoints: SectionWeeklyChangeDataPoint[],
  view: 'leaders' | 'leadersAndBase',
): WeeklyChangeStats => {
  const totals = { week1: emptyCounts(), week2: emptyCounts() };
  const grouped = new Map<string, Group>();

  for (const point of dataPoints) {
    // Keep unknown decks and legacy remainder rows in the denominator.
    for (const week of weeks) {
      for (const metric of metrics) totals[week][metric] += point[week][metric] ?? 0;
    }
    const id = getSnapshotDeckKey(point.leaderCardId, point.baseCardId, view);
    if (!isKnownSnapshotDeckKey(id)) continue;
    const group = grouped.get(id) ?? { id, week1: emptyCounts(), week2: emptyCounts() };
    for (const week of weeks) {
      for (const metric of metrics) group[week][metric] += point[week][metric] ?? 0;
    }
    grouped.set(id, group);
  }

  return { grouped: [...grouped.values()], totals };
};

export const buildWeeklyChangeChartData = (
  { grouped, totals }: WeeklyChangeStats,
  metric: WeeklyChangeMetric,
  labels: [string, string],
  topCount: number,
) => {
  const included = new Set<string>();
  for (const week of weeks) {
    const ranked = [...grouped]
      .filter(group => group[week][metric] > 0)
      .sort((a, b) => b[week][metric] - a[week][metric] || a.id.localeCompare(b.id));
    const selected = metric === 'champions' ? ranked : ranked.slice(0, topCount);
    selected.forEach(group => included.add(group.id));
  }

  return grouped
    .filter(group => included.has(group.id))
    .map(group => ({
      id: group.id,
      data: weeks.map((week, index) => ({
        x: labels[index],
        // Use the complete weekly totals, including unknown decks and hidden series.
        y: totals[week][metric] > 0 ? (group[week][metric] / totals[week][metric]) * 100 : 0,
      })),
    }))
    .sort(
      (a, b) => b.data[0].y + b.data[1].y - a.data[0].y - a.data[1].y || a.id.localeCompare(b.id),
    );
};

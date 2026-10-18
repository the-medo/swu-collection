import type { SectionMetaShare2WeeksDataPoint } from '../../../../../../../types/DailySnapshots.ts';
import { getSnapshotDeckKey, isKnownSnapshotDeckKey } from '../snapshotDeckKey.ts';

export type ProcessedDataItem = {
  key: string;
  total: number;
  top8: number;
  winners: number;
  sortValue: number;
};

export const getMetaShareData = (
  points: SectionMetaShare2WeeksDataPoint[],
  view: 'leaders' | 'leadersAndBase',
  part: 'total' | 'top8' | 'winners',
): ProcessedDataItem[] => {
  const grouped = new Map<string, ProcessedDataItem>();
  for (const point of points) {
    const key = getSnapshotDeckKey(point.leaderCardId, point.baseCardId, view);
    const row = grouped.get(key) ?? { key, total: 0, top8: 0, winners: 0, sortValue: 0 };
    row.total += point.total ?? 0;
    row.top8 += point.top8 ?? 0;
    row.winners += point.winners ?? 0;
    row.sortValue = row[part];
    grouped.set(key, row);
  }
  return [...grouped.values()].sort((a, b) => {
    const knownOrder =
      Number(isKnownSnapshotDeckKey(b.key)) - Number(isKnownSnapshotDeckKey(a.key));
    return knownOrder || b.sortValue - a.sortValue || a.key.localeCompare(b.key);
  });
};

export const collapseMetaShareData = (
  data: ProcessedDataItem[],
  limit: number,
): ProcessedDataItem[] => {
  const known = data.filter(row => isKnownSnapshotDeckKey(row.key));
  const displayed = known.slice(0, limit);
  // Unknown decks are not other known leaders, and must not consume a ranking slot.
  const remainder = [...known.slice(limit), ...data.filter(row => row.key === 'Others')];
  const others = remainder.reduce(
    (sum, row) => ({
      key: 'Others',
      total: sum.total + row.total,
      top8: sum.top8 + row.top8,
      winners: sum.winners + row.winners,
      sortValue: sum.sortValue + row.sortValue,
    }),
    { key: 'Others', total: 0, top8: 0, winners: 0, sortValue: 0 },
  );
  if (others.total > 0 || others.top8 > 0 || others.winners > 0) displayed.push(others);
  return [...displayed, ...data.filter(row => row.key === 'unknown')];
};

import { describe, expect, it } from 'bun:test';
import type { SectionMetaShare2WeeksDataPoint } from '../../../../../../../types/DailySnapshots.ts';
import { getMetaShareData, collapseMetaShareData } from './metaShareData.ts';
import { getWeeklyChangeStats } from '../WeeklyChange/weeklyChangeData.ts';
import { isKnownSnapshotDeckKey } from '../snapshotDeckKey.ts';

const point = (
  leaderCardId: string,
  baseCardId: string,
  total: number,
): SectionMetaShare2WeeksDataPoint => ({
  leaderCardId,
  baseCardId,
  total,
  top8: 0,
  winners: 0,
});

describe('meta share presentation', () => {
  it('counts leaders with missing bases and combines equivalent bases without waiting for the catalog', () => {
    const points = [
      point('ahsoka', 'mos-eisley', 2),
      point('ahsoka', 'otoh-gunga', 3),
      point('ahsoka', '', 1),
    ];
    expect(getMetaShareData(points, 'leaders', 'total')[0]).toMatchObject({
      key: 'ahsoka',
      total: 6,
    });
    expect(getMetaShareData(points, 'leadersAndBase', 'total')).toEqual([
      { key: 'ahsoka|Cunning', total: 5, top8: 0, winners: 0, sortValue: 5 },
      { key: 'unknown', total: 1, top8: 0, winners: 0, sortValue: 1 },
    ]);
    const weekly = getWeeklyChangeStats(
      points.map(row => ({
        ...row,
        week1: { ...row, champions: row.winners },
        week2: { total: 0, top8: 0, champions: 0 },
      })),
      'leaders',
    );
    expect(weekly.grouped[0].week1.total).toBe(6);
  });

  it('sorts unknown results after known leaders regardless of input order', () => {
    const points = [
      point('known', 'data-vault', 3),
      point('', '', 50),
      point('other', 'data-vault', 2),
    ];
    const expected = ['known', 'other', 'unknown'];
    expect(getMetaShareData(points, 'leaders', 'total').map(row => row.key)).toEqual(expected);
    expect(getMetaShareData([...points].reverse(), 'leaders', 'total').map(row => row.key)).toEqual(
      expected,
    );
    expect(isKnownSnapshotDeckKey('unknown')).toBe(false);
    expect(isKnownSnapshotDeckKey('Others')).toBe(false);
  });

  it('retains full totals when table and pie collapse the field, with separate unknown and remainder entries', () => {
    const points = Array.from({ length: 25 }, (_, index) => ({
      ...point(`leader-${index}`, 'data-vault', index + 1),
      top8: index % 3,
      winners: index % 2,
    }));
    points.push({ ...point('others', '', 7), top8: 2, winners: 1 });
    points.push({ ...point('unknown', '', 40), top8: 3, winners: 1 });
    for (const metric of ['total', 'top8', 'winners'] as const) {
      const data = getMetaShareData(points, 'leaders', metric);
      for (const limit of [5, 20]) {
        const collapsed = collapseMetaShareData(data, limit);
        expect(collapsed.filter(row => isKnownSnapshotDeckKey(row.key))).toHaveLength(limit);
        expect(collapsed.filter(row => row.key === 'Others')).toHaveLength(1);
        expect(collapsed.filter(row => row.key === 'unknown')).toHaveLength(1);
        for (const field of ['total', 'top8', 'winners', 'sortValue'] as const) {
          expect(collapsed.reduce((sum, row) => sum + row[field], 0)).toBe(
            data.reduce((sum, row) => sum + row[field], 0),
          );
        }
      }
    }
  });

  it('handles empty and unknown-only fields without inventing a known leader', () => {
    expect(collapseMetaShareData(getMetaShareData([], 'leaders', 'total'), 5)).toEqual([]);
    const data = getMetaShareData([point('', '', 4)], 'leaders', 'total');
    expect(collapseMetaShareData(data, 5)).toEqual(data);
  });
});

import { describe, expect, test } from 'bun:test';
import { buildMetaMapPoints } from './tournamentMetaMap.ts';

describe('Meta map coordinates', () => {
  test('uses precise records and the selected field denominator, including unplottable groups', () => {
    const points = buildMetaMapPoints(
      [
        { key: 'A', count: 2, wins: 2, losses: 1, winrate: 66.7, percentage: 33.3 },
        { key: 'no-record', count: 3, wins: 0, losses: 0 },
        { key: 'losses-only', count: 1, wins: 0, losses: 5 },
      ],
      6,
    );
    expect(points).toHaveLength(2);
    expect(points[0].x).toBeCloseTo(200 / 3, 10);
    expect(points[0].y).toBeCloseTo(100 / 3, 10);
    expect(points[1].x).toBe(0);
    expect(points[1].y).toBeCloseTo(100 / 6, 10);
  });

  test('scales bubble area by occurrences and draws larger groups first', () => {
    const points = buildMetaMapPoints(
      [
        { key: 'small', count: 1, wins: 1 },
        { key: 'large', count: 9, wins: 9 },
      ],
      10,
    );
    expect(points.map(point => point.key)).toEqual(['large', 'small']);
    expect((points[0].size / points[1].size) ** 2).toBeCloseTo(9);
  });

  test('recomputes both axes and counts for a selected stage', () => {
    const all = buildMetaMapPoints([{ key: 'A', count: 10, wins: 30, losses: 30 }], 100)[0];
    const day2 = buildMetaMapPoints([{ key: 'A', count: 4, wins: 20, losses: 10 }], 16)[0];
    const top8 = buildMetaMapPoints([{ key: 'A', count: 3, wins: 18, losses: 6 }], 8)[0];
    expect([all.y, day2.y, top8.y]).toEqual([10, 25, 37.5]);
    expect([all.x, top8.x]).toEqual([50, 75]);
    expect(day2.x).toBeCloseTo(200 / 3);
    expect([all.count, day2.count, top8.count]).toEqual([10, 4, 3]);
  });

  test('keeps rare groups visible without changing their coordinates or counts', () => {
    const points = buildMetaMapPoints(
      [
        { key: 'dominant', count: 1000, wins: 800, losses: 200 },
        { key: 'rare', count: 1, wins: 1, losses: 1 },
      ],
      1001,
    );
    expect(points[0].size).toBe(56);
    expect(points[1].size).toBe(16);
    expect(points[1].count).toBe(1);
    expect(points[1].x).toBe(50);
    expect(points[1].y).toBeCloseTo(100 / 1001, 10);
  });

  test('handles empty selections, missing records, and overlapping aspect occurrences', () => {
    expect(buildMetaMapPoints([], 0)).toEqual([]);
    expect(buildMetaMapPoints([{ key: 'A', count: 2 }], 2)).toEqual([]);
    expect(buildMetaMapPoints([{ key: 'A', count: 0, wins: 1 }], 2)).toEqual([]);
    expect(buildMetaMapPoints([{ key: 'Command', count: 4, wins: 2 }], 2)[0].y).toBe(200);
  });
});

import { describe, expect, it } from 'bun:test';
import { buildMetaShareDataPoints } from './meta-share-data.ts';

describe('meta share snapshot data', () => {
  it('counts unknown and remainder rows exactly once for every metric', () => {
    const rows = [
      { leaderCardId: 'known', baseCardId: 'data-vault', total: 5, top8: 2, winners: 1 },
      { leaderCardId: 'unknown', baseCardId: '', total: 3, top8: 1, winners: 1 },
      { leaderCardId: 'others', baseCardId: '', total: 2, top8: 1, winners: 0 },
      { leaderCardId: '', baseCardId: '', total: 1, top8: 0, winners: 0 },
    ];
    const result = buildMetaShareDataPoints(rows);
    for (const metric of ['total', 'top8', 'winners'] as const) {
      expect(result.reduce((sum, row) => sum + row[metric], 0)).toBe(
        rows.reduce((sum, row) => sum + row[metric], 0),
      );
    }
    expect(result).toHaveLength(rows.length);
  });

  it('retains all low-count combinations for later leader and base grouping', () => {
    const rows = Array.from({ length: 30 }, (_, i) => ({
      leaderCardId: `leader-${i}`,
      baseCardId: 'mos-eisley',
      total: 1,
      top8: 0,
      winners: 0,
    }));
    expect(buildMetaShareDataPoints(rows)).toEqual(rows);
    expect(buildMetaShareDataPoints([])).toEqual([]);
  });
});

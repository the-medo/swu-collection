import { describe, expect, it } from 'bun:test';
import { buildWeeklyChangeDataPoints } from './weekly-change-data.ts';

describe('weekly change snapshot data', () => {
  it('preserves low-count base variants before the UI groups leaders and equivalent bases', () => {
    const leadingRows = Array.from({ length: 10 }, (_, index) => ({
      leaderCardId: `leader-${index}`,
      baseCardId: 'data-vault',
      total: 5,
      top8: 0,
      winners: 0,
    }));
    const variants = ['mos-eisley', 'otoh-gunga', 'research-station-9'].map(baseCardId => ({
      leaderCardId: 'ahsoka-tano--trust-in-the-force',
      baseCardId,
      total: 2,
      top8: 0,
      winners: 0,
    }));

    const result = buildWeeklyChangeDataPoints([...leadingRows, ...variants], []);
    const ahsoka = result.filter(row => row.leaderCardId === variants[0].leaderCardId);
    expect(ahsoka).toHaveLength(3);
    expect(ahsoka.reduce((sum, row) => sum + row.week1.total, 0)).toBe(6);
    expect(ahsoka.every(row => row.week2.total === 0)).toBe(true);
    expect(result.some(row => !row.leaderCardId)).toBe(false);
  });

  it('preserves unknown results and combinations appearing in only one week', () => {
    const unknown = { leaderCardId: '', baseCardId: '', total: 16, top8: 4, winners: 1 };
    const known = {
      leaderCardId: 'leader',
      baseCardId: 'data-vault',
      total: 3,
      top8: 1,
      winners: 1,
    };
    expect(buildWeeklyChangeDataPoints([unknown], [known])).toEqual([
      {
        leaderCardId: '',
        baseCardId: '',
        week1: { total: 16, top8: 4, champions: 1 },
        week2: { total: 0, top8: 0, champions: 0 },
      },
      {
        leaderCardId: 'leader',
        baseCardId: 'data-vault',
        week1: { total: 0, top8: 0, champions: 0 },
        week2: { total: 3, top8: 1, champions: 1 },
      },
    ]);
    expect(buildWeeklyChangeDataPoints([], [])).toEqual([]);
  });
});

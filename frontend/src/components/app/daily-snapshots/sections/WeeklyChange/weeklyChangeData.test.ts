import { describe, expect, it } from 'bun:test';
import type { SectionWeeklyChangeDataPoint } from '../../../../../../../types/DailySnapshots.ts';
import { buildWeeklyChangeChartData, getWeeklyChangeStats } from './weeklyChangeData.ts';

const point = (
  leaderCardId: string,
  baseCardId: string,
  week1: number,
  week2: number,
): SectionWeeklyChangeDataPoint => ({
  leaderCardId,
  baseCardId,
  week1: { total: week1, top8: 0, champions: 0 },
  week2: { total: week2, top8: 0, champions: 0 },
});
const labels: [string, string] = ['Previous', 'Latest'];

describe('weekly change presentation', () => {
  it('groups all equivalent bases before choosing the top leaders', () => {
    const points = [
      point('ahsoka', 'mos-eisley', 2, 2),
      point('ahsoka', 'otoh-gunga', 2, 3),
      point('ahsoka', 'research-station-9', 2, 5),
      point('competitor', 'data-vault', 5, 5),
    ];
    const stats = getWeeklyChangeStats(points, 'leadersAndBase');
    expect(stats.grouped.find(group => group.id === 'ahsoka|Cunning')?.week1.total).toBe(6);
    expect(stats.grouped.find(group => group.id === 'ahsoka|Cunning')?.week2.total).toBe(10);
    expect(buildWeeklyChangeChartData(stats, 'total', labels, 1).map(row => row.id)).toEqual([
      'ahsoka|Cunning',
    ]);
    expect(
      getWeeklyChangeStats(points, 'leaders').grouped.find(group => group.id === 'ahsoka')?.week1
        .total,
    ).toBe(6);
  });

  it('uses full weekly denominators including hidden decks, rather than counts or selected-series totals', () => {
    const stats = getWeeklyChangeStats(
      [
        point('selected', 'data-vault', 2, 2),
        point('another', 'data-vault', 1, 1),
        point('', '', 68, 49),
      ],
      'leaders',
    );
    const data = buildWeeklyChangeChartData(stats, 'total', labels, 1);
    expect(data).toHaveLength(1);
    expect(data[0].data[0].y).toBeCloseTo((2 / 71) * 100);
    expect(data[0].data[1].y).toBeCloseTo((2 / 52) * 100);
    expect(data[0].data[1].y).toBeGreaterThan(data[0].data[0].y);
  });

  it('keeps the union of weekly leaders, handles empty weeks, and includes every champion', () => {
    const points = [point('previous', 'data-vault', 10, 1), point('latest', 'data-vault', 1, 10)];
    const stats = getWeeklyChangeStats(points, 'leaders');
    expect(buildWeeklyChangeChartData(stats, 'total', labels, 1)).toHaveLength(2);
    expect(buildWeeklyChangeChartData(stats, 'top8', labels, 1)).toEqual([]);
    points[0].week1.champions = 1;
    points[1].week1.champions = 1;
    const champions = buildWeeklyChangeChartData(
      getWeeklyChangeStats(points, 'leaders'),
      'champions',
      labels,
      1,
    );
    expect(champions).toHaveLength(2);
    expect(champions.every(row => row.data[0].y === 50 && row.data[1].y === 0)).toBe(true);
    expect(
      buildWeeklyChangeChartData(getWeeklyChangeStats([], 'leaders'), 'total', labels, 6),
    ).toEqual([]);
  });

  it('keeps legacy anonymous rows out of rankings while retaining their denominators', () => {
    const stats = getWeeklyChangeStats(
      [
        point('known', 'data-vault', 2, 3),
        point('', '', 5, 4),
        point('unknown', '', 7, 6),
        point('others', '', 11, 12),
      ],
      'leaders',
    );
    expect(stats.grouped.map(row => row.id)).toEqual(['known']);
    expect(stats.totals.week1.total).toBe(25);
    expect(stats.totals.week2.total).toBe(25);
  });
});

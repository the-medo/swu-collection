import { describe, expect, test } from 'bun:test';
import {
  analyzeApr,
  analyzeAprComparisons,
  getAprSort,
  sortAprComparisons,
  calculateApr,
  type AprEntry,
  type AprTournaments,
} from './tournamentMetaApr.ts';

const tournaments: AprTournaments = {
  a: { tournament: { days: 2, dayTwoPlayerCount: 16, attendance: 32 } },
  b: { tournament: { days: 1, dayTwoPlayerCount: null, attendance: 16 } },
};

const entry = (placement: number | null, keys = ['A'], tournamentId = 'a'): AprEntry => ({
  tournamentId,
  placement,
  keys,
});

describe('Adjusted performance rate', () => {
  test('reproduces the article’s -50% Top 8 to Champion result for two pilots and no win', () => {
    expect(calculateApr(2, 0, 8, 1)?.apr).toBeCloseTo(-50, 8);
  });

  test('compares field shares and applies the logarithmic sample adjustment', () => {
    // A deck grows from 10% of 100 pilots to 25% of eight finalists.
    const result = calculateApr(10, 2, 100, 8)!;
    expect(result.startShare).toBe(10);
    expect(result.endShare).toBe(25);
    expect(result.performanceRate).toBe(150);
    expect(result.apr).toBeCloseTo(77.936056, 5);
    expect(calculateApr(20, 2, 100, 10)?.apr).toBe(0);
    expect(calculateApr(1, 1, 100, 8)!.apr).toBeGreaterThan(100);
  });

  test('does not invent zero APR for empty stages or invalid counts', () => {
    for (const args of [
      [0, 0, 100, 8],
      [10, 0, 100, 0],
      [1, 0, 0, 0],
      [1, 2, 100, 8],
      [10, 9, 100, 8],
      [101, 1, 100, 8],
      [1, 1, 1, 2],
      [NaN, 1, 100, 8],
    ]) {
      expect(calculateApr(args[0], args[1], args[2], args[3])).toBeNull();
    }
  });

  test('keeps archetypes with no advancement and counts double aspects once per pilot', () => {
    const result = analyzeApr(
      [entry(1, ['Vigilance', 'Vigilance', 'Command']), entry(9, ['Cunning']), entry(10, [])],
      tournaments,
      'field-top8',
    );
    expect(result.startTotal).toBe(3);
    expect(result.endTotal).toBe(1);
    expect(result.data.find(row => row.key === 'Vigilance')?.count).toBe(1);
    expect(result.data.find(row => row.key === 'Cunning')?.apr).toBeCloseTo(-50);
    expect(result.data.find(row => row.key === 'unknown')?.count).toBe(1);
  });

  test('uses the same eligible events at both ends of a Day 2 comparison', () => {
    const result = analyzeApr(
      [
        entry(1),
        entry(10),
        entry(20, ['B']),
        entry(1, ['B'], 'b'),
        entry(9, ['B'], 'b'),
        entry(1, ['B'], 'missing'),
      ],
      tournaments,
      'field-day2',
    );
    expect(result.startTotal).toBe(3);
    expect(result.endTotal).toBe(2);
    expect(result.tournamentCount).toBe(1);
    expect(result.excludedTournamentCount).toBe(2);
    expect(result.data.find(row => row.key === 'B')?.advanced).toBe(0);
  });

  test('Top 8 to Champion uses Top 8 counts, independently of the whole field', () => {
    const result = analyzeApr(
      [
        entry(1, ['A']),
        entry(2, ['B']),
        entry(3, ['B']),
        entry(9, ['C']),
        entry(1, ['B'], 'b'),
        entry(2, ['A'], 'b'),
        entry(16, ['C'], 'b'),
      ],
      tournaments,
      'top8-champions',
    );
    expect(result.startTotal).toBe(5);
    expect(result.endTotal).toBe(2);
    expect(result.data.map(row => row.key)).toEqual(['A', 'B']);
    expect(result.data[0].apr).toBeCloseTo(calculateApr(2, 1, 5, 2)!.apr);
  });

  test('meta APR uses pooled shares, including events of different sizes', () => {
    const entries = [
      ...Array.from({ length: 1000 }, (_, index) =>
        entry(index + 1, [index === 0 || (index >= 8 && index < 107) ? 'X' : 'Y']),
      ),
      ...Array.from({ length: 10 }, (_, index) => entry(index + 1, ['Y'], 'b')),
    ];
    const result = analyzeApr(entries, tournaments, 'field-top8');
    const x = result.data.find(row => row.key === 'X')!;
    expect(result.startTotal).toBe(1010);
    expect(result.endTotal).toBe(16);
    expect(x.count).toBe(100);
    expect(x.advanced).toBe(1);
    expect(x.apr).toBeCloseTo(calculateApr(100, 1, 1010, 16)!.apr);
    // This is the published pooled metric, not an average of per-event results.
    expect(x.apr).toBeLessThan(0);
  });

  test('Day 2 to Top 8 excludes players outside Day 2 and invalid Day 2 metadata', () => {
    const result = analyzeApr(
      [entry(1), entry(16, ['B']), entry(17, ['C'])],
      tournaments,
      'day2-top8',
    );
    expect(result.startTotal).toBe(2);
    expect(result.endTotal).toBe(1);
    expect(result.data.find(row => row.key === 'C')).toBeUndefined();
    for (const dayTwoPlayerCount of [null, 0, -1, 4, NaN]) {
      expect(
        analyzeApr(
          [entry(1)],
          {
            a: { tournament: { days: 2, dayTwoPlayerCount } },
          },
          'day2-top8',
        ).data,
      ).toEqual([]);
    }
  });

  test('excludes invalid placements and events without recorded target results', () => {
    const result = analyzeApr(
      [
        entry(1),
        entry(9, ['B']),
        entry(null),
        entry(0),
        entry(-1),
        entry(1.5),
        entry(9, ['C'], 'b'),
      ],
      tournaments,
      'field-top8',
    );
    expect(result.startTotal).toBe(2);
    expect(result.endTotal).toBe(1);
    expect(result.unrankedDeckCount).toBe(4);
    expect(result.excludedTournamentCount).toBe(1);
    expect(result.incompleteTournamentCount).toBe(1);
    expect(result.data.find(row => row.key === 'C')).toBeUndefined();
    expect(analyzeApr([], tournaments, 'field-top8').data).toEqual([]);
    expect(analyzeApr([entry(9)], tournaments, 'field-top8').data).toEqual([]);
  });

  test('target-stage-only imports do not masquerade as an unchanged field', () => {
    const topEight = Array.from({ length: 8 }, (_, index) => entry(index + 1));
    const dayTwo = Array.from({ length: 16 }, (_, index) => entry(index + 1));
    expect(analyzeApr(topEight, tournaments, 'field-top8').data).toEqual([]);
    expect(analyzeApr(dayTwo, tournaments, 'field-day2').data).toEqual([]);
    expect(analyzeApr(topEight, tournaments, 'day2-top8').data).toEqual([]);
    expect(analyzeApr([entry(1)], tournaments, 'top8-champions').data).toEqual([]);
    // Top 8 imports still have a complete baseline for Top 8 → Champion.
    expect(analyzeApr(topEight, tournaments, 'top8-champions').startTotal).toBe(8);

    const result = analyzeApr(
      [...topEight, entry(1, ['B'], 'b'), entry(9, ['C'], 'b')],
      tournaments,
      'field-top8',
    );
    expect(result.tournamentCount).toBe(1);
    expect(result.excludedTournamentCount).toBe(1);
    expect(result.startTotal).toBe(2);
    expect(result.endTotal).toBe(1);
    expect(result.data.find(row => row.key === 'A')).toBeUndefined();
  });

  test('a complete eight-player event can legitimately have unchanged Top 8 share', () => {
    const result = analyzeApr(
      Array.from({ length: 8 }, (_, index) => entry(index + 1)),
      {
        a: { tournament: { days: 1, dayTwoPlayerCount: null, attendance: 8 } },
      },
      'field-top8',
    );
    expect(result.tournamentCount).toBe(1);
    expect(result.data[0].apr).toBe(0);
  });
});

describe('Grouped APR comparisons', () => {
  const dayTwoEntries = Array.from({ length: 32 }, (_, index) =>
    entry(index + 1, [index < 4 ? 'A' : index < 16 ? 'B' : 'C']),
  );
  const oneDayEntries = Array.from({ length: 16 }, (_, index) =>
    entry(index + 1, [index < 2 ? 'A' : index < 8 ? 'D' : 'E'], 'b'),
  );

  test('two-day events show both Day 2 stages, champions, and combined; counts determine availability', () => {
    const result = analyzeAprComparisons(dayTwoEntries, {
      a: { tournament: { days: 1, dayTwoPlayerCount: 16, attendance: 32 } },
    });
    expect(result.metrics).toEqual(['combined', 'field-day2', 'day2-top8', 'top8-champions']);
    expect(result.stages['field-day2'].startTotal).toBe(32);
    expect(getAprSort(result)).toBe('combined');
    const a = result.data.find(row => row.key === 'A')!;
    expect(a.values.combined).toBeCloseTo(
      calculateApr(4, 4, 32, 16)!.apr + calculateApr(4, 4, 16, 8)!.apr,
    );
    expect(a.values.combined).toBe(a.values['field-day2']! + a.values['day2-top8']!);
    expect(a.values['top8-champions']).not.toBe(0);
  });

  test('zero or unset Day 2 counts show Field to Top 8 and champions only', () => {
    for (const dayTwoPlayerCount of [0, null]) {
      const result = analyzeAprComparisons(oneDayEntries, {
        b: { tournament: { days: 2, dayTwoPlayerCount, attendance: 16 } },
      });
      expect(result.metrics).toEqual(['field-top8', 'top8-champions']);
      expect(getAprSort(result)).toBe('field-top8');
      expect(getAprSort(result, 'combined')).toBe('field-top8');
      expect(result.data.every(row => row.values.combined === null)).toBe(true);
    }
  });

  test('mixed metas use separate eligible fields, with champions spanning both event types', () => {
    const result = analyzeAprComparisons([...dayTwoEntries, ...oneDayEntries], tournaments);
    expect(result.metrics).toEqual([
      'combined',
      'field-day2',
      'field-top8',
      'day2-top8',
      'top8-champions',
    ]);
    const a = result.data.find(row => row.key === 'A')!;
    expect(a.count).toBe(6);
    expect(a.values['field-day2']).toBeCloseTo(calculateApr(4, 4, 32, 16)!.apr);
    expect(a.values['field-top8']).toBeCloseTo(calculateApr(2, 2, 16, 8)!.apr);
    expect(a.values['day2-top8']).toBeCloseTo(calculateApr(4, 4, 16, 8)!.apr);
    expect(a.values['top8-champions']).toBeCloseTo(calculateApr(6, 2, 16, 2)!.apr);
    expect(result.stages['field-top8'].tournamentIds).toEqual(['b']);
    expect(result.stages['field-day2'].tournamentIds).toEqual(['a']);
    expect(result.stages['top8-champions'].tournamentCount).toBe(2);
    expect(result.data.find(row => row.key === 'D')!.values.combined).toBeNull();
  });

  test('combined sums two stages from a shared cohort when a Day 2-only import lacks a full field', () => {
    const c = { tournament: { days: 2, dayTwoPlayerCount: 16, attendance: 32 } };
    const result = analyzeAprComparisons(
      [...dayTwoEntries, ...Array.from({ length: 16 }, (_, i) => entry(i + 1, ['A'], 'c'))],
      { a: tournaments.a, c },
    );
    const a = result.data.find(row => row.key === 'A')!;
    expect(result.stages['field-day2'].tournamentCount).toBe(1);
    expect(result.stages['day2-top8'].tournamentCount).toBe(2);
    expect(result.combined.fieldDay2.tournamentIds).toEqual(['a']);
    expect(result.combined.day2Top8.tournamentIds).toEqual(['a']);
    expect(a.values.combined).toBeCloseTo(
      calculateApr(4, 4, 32, 16)!.apr + calculateApr(4, 4, 16, 8)!.apr,
    );
    expect(a.values.combined).not.toBe(a.values['field-day2']! + a.values['day2-top8']!);
  });

  test('defaults to a metric with observations when combined has no shared cohort', () => {
    const result = analyzeAprComparisons(
      [...dayTwoEntries.slice(0, 16), ...oneDayEntries],
      tournaments,
    );
    expect(result.metrics).toContain('combined');
    expect(result.combined.fieldDay2.tournamentCount).toBe(0);
    expect(result.data.every(row => row.values.combined === null)).toBe(true);
    expect(getAprSort(result)).toBe('field-top8');
    const dayTwoOnly = analyzeAprComparisons(dayTwoEntries.slice(0, 16), { a: tournaments.a });
    expect(getAprSort(dayTwoOnly)).toBe('day2-top8');
  });

  test('does not fabricate a second stage or combined result for a group eliminated before Day 2', () => {
    const result = analyzeAprComparisons(dayTwoEntries, { a: tournaments.a });
    const c = result.data.find(row => row.key === 'C')!;
    expect(c.values['field-day2']).toBeLessThan(0);
    expect(c.values['day2-top8']).toBeNull();
    expect(c.values.combined).toBeNull();
    expect(c.combinedParts).toBeUndefined();
  });

  test('sort buttons order by each metric, preserve data, and put missing values after negative ones', () => {
    const result = analyzeAprComparisons([...dayTwoEntries, ...oneDayEntries], tournaments);
    const originalOrder = result.data.map(row => row.key);
    for (const metric of result.metrics) {
      expect(getAprSort(result, metric)).toBe(metric);
      const sorted = sortAprComparisons(result.data, metric);
      const values = sorted.map(row => row.values[metric]);
      const present = values.filter(value => value !== null);
      expect(present).toEqual([...present].sort((a, b) => b - a));
      expect(values.slice(0, present.length)).toEqual(present);
    }
    expect(result.data.map(row => row.key)).toEqual(originalOrder);
    const combinedOrder = sortAprComparisons(result.data, 'combined');
    expect(combinedOrder[combinedOrder.length - 1].values.combined).toBeNull();
  });

  test('preserves zero APR and counts one ranked entry per aspect in the display filter', () => {
    const result = analyzeAprComparisons(
      [
        ...Array.from({ length: 16 }, (_, i) => entry(i + 1, ['A', 'A'], 'b')),
        entry(null, ['A'], 'b'),
      ],
      { b: tournaments.b },
    );
    expect(result.data[0].values['field-top8']).toBe(0);
    expect(result.data[0].values['top8-champions']).toBe(0);
    expect(result.data[0].count).toBe(16);
  });

  test('empty selections retain the champion metric and invalid counts are not treated as one-day events', () => {
    expect(analyzeAprComparisons([], {}).metrics).toEqual(['top8-champions']);
    expect(getAprSort({ metrics: ['top8-champions'], data: [] })).toBe('top8-champions');
    for (const dayTwoPlayerCount of [-1, 1.5, NaN]) {
      const result = analyzeAprComparisons([], {
        a: { tournament: { days: 2, dayTwoPlayerCount } },
      });
      expect(result.metrics).toEqual(['top8-champions']);
      expect(result.data).toEqual([]);
    }
  });
});

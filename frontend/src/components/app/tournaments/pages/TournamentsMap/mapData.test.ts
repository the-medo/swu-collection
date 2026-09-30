import { expect, test } from 'bun:test';
import {
  fourMonthWindow,
  mapWeekIndex,
} from '../../../../../../../shared/lib/tournamentMapDates.ts';
import type { MapTournament } from '../../../../../../../types/TournamentMap.ts';
import {
  filterMapTournaments,
  defaultMapTypes,
  mapWeekSummaries,
  mapWeeks,
  mapWeekRange,
  mapPinColor,
  mapClusterBackground,
  hasMapCoordinates,
  tournamentLinks,
  mapWeekEnd,
} from './mapData.ts';

const row = (date: string, days = 1): MapTournament => ({
  id: date,
  date,
  days,
  name: 'Tournament',
  updatedAt: '2026-09-01T00:00:00Z',
  type: 'pq',
  format: 1,
  location: 'BR',
  meleeId: null,
  coordinates: { x: 0, y: 0 },
  additionalInfo: {},
});

test('upcoming includes today and ongoing multi-day events; date filters include the full selected week', () => {
  const rows = [row('2026-09-27'), row('2026-09-28', 2), row('2026-09-29'), row('2026-10-05')];
  expect(
    filterMapTournaments(
      rows,
      [1, 3, 6],
      defaultMapTypes,
      undefined,
      undefined,
      true,
      '2026-09-29',
    ).map(t => t.date),
  ).toEqual(['2026-09-28', '2026-09-29', '2026-10-05']);
  expect(
    filterMapTournaments(
      rows,
      [1],
      defaultMapTypes,
      '2026-09-28',
      '2026-10-04',
      true,
      '2026-09-29',
    ),
  ).toHaveLength(2);
  expect(filterMapTournaments(rows, [1, 3, 6], defaultMapTypes, undefined, undefined)).toHaveLength(
    4,
  );
  expect(mapWeekIndex('2027-01-01', '2026-10-02')).toBe(13);
});

test('pins require valid points and links reject executable URLs and deduplicate destinations', () => {
  expect(hasMapCoordinates(row('2026-10-01'))).toBe(true);
  expect(hasMapCoordinates({ ...row('2026-10-01'), coordinates: null })).toBe(false);
  expect(hasMapCoordinates({ ...row('2026-10-01'), coordinates: { x: 190, y: 45 } })).toBe(false);
  const t = {
    ...row('2026-10-01'),
    meleeId: '123',
    additionalInfo: {
      meleeUrl: 'https://melee.gg/Tournament/View/123',
      sourceUrl: 'javascript:alert(1)',
      storeUrl: 'https://example.com/store',
      links: [
        { label: '<b>Event</b>', url: 'https://example.com/event' },
        { url: 'data:text/html,hi' },
      ],
    },
  };
  expect(tournamentLinks(t)).toEqual([
    { label: 'Melee.gg', url: 'https://melee.gg/Tournament/View/123' },
    { label: 'Store', url: 'https://example.com/store' },
    { label: '<b>Event</b>', url: 'https://example.com/event' },
  ]);
});

test('range has a step for empty weeks and keeps format selection independent', () => {
  const rows = [
    row('2026-11-07'),
    { ...row('2026-11-21'), format: 3 },
    { ...row('2026-11-22'), format: 6 },
  ];
  const weeks = mapWeeks({ from: '2026-11-02', to: '2026-11-22' });
  expect(weeks).toEqual(['2026-11-02', '2026-11-09', '2026-11-16']);
  expect(mapWeekRange(weeks, undefined, undefined, '2026-11-10')).toEqual([1, 2]);
  expect(mapWeekRange(weeks, '2026-11-16', '2026-11-02')).toEqual([0, 2]);
  expect(
    filterMapTournaments(rows, [3], defaultMapTypes, weeks[0], mapWeekEnd(weeks[2])).map(
      t => t.format,
    ),
  ).toEqual([3]);
  expect(
    filterMapTournaments(rows, [1, 3, 6], defaultMapTypes, weeks[1], mapWeekEnd(weeks[1])),
  ).toEqual([]);
  expect(filterMapTournaments(rows, [], defaultMapTypes, weeks[0], mapWeekEnd(weeks[2]))).toEqual(
    [],
  );
  expect(mapWeeks()).toEqual([]);
  expect(mapWeekRange([], undefined, undefined)).toEqual([0, 0]);
  expect(mapWeekRange([weeks[0]], undefined, undefined, '2027-01-01')).toEqual([0, 0]);
});

test('format palettes have twelve monotonic shades and cluster rings retain each color', () => {
  for (const format of [1, 3, 6]) {
    const colors = Array.from({ length: 12 }, (_, i) => mapPinColor(format, i, 12));
    expect(new Set(colors).size).toBe(12);
    const opacity = colors.map(color => Number(color.split(', ').pop()?.replace(')', '')));
    expect(opacity[0]).toBe(1);
    expect(opacity[11]).toBe(0.35);
    expect(opacity.every((value, i) => i === 0 || value < opacity[i - 1])).toBe(true);
  }
  expect(mapPinColor(1, 0, 12)).toBe('rgba(250, 204, 21, 1.000)');
  expect(mapPinColor(6, 0, 12)).toBe('rgba(249, 115, 22, 1.000)');
  expect(mapPinColor(3, 0, 12)).toBe('rgba(194, 65, 12, 1.000)');
  expect(mapClusterBackground(['yellow', 'orange', 'yellow'])).toBe(
    'conic-gradient(yellow 0% 66.66666666666666%, orange 66.66666666666666% 99.99999999999999%)',
  );
});

test('type groups combine with format and week filters without including other tournament types', () => {
  const rows = ['pq', 'open', 'sq', 'rq', 'gc', 'local', 'showdown', 'ma1', 'ma2'].map(type => ({
    ...row('2026-11-07'),
    id: type,
    type,
  }));
  rows.push({ ...row('2026-11-21'), id: 'later-sector', type: 'sq' });
  rows.push({ ...row('2026-11-07'), id: 'sealed-open', type: 'open', format: 3 });
  const filter = (types: typeof defaultMapTypes, formats = [1, 3, 6]) =>
    filterMapTournaments(rows, formats, types, '2026-11-02', '2026-11-08').map(t => t.id);
  expect(filter(['pq'])).toEqual(['pq']);
  expect(filter(['open'])).toEqual(['open', 'sealed-open']);
  expect(filter(['major'])).toEqual(['sq', 'rq', 'gc']);
  expect(filter(['open', 'major'], [3])).toEqual(['sealed-open']);
  expect(filter(defaultMapTypes)).toEqual(['pq', 'open', 'sq', 'rq', 'gc', 'sealed-open']);
  expect(filter([])).toEqual([]);
});

test('week summaries keep empty weeks and count majors and tournaments without coordinates', () => {
  const rows = [
    { ...row('2026-12-31'), id: 'sector', type: 'sq', coordinates: null },
    { ...row('2027-01-03'), id: 'regional', type: 'rq' },
    { ...row('2027-01-03'), id: 'pq' },
    { ...row('2027-01-16'), id: 'galactic', type: 'gc', format: 6 },
  ];
  const weeks = mapWeeks({ from: '2026-12-28', to: '2027-01-17' });
  const summary = mapWeekSummaries(weeks, rows);
  expect(
    summary.map(({ week, count, majors }) => ({ week, count, ids: majors.map(t => t.id) })),
  ).toEqual([
    { week: '2026-12-28', count: 3, ids: ['sector', 'regional'] },
    { week: '2027-01-04', count: 0, ids: [] },
    { week: '2027-01-11', count: 1, ids: ['galactic'] },
  ]);
  const filtered = filterMapTournaments(rows, [6], ['major'], undefined, undefined);
  expect(mapWeekSummaries(weeks, filtered).map(s => s.count)).toEqual([0, 0, 1]);
  expect(mapWeekSummaries([], rows)).toEqual([]);
});

test('the fixed four-month window starts exactly on release day and clips its last week', () => {
  const window = fourMonthWindow('2026-10-02');
  expect(window).toEqual({ from: '2026-10-02', to: '2027-02-01' });
  const weeks = mapWeeks(window);
  expect(weeks).toHaveLength(18);
  expect(weeks[0]).toBe('2026-10-02');
  expect(weeks[weeks.length - 1]).toBe('2027-01-29');
  expect(mapWeekEnd(weeks[weeks.length - 1]!, window.to)).toBe('2027-02-01');
  expect(mapWeekRange(weeks, undefined, undefined, '2026-10-08')).toEqual([0, 17]);
  const highlights = ['2026-10-01', '2026-10-02', '2027-02-01', '2027-02-02'].map(date => ({
    id: date,
    date,
    imageUrl: 'https://images.swubase.com/logo.png',
    description: date,
    updatedAt: '',
  }));
  const summary = mapWeekSummaries(
    weeks,
    [row('2026-10-08'), row('2026-10-09'), row('2027-02-02')],
    highlights,
    window.to,
  );
  expect(summary[0].count).toBe(1);
  expect(summary[1].count).toBe(1);
  expect(summary.flatMap(s => s.highlights).map(h => h.date)).toEqual(['2026-10-02', '2027-02-01']);
  expect(summary.reduce((n, s) => n + s.count, 0)).toBe(2);
});

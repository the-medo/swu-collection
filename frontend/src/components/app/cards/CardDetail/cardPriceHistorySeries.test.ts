import { expect, test } from 'bun:test';
import {
  buildCardPriceHistoryAxes,
  buildWeeklyCardPriceHistory,
  formatCardPriceHistoryAxisTick,
} from './cardPriceHistorySeries.ts';

const now = new Date('2026-10-08T12:00:00Z');
const row = (createdAt: string, price: string, sourceType = 'cardmarket') => ({
  createdAt,
  price,
  sourceType,
});

test('averages marketplaces separately and counts only the latest import per UTC day', () => {
  const points = buildWeeklyCardPriceHistory(
    [
      row('2026-10-05T06:00:00Z', '14.00'),
      row('2026-10-06T04:00:00Z', '20.00'),
      row('2026-10-05T04:00:00Z', '10.00'),
      row('2026-10-05T21:00:00Z', '24.00', 'tcgplayer'),
      row('2026-10-06T21:00:00Z', '36.00', 'tcgplayer'),
    ],
    now,
  );
  expect(points[points.length - 1]).toEqual({
    week: Date.parse('2026-10-05T00:00:00Z'),
    cardmarket: 17,
    tcgplayer: 30,
  });
  expect(points.some(point => point.cardmarket === null && point.tcgplayer === null)).toBe(true);
});

test('covers three calendar months including the first day, excluding older and future records', () => {
  const points = buildWeeklyCardPriceHistory(
    [
      row('2026-07-07T23:59:59Z', '100.00'),
      row('2026-07-08T00:00:00Z', '2.00'),
      row('2026-10-08T12:00:00Z', '5.00'),
      row('2026-10-08T12:00:01Z', '100.00'),
    ],
    now,
  );
  expect(points[0]).toEqual({
    week: Date.parse('2026-07-06T00:00:00Z'),
    cardmarket: 2,
    tcgplayer: null,
  });
  expect(points).toHaveLength(14);
  expect(points[points.length - 1]?.cardmarket).toBe(5);
  for (let i = 1; i < points.length; i++)
    expect(points[i]!.week - points[i - 1]!.week).toBe(7 * 24 * 60 * 60 * 1000);
});

test('clamps the start of a three-month window to a shorter month', () => {
  const points = buildWeeklyCardPriceHistory(
    [row('2026-02-27T12:00:00Z', '100.00'), row('2026-02-28T00:00:00Z', '4.00')],
    new Date('2026-05-31T12:00:00Z'),
  );
  expect(points[0]).toEqual({
    week: Date.parse('2026-02-23T00:00:00Z'),
    cardmarket: 4,
    tcgplayer: null,
  });
});

test('keeps missing weeks empty and ignores unavailable, invalid, and unsupported prices', () => {
  const points = buildWeeklyCardPriceHistory(
    [
      row('2026-10-05T04:00:00Z', '0.00'),
      row('2026-10-06T04:00:00Z', '-1.00'),
      row('2026-10-07T04:00:00Z', 'invalid'),
      row('not-a-date', '100.00'),
      row('2026-10-05T04:00:00Z', '100.00', 'swubase'),
    ],
    now,
  );
  expect(points.every(point => point.cardmarket === null && point.tcgplayer === null)).toBe(true);
});

test('an unavailable latest price replaces an earlier import from the same day', () => {
  const points = buildWeeklyCardPriceHistory(
    [row('2026-10-05T04:00:00Z', '10.00'), row('2026-10-05T05:00:00Z', '0.00')],
    now,
  );
  expect(points[points.length - 1]?.cardmarket).toBeNull();
});

test('rounds averages in cents without floating-point half-cent errors', () => {
  const points = buildWeeklyCardPriceHistory(
    [row('2026-10-05T04:00:00Z', '2.01'), row('2026-10-06T04:00:00Z', '2.02')],
    now,
  );
  expect(points[points.length - 1]?.cardmarket).toBe(2.02);
});

test('aligns equivalent EUR and USD amounts with one rate across every week', () => {
  const series = [
    { week: 1, cardmarket: 10, tcgplayer: 12 },
    { week: 2, cardmarket: null, tcgplayer: 24 },
  ];
  for (const rate of [1.2, 0.9, 1.1177]) {
    const axes = buildCardPriceHistoryAxes(series, rate);
    expect(axes.usdDomain[1]).toBeCloseTo(axes.eurDomain[1] * rate, 10);
    expect(10 / axes.eurDomain[1]).toBeCloseTo((10 * rate) / axes.usdDomain[1], 10);
    expect(axes.eurDomain[1]).toBeGreaterThanOrEqual(24 / rate);
    for (let i = 0; i < axes.eurTicks.length; i++)
      expect(axes.usdTicks[i]).toBeCloseTo(axes.eurTicks[i]! * rate, 10);
  }
  for (const rate of [0, -1, NaN, Infinity])
    expect(() => buildCardPriceHistoryAxes(series, rate)).toThrow();
});

test('keeps both axes readable and tick labels unique for cards worth only a few cents', () => {
  for (const price of [0.01, 0.02, 0.03, 0.04]) {
    const axes = buildCardPriceHistoryAxes(
      [{ week: 1, cardmarket: price, tcgplayer: price }],
      1.17,
    );
    const eur = axes.eurTicks.map(value =>
      formatCardPriceHistoryAxisTick(value, 'EUR', axes.eurDomain[1]),
    );
    const usd = axes.usdTicks.map(value =>
      formatCardPriceHistoryAxisTick(value, 'USD', axes.usdDomain[1]),
    );
    expect(new Set(eur).size).toBe(eur.length);
    expect(new Set(usd).size).toBe(usd.length);
  }
});

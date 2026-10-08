import type { CardVariantPriceHistory } from '../../../../api/card-prices/useGetCardPriceHistory.ts';

const dayMilliseconds = 24 * 60 * 60 * 1000;
const weekMilliseconds = 7 * dayMilliseconds;

export interface CardPriceHistoryPoint {
  week: number;
  cardmarket: number | null;
  tcgplayer: number | null;
}

type PriceSource = 'cardmarket' | 'tcgplayer';

function weekStart(timestamp: number) {
  const date = new Date(timestamp);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  return date.getTime();
}

export function buildWeeklyCardPriceHistory(
  history: Pick<CardVariantPriceHistory, 'createdAt' | 'price' | 'sourceType'>[],
  now = new Date(),
): CardPriceHistoryPoint[] {
  const start = new Date(now);
  start.setUTCDate(1);
  start.setUTCMonth(start.getUTCMonth() - 3);
  const lastDay = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0));
  start.setUTCDate(Math.min(now.getUTCDate(), lastDay.getUTCDate()));
  start.setUTCHours(0, 0, 0, 0);

  // A repeated import must not give that day's price extra weight in the weekly average.
  const daily = new Map<string, { timestamp: number; price: number | null; source: PriceSource }>();
  for (const row of history) {
    if (row.sourceType !== 'cardmarket' && row.sourceType !== 'tcgplayer') continue;
    const timestamp = Date.parse(row.createdAt);
    if (!Number.isFinite(timestamp) || timestamp < start.getTime() || timestamp > now.getTime())
      continue;
    const day = `${row.sourceType}:${Math.floor(timestamp / dayMilliseconds)}`;
    if (timestamp < (daily.get(day)?.timestamp ?? -Infinity)) continue;
    const price = Number(row.price);
    // Imports use zero when no marketplace price is available.
    daily.set(day, {
      timestamp,
      price: Number.isFinite(price) && price > 0 ? price : null,
      source: row.sourceType,
    });
  }

  const weekly = new Map<
    number,
    Partial<Record<PriceSource, { total: number; samples: number }>>
  >();
  for (const { timestamp, price, source } of daily.values()) {
    if (price === null) continue;
    const week = weekStart(timestamp);
    const sources = weekly.get(week) ?? {};
    const bucket = sources[source] ?? { total: 0, samples: 0 };
    bucket.total += Math.round(price * 100);
    bucket.samples += 1;
    sources[source] = bucket;
    weekly.set(week, sources);
  }

  const points: CardPriceHistoryPoint[] = [];
  for (
    let week = weekStart(start.getTime());
    week <= weekStart(now.getTime());
    week += weekMilliseconds
  ) {
    const sources = weekly.get(week);
    const average = (source: PriceSource) => {
      const bucket = sources?.[source];
      return bucket ? Math.round(bucket.total / bucket.samples) / 100 : null;
    };
    points.push({
      week,
      cardmarket: average('cardmarket'),
      tcgplayer: average('tcgplayer'),
    });
  }
  return points;
}

export function buildCardPriceHistoryAxes(series: CardPriceHistoryPoint[], usdPerEur: number) {
  if (!Number.isFinite(usdPerEur) || usdPerEur <= 0) throw new RangeError('Invalid EUR/USD rate');
  const maximumEur = series.reduce(
    (maximum, point) =>
      Math.max(maximum, point.cardmarket ?? 0, (point.tcgplayer ?? 0) / usdPerEur),
    0,
  );
  const ceilingEur = maximumEur > 0 ? maximumEur * 1.1 : 1;
  const eurTicks = [0, 0.25, 0.5, 0.75, 1].map(fraction => ceilingEur * fraction);
  return {
    eurDomain: [0, ceilingEur] as [number, number],
    usdDomain: [0, ceilingEur * usdPerEur] as [number, number],
    eurTicks,
    usdTicks: eurTicks.map(value => value * usdPerEur),
  };
}

export function formatCardPriceHistoryAxisTick(
  value: number,
  currency: 'EUR' | 'USD',
  maximum: number,
) {
  const formatted = value.toFixed(maximum < 0.1 ? 3 : 2);
  return currency === 'USD' ? `$${formatted}` : `${formatted} €`;
}

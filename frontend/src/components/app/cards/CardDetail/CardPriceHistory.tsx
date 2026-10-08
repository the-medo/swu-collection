import { useMemo } from 'react';
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
import { useGetCardPriceExchangeRate, useGetCardPriceHistory } from '@/api/card-prices';
import { Button } from '@/components/ui/button.tsx';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart.tsx';
import { Skeleton } from '@/components/ui/skeleton.tsx';
import {
  CARD_PRICE_HISTORY_MAX_DAYS,
  CardPriceSourceType,
  priceFormatterBasedOnSourceType,
} from '../../../../../../types/CardPrices.ts';
import {
  buildCardPriceHistoryAxes,
  buildWeeklyCardPriceHistory,
  formatCardPriceHistoryAxisTick,
} from './cardPriceHistorySeries.ts';

const chart = {
  cardmarket: { label: 'Cardmarket (EUR)', color: 'hsl(var(--chart-1))' },
  tcgplayer: { label: 'TCGplayer (USD)', color: 'hsl(var(--chart-2))' },
} satisfies ChartConfig;
const axisDate = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
});
const tooltipDate = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
});

export function CardPriceHistory({ cardId, variantId }: { cardId: string; variantId?: string }) {
  const history = useGetCardPriceHistory({
    cardId: variantId ? cardId : undefined,
    variantId,
    days: CARD_PRICE_HISTORY_MAX_DAYS,
  });
  const exchangeRate = useGetCardPriceExchangeRate();
  const series = useMemo(
    () => buildWeeklyCardPriceHistory(history.data?.data ?? []),
    [history.data],
  );
  const rate = exchangeRate.data?.data;
  const axes = useMemo(
    () => (rate ? buildCardPriceHistoryAxes(series, rate.usdPerEur) : undefined),
    [series, rate],
  );
  const hasCardmarket = series.some(point => point.cardmarket !== null);
  const hasTcgplayer = series.some(point => point.tcgplayer !== null);
  const error =
    history.isError && !history.data
      ? history.error
      : exchangeRate.isError && !exchangeRate.data
        ? exchangeRate.error
        : undefined;
  const historyRefreshFailed = history.isError && Boolean(history.data);
  const rateRefreshFailed = exchangeRate.isError && Boolean(exchangeRate.data);
  const rateIsStale = rate?.stale || rateRefreshFailed;
  const retryFailedQueries = () => {
    if (history.isError) void history.refetch();
    if (exchangeRate.isError) void exchangeRate.refetch();
  };

  return (
    <section className="min-w-0 space-y-3" aria-label="Price history">
      <p className="text-sm text-muted-foreground">Weekly averages · last 3 months</p>

      {!variantId ? (
        <p className="py-6 text-sm text-muted-foreground">
          Select a variant to see its price history.
        </p>
      ) : history.isPending || exchangeRate.isPending ? (
        <div role="status" className="space-y-2">
          <p className="text-sm text-muted-foreground">
            {history.isPending ? 'Loading price history…' : 'Loading exchange rate…'}
          </p>
          <Skeleton className="h-64 w-full" />
        </div>
      ) : error ? (
        <div role="alert" className="space-y-2 py-6">
          <p className="text-sm text-destructive">{error.message}</p>
          <Button
            variant="outline"
            onClick={retryFailedQueries}
            disabled={history.isFetching || exchangeRate.isFetching}
          >
            Try again
          </Button>
        </div>
      ) : !hasCardmarket && !hasTcgplayer ? (
        <p className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
          No price history for this variant in the last 3 months.
        </p>
      ) : rate && axes ? (
        <>
          <ChartContainer
            config={chart}
            className="h-72 w-full aspect-auto"
            role="img"
            aria-label="Cardmarket (EUR) and TCGplayer (USD) weekly price history"
          >
            <LineChart accessibilityLayer data={series} margin={{ left: 0, right: 0, top: 8 }}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="week"
                tickFormatter={value => axisDate.format(new Date(Number(value)))}
                minTickGap={28}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                yAxisId="eur"
                width={68}
                domain={axes.eurDomain}
                ticks={axes.eurTicks}
                tickFormatter={value =>
                  formatCardPriceHistoryAxisTick(Number(value), 'EUR', axes.eurDomain[1])
                }
                tickLine={false}
                axisLine={false}
                allowDataOverflow
              />
              <YAxis
                yAxisId="usd"
                orientation="right"
                width={68}
                domain={axes.usdDomain}
                ticks={axes.usdTicks}
                tickFormatter={value =>
                  formatCardPriceHistoryAxisTick(Number(value), 'USD', axes.usdDomain[1])
                }
                tickLine={false}
                axisLine={false}
                allowDataOverflow
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(_, payload) => {
                      const week = payload[0]?.payload?.week;
                      return typeof week === 'number'
                        ? `Week of ${tooltipDate.format(new Date(week))}`
                        : '';
                    }}
                    formatter={(value, name) => {
                      const source =
                        name === 'cardmarket'
                          ? CardPriceSourceType.CARDMARKET
                          : CardPriceSourceType.TCGPLAYER;
                      return (
                        <div className="flex w-full justify-between gap-4">
                          <span className="text-muted-foreground">{chart[source].label}</span>
                          <span className="font-mono tabular-nums">
                            {priceFormatterBasedOnSourceType(Number(value), source)}
                          </span>
                        </div>
                      );
                    }}
                  />
                }
              />
              <ChartLegend content={<ChartLegendContent payload={[]} />} />
              <Line
                yAxisId="eur"
                type="linear"
                dataKey="cardmarket"
                stroke="var(--color-cardmarket)"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
                connectNulls={false}
                isAnimationActive={false}
              />
              <Line
                yAxisId="usd"
                type="linear"
                dataKey="tcgplayer"
                stroke="var(--color-tcgplayer)"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
                connectNulls={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ChartContainer>
          <p className="text-xs text-muted-foreground">
            {rateIsStale ? 'Last available exchange rate' : 'Current exchange rate'}: 1 EUR ={' '}
            {rate.usdPerEur.toFixed(4)} USD ·{' '}
            <a
              href="https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              ECB, {tooltipDate.format(new Date(`${rate.date}T00:00:00Z`))}
            </a>
            . The same rate applies to every week.
          </p>
          {rateIsStale && (
            <p role="status" className="text-xs text-muted-foreground">
              Could not refresh the exchange rate. Using the last available rate shown above.
            </p>
          )}
          {historyRefreshFailed && (
            <p role="status" className="text-xs text-muted-foreground">
              Could not refresh the price history. Showing the previously loaded history.
            </p>
          )}
          {(historyRefreshFailed || rateRefreshFailed) && (
            <Button
              variant="outline"
              size="sm"
              onClick={retryFailedQueries}
              disabled={history.isFetching || exchangeRate.isFetching}
            >
              Try again
            </Button>
          )}
          {(!hasCardmarket || !hasTcgplayer) && (
            <p className="text-xs text-muted-foreground">
              No {!hasCardmarket ? 'Cardmarket' : 'TCGplayer'} price history is available for this
              variant.
            </p>
          )}
        </>
      ) : null}
    </section>
  );
}

import { cn } from '@/lib/utils.ts';
import { useMemo, useState } from 'react';
import { ChartNoAxesCombined } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import { ResponsivePie } from '@nivo/pie';
import { useChartColorsAndGradients } from '@/components/app/tournaments/TournamentMeta/useChartColorsAndGradients.tsx';
import { useLabel } from '@/components/app/tournaments/TournamentMeta/useLabel.tsx';
import { LiveSectionHeader } from '../components';
import type { LiveTournamentWeekendDetail } from '../liveTournamentTypes.ts';

type MetaPieItem = {
  id: string;
  label: string;
  value: number;
  data: {
    total: number;
    top8: number;
    winners: number;
  };
};

export function WeekendMetaSection({ detail }: { detail: LiveTournamentWeekendDetail }) {
  const [showAll, setShowAll] = useState(false);
  const labelRenderer = useLabel();
  const pieChartColorDefinitions = useChartColorsAndGradients();

  const metaRows = useMemo(() => {
    const rowsByKey = new Map<string, MetaPieItem>();

    detail.tournamentGroups.forEach(group => {
      group.leaderBase.forEach(row => {
        const key =
          row.leaderCardId === 'others'
            ? 'Others'
            : row.leaderCardId === 'unknown'
              ? 'unknown'
              : `${row.leaderCardId}|${row.baseCardId}`;
        const existing = rowsByKey.get(key);

        if (existing) {
          existing.value += row.total;
          existing.data.total += row.total;
          existing.data.top8 += row.top8;
          existing.data.winners += row.winner;
          return;
        }

        rowsByKey.set(key, {
          id: key,
          label: key,
          value: row.total,
          data: {
            total: row.total,
            top8: row.top8,
            winners: row.winner,
          },
        });
      });
    });

    return [...rowsByKey.values()].sort((a, b) => b.value - a.value);
  }, [detail.tournamentGroups]);

  const chartData = useMemo(() => {
    const topItems = metaRows.slice(0, 20).map(row => ({
      ...row,
      data: { ...row.data },
    }));
    const remaining = metaRows.slice(20);
    const remainingTotal = remaining.reduce((sum, row) => sum + row.value, 0);

    if (remainingTotal === 0) return topItems;

    const remainingData = remaining.reduce(
      (acc, row) => {
        acc.total += row.data.total;
        acc.top8 += row.data.top8;
        acc.winners += row.data.winners;
        return acc;
      },
      { total: 0, top8: 0, winners: 0 },
    );
    const existingOthers = topItems.find(row => row.id === 'Others');

    if (existingOthers) {
      existingOthers.value += remainingTotal;
      existingOthers.data.total += remainingData.total;
      existingOthers.data.top8 += remainingData.top8;
      existingOthers.data.winners += remainingData.winners;
      return topItems;
    }

    return [
      ...topItems,
      {
        id: 'Others',
        label: 'Others',
        value: remainingTotal,
        data: remainingData,
      },
    ];
  }, [metaRows]);

  const totalDecks = metaRows.reduce((sum, row) => sum + row.value, 0);
  const chartDefs = useMemo(
    () => chartData.map(item => pieChartColorDefinitions(item.id, 'leadersAndBase')),
    [chartData, pieChartColorDefinitions],
  );
  const fill = useMemo(
    () =>
      chartData.map(item => ({
        match: { id: item.id },
        id: item.id,
      })),
    [chartData],
  );

  return (
    <section className="live-field">
      <LiveSectionHeader title="Weekend meta" detail="Leader & base choices from reported decks." />
      {chartData.length === 0 || totalDecks === 0 ? (
        <div
          className={cn(
            'live-quiet-state live-meta-empty m-0 py-5.5 px-4 border border-dashed border-border rounded-[12px]',
            'text-muted-foreground text-[12px] leading-[1.8]! flex items-center gap-4 mt-4',
            '[&_svg]:shrink-0',
          )}
        >
          <ChartNoAxesCombined size={25} strokeWidth={1.4} />
          <p className="m-0!">Deck breakdowns will appear as results arrive.</p>
        </div>
      ) : (
        <div
          className={cn(
            'live-field-layout grid grid-cols-[minmax(140px,_0.8fr)_minmax(0,_1.2fr)] items-center gap-5 mt-3.5',
            'max-mobile:grid-cols-1 max-mobile:gap-3',
          )}
        >
          <div className={cn('live-field-chart relative h-57.5 min-w-0', 'max-mobile:h-47.5')}>
            <div
              className={cn(
                'live-field-total absolute inset-0 flex flex-col items-center justify-center gap-[5px]',
                'pointer-events-none',
                '[&_strong]:text-[30px] [&_strong]:font-medium [&_strong]:tracking-[-0.04em]',
                '[&_span]:text-[10px] [&_span]:text-muted-foreground',
              )}
            >
              <strong>{totalDecks.toLocaleString()}</strong>
              <span>reported decks</span>
            </div>
            <ResponsivePie
              data={chartData}
              role="img"
              ariaLabel="Weekend deck distribution"
              margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
              innerRadius={0.78}
              padAngle={1.5}
              cornerRadius={3}
              activeOuterRadiusOffset={5}
              arcLinkLabelsSkipAngle={10}
              colors={['#3B3B3B']}
              arcLinkLabelsThickness={0}
              arcLinkLabel={() => ''}
              enableArcLabels={false}
              arcLabelsTextColor="#fff"
              defs={chartDefs}
              fill={fill}
              tooltip={({ datum }) => {
                const data = datum.data as MetaPieItem;

                return (
                  <div className="rounded-md border bg-card p-2 text-sm shadow-md">
                    <div className="flex items-center gap-2">
                      {labelRenderer(datum.id as string, 'leadersAndBase', 'compact')}
                      <span className="font-bold">{datum.value}</span>
                      <span className="text-xs">
                        ({((Number(datum.value) / totalDecks) * 100).toFixed(1)}%)
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Top 8: {data.data.top8} | Winners: {data.data.winners}
                    </div>
                  </div>
                );
              }}
            />
          </div>
          <div
            className={cn(
              'live-field-breakdown',
              '[&_>_button]:mt-3 [&_>_button]:pl-0 [&_>_button]:text-[10px]',
              'max-mobile:py-0 max-mobile:px-0.5',
            )}
          >
            <ol
              className={cn(
                'live-field-leaders list-none m-0 p-0 grid gap-3.5',
                '[&_li]:grid [&_li]:grid-cols-[minmax(0,_1fr)_auto] [&_li]:gap-x-3',
              )}
            >
              {(showAll ? metaRows : metaRows.slice(0, 5)).map(row => (
                <li key={row.id} title={`Top 8: ${row.data.top8} · Winners: ${row.data.winners}`}>
                  <div
                    className={cn(
                      'live-field-label min-w-0 self-center text-[11px]',
                      '[&_>_div]:flex-wrap',
                    )}
                  >
                    {labelRenderer(row.id, 'leadersAndBase', 'compact')}
                  </div>
                  <div
                    className={cn(
                      'live-field-numbers grid gap-0.5 text-right tabular-nums',
                      '[&_strong]:text-[11px] [&_strong]:font-medium',
                      '[&_span]:text-[9px] [&_span]:text-muted-foreground',
                    )}
                  >
                    <strong>{((row.value / totalDecks) * 100).toFixed(1)}%</strong>
                    <span>{row.value} decks</span>
                  </div>
                  <div
                    className={cn(
                      'live-field-bar col-span-full h-[3px] mt-1.5 rounded-[4px] bg-muted',
                      '[&_span]:block [&_span]:h-full [&_span]:rounded-[inherit] [&_span]:bg-[var(--live-accent)]',
                      '[&_span]:opacity-55',
                    )}
                    aria-hidden="true"
                  >
                    <span style={{ width: `${(row.value / totalDecks) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ol>
            {metaRows.length > 5 && (
              <Button variant="ghost" size="sm" onClick={() => setShowAll(value => !value)}>
                {showAll ? 'Show top five' : `View all ${metaRows.length} combinations`}
              </Button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

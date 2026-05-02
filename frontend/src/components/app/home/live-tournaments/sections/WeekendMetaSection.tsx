import { useMemo } from 'react';
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
    <section className="flex h-full w-full flex-col gap-3">
      <LiveSectionHeader title="Meta" />
      {chartData.length === 0 || totalDecks === 0 ? (
        <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          No meta data yet
        </div>
      ) : (
        <div className="h-[320px] w-full">
          <ResponsivePie
            data={chartData}
            margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
            innerRadius={0.5}
            padAngle={0.7}
            cornerRadius={3}
            activeOuterRadiusOffset={8}
            arcLinkLabelsSkipAngle={10}
            colors={['#3B3B3B']}
            arcLinkLabelsThickness={0}
            arcLinkLabel={() => ''}
            arcLabelsSkipAngle={10}
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
      )}
    </section>
  );
}

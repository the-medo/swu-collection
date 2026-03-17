import * as React from 'react';
import { useMemo, useState } from 'react';
import { ResponsivePie } from '@nivo/pie';
import { useLabel } from '@/components/app/tournaments/TournamentMeta/useLabel.tsx';
import { MetaInfo } from '@/components/app/tournaments/TournamentMeta/MetaInfoSelector.tsx';
import { useChartColorsAndGradients } from '@/components/app/tournaments/TournamentMeta/useChartColorsAndGradients.tsx';
import { useTheme } from '@/components/theme-provider.tsx';
import StatisticsMetaTooltip from '@/components/app/statistics/StatisticsMeta/StatisticsMetaTooltip.tsx';
import { StatisticsMetaDataItem } from '@/components/app/statistics/StatisticsMeta/statisticsMetaLib.ts';

interface StatisticsMetaPieChartProps {
  analysisData: StatisticsMetaDataItem[];
  totalMatches: number;
}

interface StatisticsMetaPieDatum {
  id: string;
  label: string;
  value: number;
  item: StatisticsMetaDataItem;
}

const metaInfo: MetaInfo = 'leadersAndBase';

const StatisticsMetaPieChart: React.FC<StatisticsMetaPieChartProps> = ({
  analysisData,
  totalMatches,
}) => {
  const labelRenderer = useLabel();
  const { theme } = useTheme();
  const pieChartColorDefinitions = useChartColorsAndGradients();
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  const chartData = useMemo<StatisticsMetaPieDatum[]>(() => {
    const topItems = analysisData.slice(0, 20).map(item => ({
      id: item.key,
      label: item.key,
      value: item.count,
      item,
    }));

    if (analysisData.length <= 20) {
      return topItems;
    }

    const remainingItems = analysisData.slice(20);
    const othersCount = remainingItems.reduce((sum, item) => sum + item.count, 0);

    if (othersCount === 0) {
      return topItems;
    }

    topItems.push({
      id: 'Others',
      label: 'Others',
      value: othersCount,
      item: {
        key: 'Others',
        count: othersCount,
        wins: remainingItems.reduce((sum, item) => sum + item.wins, 0),
        losses: remainingItems.reduce((sum, item) => sum + item.losses, 0),
        draws: remainingItems.reduce((sum, item) => sum + item.draws, 0),
        gameWins: remainingItems.reduce((sum, item) => sum + item.gameWins, 0),
        gameLosses: remainingItems.reduce((sum, item) => sum + item.gameLosses, 0),
        percentage: parseFloat(((othersCount / totalMatches) * 100).toFixed(1)),
      },
    });

    return topItems;
  }, [analysisData, totalMatches]);

  const chartDefs = chartData.map(item => pieChartColorDefinitions(item.id, metaInfo));
  const fill = chartData.map(item => ({
    match: { id: item.id },
    id: item.id,
  }));
  const hoveredItem = chartData.find(item => item.id === hoveredKey)?.item ?? null;

  if (analysisData.length === 0) {
    return <p className="text-muted-foreground">No opponent meta available for the selected filters.</p>;
  }

  return (
    <div className="w-full flex flex-col overflow-visible">
      <div
        className="mx-auto aspect-square max-h-[350px] w-full overflow-visible"
        style={{ height: '350px' }}
      >
        <ResponsivePie
          data={chartData}
          margin={{ top: 40, right: 100, bottom: 30, left: 100 }}
          innerRadius={0.5}
          padAngle={0.7}
          cornerRadius={3}
          activeOuterRadiusOffset={8}
          arcLinkLabelsSkipAngle={10}
          colors={['#3B3B3B']}
          arcLinkLabelsTextColor={{
            from: 'color',
            modifiers: [[theme === 'light' ? 'darker' : 'brighter', 3]],
          }}
          arcLinkLabelsThickness={2}
          arcLinkLabelsColor={{ from: 'color' }}
          arcLinkLabel={datum => labelRenderer(datum.label as string, metaInfo, 'text') as string}
          arcLabelsSkipAngle={10}
          arcLabelsTextColor={{
            from: 'color',
            modifiers: [['brighter', 10]],
          }}
          defs={chartDefs}
          fill={fill}
          onMouseEnter={datum => setHoveredKey(datum.id as string)}
          tooltip={({ datum }) => (
            <div className="bg-card p-2 rounded-md shadow-md border">
              <div className="flex items-center gap-2 flex-wrap">
                {labelRenderer(datum.id as string, metaInfo, 'compact')}
                <span className="font-bold">{datum.value}</span>
                <span className="text-xs">({((datum.value / totalMatches) * 100).toFixed(1)}%)</span>
              </div>
            </div>
          )}
        />
      </div>

      {hoveredItem && (
        <div className="mt-4 p-4 border rounded-lg bg-card">
          <StatisticsMetaTooltip
            item={hoveredItem}
            totalMatches={totalMatches}
            labelRenderer={labelRenderer}
          />
        </div>
      )}
    </div>
  );
};

export default StatisticsMetaPieChart;

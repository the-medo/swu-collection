import * as React from 'react';
import { useCallback, useMemo } from 'react';
import { ResponsivePie } from '@nivo/pie';
import { useLabel } from '@/components/app/tournaments/TournamentMeta/useLabel.tsx';
import { MetaInfo } from '@/components/app/tournaments/TournamentMeta/MetaInfoSelector.tsx';
import { getDeckKey2 } from '@/components/app/tournaments/TournamentMeta/tournamentMetaLib.ts';
import { useTournamentMetaActions } from '@/components/app/tournaments/TournamentMeta/useTournamentMetaStore.ts';
import { usePieChartColors } from '@/components/app/tournaments/TournamentMeta/usePieChartColors.tsx';
import { useTheme } from '@/components/theme-provider.tsx';
import { TournamentGroupLeaderBase } from '../../../../../../../server/db/schema/tournament_group_leader_base';
import { useCardList } from '@/api/lists/useCardList.ts';

interface PQStatPieChartProps {
  metaInfo: MetaInfo;
  data: TournamentGroupLeaderBase[];
  top: 'winners' | 'top8' | 'total';
}

// Define colors for the pie chart segments using shades of primary/secondary colors
const COLORS = [
  'hsl(var(--primary) / 0.9)',
  'hsl(var(--primary) / 0.85)',
  'hsl(var(--primary) / 0.8)',
  'hsl(var(--primary) / 0.75)',
  'hsl(var(--primary) / 0.7)',
  'hsl(var(--primary) / 0.65)',
  'hsl(var(--primary) / 0.6)',
  'hsl(var(--primary) / 0.55)',
  'hsl(var(--primary) / 0.5)',
  'hsl(var(--primary) / 0.45)',
  'hsl(var(--secondary) / 0.9)',
  'hsl(var(--secondary) / 0.85)',
  'hsl(var(--secondary) / 0.8)',
  'hsl(var(--secondary) / 0.75)',
  'hsl(var(--secondary) / 0.7)',
  'hsl(var(--secondary) / 0.65)',
  'hsl(var(--secondary) / 0.6)',
  'hsl(var(--secondary) / 0.55)',
  'hsl(var(--secondary) / 0.5)',
  'hsl(var(--secondary) / 0.45)',
  'hsl(var(--muted-foreground) / 0.8)', // Color for "Others" category
];

const PQStatPieChart: React.FC<PQStatPieChartProps> = ({ metaInfo, data, top }) => {
  const labelRenderer = useLabel();
  const { theme } = useTheme();
  const pieChartColorDefinitions = usePieChartColors();
  const { setTournamentDeckKey } = useTournamentMetaActions();
  const { data: cardListData } = useCardList();

  // Group and sum data based on the key
  const groupedData = useMemo(() => {
    const grouped: Record<string, number> = {};

    data.forEach(item => {
      const key = getDeckKey2(item.leaderCardId, item.baseCardId, metaInfo, cardListData);
      if (!grouped[key]) {
        grouped[key] = 0;
      }

      // Use the appropriate count based on the 'top' prop
      if (top === 'winners') {
        grouped[key] += item.winner;
      } else if (top === 'top8') {
        grouped[key] += item.top8;
      } else {
        grouped[key] += item.total;
      }
    });

    return Object.entries(grouped)
      .map(([key, count]) => ({ key, count }))
      .filter(item => item.count > 0) // Filter out items with zero count
      .sort((a, b) => b.count - a.count);
  }, [metaInfo, data, top, cardListData]);

  // Map all items for visualization
  const chartData = useMemo(() => {
    // Take the top 20 items
    const top20Items = groupedData.slice(0, 20).map((item, index) => ({
      id: item.key || 'Unknown',
      label: item.key || 'Unknown',
      value: item.count,
      color: COLORS[index % COLORS.length],
      originalIndex: index,
    }));

    // Calculate the sum of the remaining items (if any)
    if (groupedData.length > 20) {
      const remainingItems = groupedData.slice(20);
      const othersCount = remainingItems.reduce((sum, item) => sum + item.count, 0);

      // Only add "Others" category if there are remaining items with a non-zero sum
      if (othersCount > 0) {
        // Add the "Others" category
        top20Items.push({
          id: 'Others',
          label: 'Others',
          value: othersCount,
          color: COLORS[COLORS.length - 1], // Use the last color (dedicated for "Others")
          originalIndex: 20,
        });
      }
    }

    return top20Items;
  }, [groupedData]);

  // Calculate total count for percentage calculations
  const totalCount = useMemo(() => {
    return groupedData.reduce((sum, item) => sum + item.count, 0);
  }, [groupedData]);

  const handlePieClick = useCallback(
    (node: any) => {
      if (node.id !== 'Others') {
        setTournamentDeckKey({
          key: node.id,
          metaInfo: metaInfo as MetaInfo,
        });
      }
    },
    [metaInfo, setTournamentDeckKey],
  );

  const chartDefs = chartData.map(i => pieChartColorDefinitions(i.id, metaInfo));
  const fill = chartData.map(item => ({
    match: { id: item.id },
    id: item.id,
  }));

  if (groupedData.length === 0) {
    return <p className="text-muted-foreground">No data available for the selected filters.</p>;
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
          onClick={handlePieClick}
          tooltip={({ datum }) => (
            <div className="bg-card p-2 rounded-md shadow-md border">
              <div className="flex items-center gap-2">
                {labelRenderer(datum.id as string, metaInfo as MetaInfo, 'compact')}
                <span className="font-bold">{datum.value}</span>
                <span className="text-xs">({((datum.value / totalCount) * 100).toFixed(1)}%)</span>
              </div>
            </div>
          )}
        />
      </div>
    </div>
  );
};

export default PQStatPieChart;

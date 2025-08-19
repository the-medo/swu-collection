import * as React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ResponsivePie } from '@nivo/pie';
import { useLabel } from '@/components/app/tournaments/TournamentMeta/useLabel.tsx';
import { MetaInfo } from '@/components/app/tournaments/TournamentMeta/MetaInfoSelector.tsx';
import TournamentMetaTooltip, { TournamentMetaTooltipProps } from './TournamentMetaTooltip';
import {
  AnalysisDataItem,
  getTotalDeckCountBasedOnMetaPart,
} from '@/components/app/tournaments/TournamentMeta/tournamentMetaLib.ts';
import { useTournamentMetaActions } from '@/components/app/tournaments/TournamentMeta/useTournamentMetaStore.ts';
import { useChartColorsAndGradients } from '@/components/app/tournaments/TournamentMeta/useChartColorsAndGradients.tsx';
import { useTheme } from '@/components/theme-provider.tsx';

interface TournamentMetaPieChartProps {
  analysisData: AnalysisDataItem[];
  metaInfo: MetaInfo;
  metaPart: string;
  totalDecks: number;
  day2Decks: number;
  top8Decks: number;
  top64Decks: number;
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

const TournamentMetaPieChart: React.FC<TournamentMetaPieChartProps> = ({
  analysisData,
  metaInfo,
  metaPart,
  totalDecks,
  day2Decks,
  top8Decks,
  top64Decks,
}) => {
  const labelRenderer = useLabel();
  const { theme } = useTheme();
  const pieChartColorDefinitions = useChartColorsAndGradients();
  const { setTournamentDeckKey } = useTournamentMetaActions();
  const [hoveredItem, setHoveredItem] = useState<any>(null);

  // Reset the hovered item when the metaInfo or metaPart changes, because old information would be displayed
  useEffect(() => {
    setHoveredItem(null);
  }, [metaInfo, metaPart]);

  // Map all items for visualization
  const chartData = useMemo(() => {
    // Take the top 20 items
    const top20Items = analysisData.slice(0, 20).map((item, index) => ({
      id: item.key || 'Unknown',
      label: item.key || 'Unknown',
      value: item.count,
      data: item.data, // additional data for tooltip
      winrate: item.winrate,
      color: COLORS[index % COLORS.length],
      originalIndex: index,
    }));

    // Calculate the sum of the remaining items (if any)
    if (analysisData.length > 20) {
      const remainingItems = analysisData.slice(20);
      const othersCount = remainingItems.reduce((sum, item) => sum + item.count, 0);

      // Only add "Others" category if there are remaining items with a non-zero sum
      if (othersCount > 0) {
        // Combine data from all remaining items
        const combinedData: NonNullable<TournamentMetaTooltipProps['data']> = remainingItems.reduce(
          (acc, item) => {
            if (item.data) {
              acc.all += item.data.all || 0;
              acc.top8 += item.data.top8 || 0;
              acc.day2 += item.data.day2 || 0;
              acc.top64 += item.data.top64 || 0;
            }
            return acc;
          },
          {
            all: 0,
            top8: 0,
            day2: 0,
            top64: 0,
            conversionTop8: '',
            conversionDay2: '',
            conversionTop64: '',
          },
        );

        // Add percentages and conversion rates
        const totalDeckCount = getTotalDeckCountBasedOnMetaPart(
          metaPart,
          totalDecks,
          day2Decks,
          top8Decks,
          top64Decks,
        );
        if (totalDeckCount > 0) {
          combinedData.percentageAll = ((combinedData.all / totalDeckCount) * 100).toFixed(1);
          combinedData.percentageTop8 = ((combinedData.top8 / top8Decks) * 100).toFixed(1);
          combinedData.percentageDay2 = ((combinedData.day2 / day2Decks) * 100).toFixed(1);
          combinedData.percentageTop64 = ((combinedData.top64 / top64Decks) * 100).toFixed(1);
        }

        if (combinedData.all > 0) {
          combinedData.conversionTop8 =
            ((combinedData.top8 / combinedData.all) * 100).toFixed(1) + '%';
          combinedData.conversionDay2 =
            ((combinedData.day2 / combinedData.all) * 100).toFixed(1) + '%';
          combinedData.conversionTop64 =
            ((combinedData.top64 / combinedData.all) * 100).toFixed(1) + '%';
        } else {
          combinedData.conversionTop8 = '0.0%';
          combinedData.conversionDay2 = '0.0%';
          combinedData.conversionTop64 = '0.0%';
        }

        // Add the "Others" category
        top20Items.push({
          id: 'Others',
          label: 'Others',
          value: othersCount,
          data: combinedData,
          winrate: 0, // We don't have winrate data for the combined items
          color: COLORS[COLORS.length - 1], // Use the last color (dedicated for "Others")
          originalIndex: 20,
        });
      }
    }

    return top20Items;
  }, [analysisData, metaPart, totalDecks, day2Decks, top8Decks, top64Decks]);

  const totalDeckCountBasedOnMetaPart = getTotalDeckCountBasedOnMetaPart(
    metaPart,
    totalDecks,
    day2Decks,
    top8Decks,
    top64Decks,
  );

  const handlePieClick = useCallback(
    (node: any) => {
      setTournamentDeckKey({
        key: node.id,
        metaInfo: metaInfo as MetaInfo,
      });
    },
    [metaInfo, setTournamentDeckKey],
  );

  const handleMouseEnter = useCallback(
    (node: any) => {
      const matchingItem = chartData.find(item => item.id === node.id);
      if (matchingItem) {
        setHoveredItem({
          name: matchingItem.id,
          value: matchingItem.value,
          data: matchingItem.data,
          winrate: matchingItem.winrate,
        });
      }
    },
    [chartData],
  );

  const chartDefs = chartData.map(i => pieChartColorDefinitions(i.id, metaInfo));
  const fill = chartData.map(item => ({
    match: { id: item.id },
    id: item.id,
  }));

  if (analysisData.length === 0) {
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
          onMouseEnter={handleMouseEnter}
          tooltip={({ datum }) => (
            <div className="bg-card p-2 rounded-md shadow-md border">
              <div className="flex items-center gap-2">
                {labelRenderer(datum.id as string, metaInfo as MetaInfo, 'compact')}
                <span className="font-bold">{datum.value}</span>
                <span className="text-xs">
                  ({((datum.value / totalDeckCountBasedOnMetaPart) * 100).toFixed(1)}%)
                </span>
              </div>
            </div>
          )}
        />
      </div>

      {/* Display tooltip data under the chart */}
      {hoveredItem && (
        <div className="mt-4 p-4 border rounded-lg bg-card">
          <TournamentMetaTooltip
            name={hoveredItem.name}
            metaInfo={metaInfo as MetaInfo}
            labelRenderer={labelRenderer}
            value={hoveredItem.value}
            totalDeckCountBasedOnMetaPart={totalDeckCountBasedOnMetaPart}
            data={hoveredItem.data}
            totalDecks={totalDecks}
            day2Decks={day2Decks}
            top8Decks={top8Decks}
            top64Decks={top64Decks}
          />
        </div>
      )}
    </div>
  );
};

export default TournamentMetaPieChart;

import * as React from 'react';
import { useMemo } from 'react';
import { ResponsivePie } from '@nivo/pie';
import { useLabel } from '@/components/app/tournaments/TournamentMeta/useLabel.tsx';
import { useChartColorsAndGradients } from '@/components/app/tournaments/TournamentMeta/useChartColorsAndGradients.tsx';
import type { DailySnapshotMetaView } from './MetaViewSelector.tsx';

export interface ProcessedDataItem {
  key: string;
  total: number;
  top8: number;
  winners: number;
  sortValue: number;
}

interface MetaSharePieChartProps {
  processedData: ProcessedDataItem[];
  metaView: DailySnapshotMetaView;
}

const MetaSharePieChart: React.FC<MetaSharePieChartProps> = ({ processedData, metaView }) => {
  const labelRenderer = useLabel();
  const pieChartColorDefinitions = useChartColorsAndGradients();

  // Transform processed data into chart data
  const chartData = useMemo(() => {
    // Take the top 20 items from already processed and sorted data
    const top20Items = processedData.slice(0, 20).map((item, index) => ({
      id: item.key || 'Unknown',
      label: item.key || 'Unknown',
      value: item.sortValue,
      data: {
        total: item.total,
        top8: item.top8,
        winners: item.winners,
      },
      originalIndex: index,
    }));

    // Calculate the sum of the remaining items (if any) and add "Others" at the end
    if (processedData.length > 20) {
      const remainingItems = processedData.slice(20);
      const othersCount = remainingItems.reduce((sum, item) => sum + item.sortValue, 0);

      // Only add "Others" category if there are remaining items with a non-zero sum
      if (othersCount > 0) {
        // Combine data from all remaining items
        const combinedData = remainingItems.reduce(
          (acc, item) => {
            acc.total += item.total;
            acc.top8 += item.top8;
            acc.winners += item.winners;
            return acc;
          },
          {
            total: 0,
            top8: 0,
            winners: 0,
          },
        );

        // Add the "Others" category at the end
        top20Items.push({
          id: 'Others',
          label: 'Others',
          value: othersCount,
          data: combinedData,
          originalIndex: 20,
        });
      }
    }

    return top20Items;
  }, [processedData]);

  const totalCount = useMemo(() => {
    return processedData.reduce((sum, item) => sum + item.sortValue, 0);
  }, [processedData]);

  const metaInfo = metaView === 'leaders' ? 'leaders' : 'leadersAndBase';
  const chartDefs = useMemo(
    () => chartData.map(i => pieChartColorDefinitions(i.id, metaInfo)),
    [chartData, metaInfo, pieChartColorDefinitions],
  );
  const fill = useMemo(
    () =>
      chartData.map(item => ({
        match: { id: item.id },
        id: item.id,
      })),
    [chartData],
  );

  if (processedData.length === 0) {
    return <p className="text-muted-foreground">No data available.</p>;
  }

  return (
    <div className="w-full flex flex-col overflow-visible">
      <div className="mx-auto aspect-square h-[300px] max-h-[350px] w-full overflow-visible">
        <ResponsivePie
          data={chartData}
          margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
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
          tooltip={({ datum }) => (
            <div className="bg-card p-2 rounded-md shadow-md border">
              <div className="flex items-center gap-2">
                {labelRenderer(datum.id as string, metaInfo, 'compact')}
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

export default MetaSharePieChart;

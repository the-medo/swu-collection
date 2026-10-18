import { cn } from '@/lib/utils.ts';
import * as React from 'react';
import { useMemo } from 'react';
import { ResponsivePie } from '@nivo/pie';
import { useLabel } from '@/components/app/tournaments/TournamentMeta/useLabel.tsx';
import { useChartColorsAndGradients } from '@/components/app/tournaments/TournamentMeta/useChartColorsAndGradients.tsx';
import type { DailySnapshotMetaView } from './MetaViewSelector.tsx';
import { useReducedMotion } from 'motion/react';

import { collapseMetaShareData, type ProcessedDataItem } from './metaShareData.ts';
import { isKnownSnapshotDeckKey } from '../snapshotDeckKey.ts';

interface MetaSharePieChartProps {
  processedData: ProcessedDataItem[];
  metaView: DailySnapshotMetaView;
  onClick?: (key: string) => void;
}

const MetaSharePieChart: React.FC<MetaSharePieChartProps> = ({
  processedData,
  metaView,
  onClick,
}) => {
  const labelRenderer = useLabel();
  const reducedMotion = useReducedMotion();
  const pieChartColorDefinitions = useChartColorsAndGradients();

  const chartData = useMemo(
    () =>
      collapseMetaShareData(processedData, 20).map(item => ({
        id: item.key,
        label: item.key,
        value: item.sortValue,
      })),
    [processedData],
  );

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
    <div className={cn('meta-share-donut w-full max-w-70 aspect-[1]', 'max-tablet-small:max-w-60')}>
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
        animate={!reducedMotion}
        layers={['arcs', 'arcLabels']}
        onClick={node => {
          const key = String(node.id);
          if (isKnownSnapshotDeckKey(key)) onClick?.(key);
        }}
        tooltip={({ datum }) => (
          <div className="bg-card p-2 rounded-md shadow-md border">
            <div className="flex items-center gap-2">
              {labelRenderer(datum.id as string, metaInfo, 'compact')}
              <span className="font-bold">{datum.value}</span>
              <span className="text-xs">
                ({(totalCount > 0 ? (datum.value / totalCount) * 100 : 0).toFixed(1)}%)
              </span>
            </div>
          </div>
        )}
      />
    </div>
  );
};

export default MetaSharePieChart;

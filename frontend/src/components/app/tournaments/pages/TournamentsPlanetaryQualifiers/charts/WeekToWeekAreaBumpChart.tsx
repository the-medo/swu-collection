import * as React from 'react';
import { ResponsiveAreaBump } from '@nivo/bump';
import { useCallback } from 'react';
import { MetaInfo } from '@/components/app/tournaments/TournamentMeta/MetaInfoSelector.tsx';
import { useLabel } from '@/components/app/tournaments/TournamentMeta/useLabel.tsx';
import { labelWidthBasedOnMetaInfo } from '@/components/app/tournaments/TournamentMeta/tournamentMetaLib.ts';
import { useWeekToWeekStoreActions } from '@/components/app/tournaments/pages/TournamentsPlanetaryQualifiers/WeekToWeek/useWeekToWeekStore.ts';
import {
  bottomAxisDefinition,
  topAxisDefinition,
} from '@/components/app/tournaments/pages/TournamentsPlanetaryQualifiers/WeekToWeek/weekToWeekLib.ts';

// Define the data structure for the AreaBump chart
interface AreaBumpData {
  x: number;
  y: number;
  groupId?: string; // Store the group ID for click handling
}

interface AreaBumpChartData {
  id: string;
  data: {
    x: number;
    y: number;
    groupId?: string;
  }[];
}

interface WeekToWeekAreaBumpChartProps {
  chartData: AreaBumpChartData[];
  metaInfo: MetaInfo;
  chartDefs: any[];
  fill: any[];
}

const WeekToWeekAreaBumpChart: React.FC<WeekToWeekAreaBumpChartProps> = ({
  chartData,
  metaInfo,
  chartDefs,
  fill,
}) => {
  const labelRenderer = useLabel();
  const labelWidth = labelWidthBasedOnMetaInfo[metaInfo];
  const { setWeekIdToCompare } = useWeekToWeekStoreActions();

  const labelCallback = useCallback(
    (startOrEnd?: 'start' | 'end') => datum => {
      const l = datum.data?.length;
      if (
        (startOrEnd === 'start' && datum.data[0]?.y === 0) ||
        (startOrEnd === 'end' && datum.data[l - 1]?.y === 0)
      )
        return '';
      return labelRenderer(datum.id as string, metaInfo, 'text') as string;
    },
    [metaInfo, labelRenderer],
  );

  const handleChartMouseEvent = useCallback(
    (data, event) => {
      const clickX = event.nativeEvent.offsetX;
      const adjustedX = clickX - labelWidth;

      // Find the closest point to the adjusted X coordinate
      if (data.points && data.points.length > 0) {
        // Calculate distances from adjusted X to each point's X coordinate
        const pointsWithDistance = data.points.map(point => ({
          point,
          distance: Math.abs(point.x - adjustedX),
        }));

        // Sort by distance (closest first)
        pointsWithDistance.sort((a, b) => a.distance - b.distance);

        // Get the closest point
        const closestPoint = pointsWithDistance[0].point;

        // Extract the groupId from the closest point
        const groupId = closestPoint.data.groupId;

        // Set the weekIdToCompare using the store action
        if (groupId) {
          setWeekIdToCompare(groupId);
        }
      }
    },
    [labelWidth, setWeekIdToCompare],
  );

  return (
    <div style={{ height: 500 }}>
      <ResponsiveAreaBump<AreaBumpData>
        data={chartData}
        margin={{
          top: 40,
          right: labelWidth,
          bottom: 40,
          left: labelWidth,
        }}
        spacing={4}
        colors={['#3B3B3B']} // Use the same base color as PQStatPieChart
        blendMode="normal"
        defs={chartDefs}
        fill={fill}
        startLabel={labelCallback('start')}
        startLabelTextColor={'hsl(var(--muted-foreground))'}
        endLabelTextColor={'hsl(var(--muted-foreground))'}
        endLabel={labelCallback('end')}
        axisTop={topAxisDefinition}
        axisBottom={bottomAxisDefinition}
        tooltip={x => {
          const { serie } = x;
          return (
            <div className="bg-card p-2 rounded-md shadow-md border">
              <div className="flex items-center gap-2">
                {labelRenderer(serie.id as string, metaInfo, 'compact')}
                <pre className="text-xs">{JSON.stringify(serie, null, 2)}</pre>
              </div>
            </div>
          );
        }}
        onMouseMove={(data, event) => {
          // console.log('data.points', data.points, 'event X', event.nativeEvent.offsetX);
        }}
        onClick={handleChartMouseEvent}
      />
    </div>
  );
};

export default WeekToWeekAreaBumpChart;
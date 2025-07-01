import * as React from 'react';
import {
  AreaBumpAreaTooltip,
  AreaBumpLabel,
  AreaBumpMouseHandler,
  ResponsiveAreaBump,
} from '@nivo/bump';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { MetaInfo } from '@/components/app/tournaments/TournamentMeta/MetaInfoSelector.tsx';
import { useLabel } from '@/components/app/tournaments/TournamentMeta/useLabel.tsx';
import { labelWidthBasedOnMetaInfo } from '@/components/app/tournaments/TournamentMeta/tournamentMetaLib.ts';
import {
  useWeekToWeekStore,
  useWeekToWeekStoreActions,
} from '@/components/app/tournaments/pages/TournamentsPlanetaryQualifiers/WeekToWeek/useWeekToWeekStore.ts';
import {
  bottomAxisDefinition as baseBottomAxisDefinition,
  getMetaPartObjectValue,
  topAxisDefinition as baseTopAxisDefinition,
} from '@/components/app/tournaments/pages/TournamentsPlanetaryQualifiers/WeekToWeek/weekToWeekLib.ts';
import { WeekToWeekData } from '@/components/app/tournaments/pages/TournamentsPlanetaryQualifiers/WeekToWeek/useWeekToWeekData.ts';
import { PQTop } from '@/components/app/tournaments/pages/TournamentsPlanetaryQualifiers/pqLib.ts';
import { useChartColorsAndGradients } from '@/components/app/tournaments/TournamentMeta/useChartColorsAndGradients.tsx';
import WeekToWeekAreaBumpTooltip from './WeekToWeekAreaBumpTooltip';
import { useIsMobile } from '@/hooks/use-mobile.tsx';
import { cn } from '@/lib/utils.ts';

// Define the data structure for the AreaBump chart
interface AreaBumpData {
  x: number;
  y: number;
  groupId?: string; // Store the group ID for click handling
}

interface WeekToWeekAreaBumpChartProps {
  data: WeekToWeekData;
  top: PQTop;
  metaInfo: MetaInfo;
  viewType: 'count' | 'percentage';
}

const WeekToWeekAreaBumpChart: React.FC<WeekToWeekAreaBumpChartProps> = ({
  data,
  top,
  metaInfo,
  viewType,
}) => {
  const pieChartColorDefinitions = useChartColorsAndGradients();
  const [hoveredWeekId, setHoveredWeekId] = useState<string | null>(null);

  const labelRenderer = useLabel();
  const isMobile = useIsMobile();
  const labelWidth = isMobile ? 0 : labelWidthBasedOnMetaInfo[metaInfo];
  const { setWeekIdToCompare, setDeckKey } = useWeekToWeekStoreActions();
  const { hoveredRowKey } = useWeekToWeekStore();

  // Effect to highlight the area in the chart based on hovered row
  useEffect(() => {
    // Find the chart container
    const chartContainer = document.getElementById('pq-wtw-area-bump-chart');
    if (!chartContainer) return;

    // Find all SVG path elements with data-testid starting with "area."
    const areaPaths = chartContainer.querySelectorAll('path[data-testid^="area."]');

    areaPaths.forEach(path => {
      const testId = path.getAttribute('data-testid');
      if (!testId) return;
      path.setAttribute('cursor', 'pointer');

      // Check if this path corresponds to the hovered row
      const shouldBeFilled = hoveredRowKey === null || testId === `area.${hoveredRowKey}`;

      // Set fill-opacity based on whether the path is hovered
      path.setAttribute('fill-opacity', shouldBeFilled ? '1' : '0.15');
      path.setAttribute('stroke-width', shouldBeFilled ? '1' : '0');
    });
  }, [hoveredRowKey, metaInfo, viewType]);

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

  const startLabelCallback: AreaBumpLabel<AreaBumpData, Record<string, unknown>> = useCallback(
    d => labelCallback('start')(d),
    [labelCallback],
  );
  const endLabelCallback: AreaBumpLabel<AreaBumpData, Record<string, unknown>> = useCallback(
    d => labelCallback('end')(d),
    [labelCallback],
  );

  const handleChartMouseEvent: AreaBumpMouseHandler<
    AreaBumpData,
    Record<string, unknown>
  > = useCallback(
    (data, event) => {
      const clickX = event.nativeEvent.offsetX;
      const adjustedX = clickX - labelWidth;

      if (data.points && data.points.length > 0) {
        let closestWeekId = undefined;
        let closestWeekDistance = Infinity;
        data.points.forEach(p => {
          const distance = Math.abs(p.x - adjustedX);
          if (distance < closestWeekDistance) {
            closestWeekDistance = distance;
            closestWeekId = p.data.groupId;
          }
        });
        if (closestWeekId) {
          setWeekIdToCompare(closestWeekId);
        }
      }

      setDeckKey(data.id);
    },
    [labelWidth, setWeekIdToCompare],
  );

  const handleChartMouseMove: AreaBumpMouseHandler<
    AreaBumpData,
    Record<string, unknown>
  > = useCallback(
    (data, event) => {
      const moveX = event.nativeEvent.offsetX;
      const adjustedX = moveX - labelWidth;

      if (data.points && data.points.length > 0) {
        let closestWeekId = null;
        let closestWeekDistance = Infinity;
        data.points.forEach(p => {
          const distance = Math.abs(p.x - adjustedX);
          if (distance < closestWeekDistance) {
            closestWeekDistance = distance;
            closestWeekId = p.data.groupId;
          }
        });
        setHoveredWeekId(closestWeekId);
      }
    },
    [labelWidth],
  );

  // Transform the data for the AreaBump chart
  const chartData = useMemo(() => {
    const { sortedWeeks, weekMap, deckKeyToWeek } = data;

    // Define the constant X for top occurrences
    const TOP_X = 6;

    if (sortedWeeks.length === 0) return [];

    const allCombinations = new Map<string, { id: string; data: any[] }>();
    Object.keys(deckKeyToWeek).forEach(deckKey => {
      allCombinations.set(deckKey, {
        id: deckKey,
        data: [],
      });
    });

    // Create a map to track deck keys that appear in the top X at least once
    const topDeckKeysMap: Record<string, boolean> = {};

    // For percentage view, we need to track total counts per week
    const weekTotals: Record<string, number> = {};

    // First pass: collect all data and calculate totals for percentage view
    if (viewType === 'percentage') {
      sortedWeeks.forEach(weekId => {
        let weekTotal = 0;
        Object.keys(deckKeyToWeek).forEach(deckKey => {
          const leaderBase = deckKeyToWeek[deckKey][weekId];
          const y = getMetaPartObjectValue(leaderBase, top) || 0;
          weekTotal += y;
        });
        weekTotals[weekId] = weekTotal;
      });
    }

    // Process each week
    sortedWeeks.forEach(weekId => {
      const group = weekMap[weekId];
      if (!group) return;

      // Collect all deck keys and their y values for this week
      const weekData: Array<{ deckKey: string; y: number }> = [];

      Object.keys(deckKeyToWeek).forEach(deckKey => {
        const leaderBase = deckKeyToWeek[deckKey][weekId];
        let y = getMetaPartObjectValue(leaderBase, top) || 0;

        // Convert to percentage if needed
        if (viewType === 'percentage' && weekTotals[weekId] > 0) {
          y = (y / weekTotals[weekId]) * 100;
        }

        weekData.push({ deckKey, y });
      });

      // Sort by y value in descending order and take the top X
      weekData.sort((a, b) => b.y - a.y);
      const topXDeckKeys = weekData
        .slice(0, TOP_X)
        .filter(item => item.y > 0) // Only include items with y > 0
        .map(item => item.deckKey);

      // Add these deck keys to the map
      topXDeckKeys.forEach(deckKey => {
        topDeckKeysMap[deckKey] = true;
      });

      // Add data points for each deck key
      allCombinations.forEach((value, deckKey) => {
        const leaderBase = deckKeyToWeek[deckKey][weekId];
        let y = getMetaPartObjectValue(leaderBase, top) || 0;

        // Convert to percentage if needed
        if (viewType === 'percentage' && weekTotals[weekId] > 0) {
          y = (y / weekTotals[weekId]) * 100;
        }

        value.data.push({
          x: group.weekNumber,
          y: y,
          groupId: weekId,
        });
      });
    });

    // Filter the combinations to only include those in the topDeckKeysMap
    const result = Array.from(allCombinations.values()).filter(item => {
      return topDeckKeysMap[item.id];
    });

    // Sort by total y values in descending order
    result.sort((a, b) => {
      const sumA = a.data.reduce((sum, point) => sum + point.y, 0);
      const sumB = b.data.reduce((sum, point) => sum + point.y, 0);
      return sumB - sumA;
    });

    return result;
  }, [data, top, viewType]);

  // Generate chart definitions using pieChartColorDefinitions
  const chartDefs = useMemo(() => {
    return chartData.map(item => pieChartColorDefinitions(item.id, metaInfo));
  }, [chartData, metaInfo, pieChartColorDefinitions]);

  // Create fill patterns for each item
  const fill = useMemo(() => {
    return chartData.map(item => ({
      match: { id: item.id },
      id: item.id,
    }));
  }, [chartData]);

  // Create custom axis definitions based on viewType
  const topAxisDefinition = useMemo(() => {
    return {
      ...baseTopAxisDefinition,
      legend: viewType === 'percentage' ? 'Week (%)' : 'Week',
    };
  }, [viewType]);

  const bottomAxisDefinition = useMemo(() => {
    return {
      ...baseBottomAxisDefinition,
      legend: viewType === 'percentage' ? 'Week (%)' : 'Week',
    };
  }, [viewType]);

  const tooltip: AreaBumpAreaTooltip<AreaBumpData, Record<string, unknown>> = useCallback(
    chartData => {
      const { serie } = chartData;
      const deckKey = serie.id as string;

      return (
        <WeekToWeekAreaBumpTooltip
          deckKey={deckKey}
          metaInfo={metaInfo}
          top={top}
          hoveredWeekId={hoveredWeekId}
          data={data}
          labelRenderer={labelRenderer}
        />
      );
    },
    [metaInfo, top, hoveredWeekId, data, labelRenderer],
  );

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center p-12 border rounded-md">
        <h2 className="text-2xl font-bold text-muted-foreground">
          No data available for week-to-week comparison
        </h2>
      </div>
    );
  }

  return (
    <div className={cn('h-[500px] min-w-[700px]')} id="pq-wtw-area-bump-chart">
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
        // activeSerieIds={['darth-vader--victor-squadron-leader']}
        startLabel={startLabelCallback}
        startLabelTextColor={'hsl(var(--muted-foreground))'}
        endLabelTextColor={'hsl(var(--muted-foreground))'}
        endLabel={endLabelCallback}
        axisTop={topAxisDefinition}
        axisBottom={bottomAxisDefinition}
        tooltip={tooltip}
        onMouseMove={handleChartMouseMove}
        onClick={handleChartMouseEvent}
      />
    </div>
  );
};

export default WeekToWeekAreaBumpChart;

import * as React from 'react';
import { useState, useMemo, useCallback, useEffect } from 'react';
import { DataTable } from '@/components/ui/data-table.tsx';
import { MetaInfo } from '@/components/app/tournaments/TournamentMeta/MetaInfoSelector.tsx';
import { WeekToWeekData } from '@/components/app/tournaments/pages/TournamentsPlanetaryQualifiers/WeekToWeek/useWeekToWeekData.ts';
import { PQTop } from '@/components/app/tournaments/pages/TournamentsPlanetaryQualifiers/pqLib.ts';
import {
  WeekToWeekDataTableSorting,
  WeekToWeekTableRow,
  useWeekToWeekDataTableColumns,
} from '@/components/app/tournaments/pages/TournamentsPlanetaryQualifiers/WeekToWeek/data-view/useWeekToWeekDataTableColumns.tsx';
import { getMetaPartObjectValue } from '@/components/app/tournaments/pages/TournamentsPlanetaryQualifiers/WeekToWeek/weekToWeekLib.ts';
import { useWeekToWeekStoreActions } from '@/components/app/tournaments/pages/TournamentsPlanetaryQualifiers/WeekToWeek/useWeekToWeekStore.ts';
import { Row } from '@tanstack/react-table';

interface WeekToWeekDataTableProps {
  data: WeekToWeekData;
  top: PQTop;
  metaInfo: MetaInfo;
  viewType: 'count' | 'percentage';
}

const WeekToWeekDataTable: React.FC<WeekToWeekDataTableProps> = ({
  data,
  top,
  metaInfo,
  viewType,
}) => {
  const [showCounts, setShowCounts] = useState(viewType === 'count');

  // Set default sorting to the most recent week column
  const [sorting, setSorting] = useState<WeekToWeekDataTableSorting>(() => {
    // If there are weeks, sort by the most recent week
    if (data.sortedWeeks.length > 0) {
      const mostRecentWeekId = data.sortedWeeks[data.sortedWeeks.length - 1];
      return {
        id: `week_${mostRecentWeekId}`,
        desc: true,
      };
    }
    // Fallback to sorting by deck key
    return {
      id: 'deckKey',
      desc: false,
    };
  });

  const { setDeckKey, setWeekIdToCompare } = useWeekToWeekStoreActions();

  // Handle row hover events to highlight corresponding areas in the chart
  const handleRowMouseEnter = useCallback(
    (row: Row<WeekToWeekTableRow>) => {
      console.log(row.original.deckKey);
      setDeckKey(row.original.deckKey);
    },
    [setDeckKey],
  );

  // Get column definitions
  const columns = useWeekToWeekDataTableColumns(
    data,
    showCounts,
    sorting,
    setSorting,
    metaInfo,
    top,
  );

  // Transform the data for the table
  const tableData: WeekToWeekTableRow[] = useMemo(() => {
    const { sortedWeeks, deckKeyToWeek, weekTotals } = data;

    // Define the constant X for top occurrences (similar to WeekToWeekAreaBumpChart)
    const TOP_X = 6;

    if (sortedWeeks.length === 0) return [];

    // Create a map to track deck keys that appear in the top X at least once
    const topDeckKeysMap: Record<string, boolean> = {};

    // First pass: identify top deck keys across all weeks
    sortedWeeks.forEach(weekId => {
      // Collect all deck keys and their values for this week
      const weekData: Array<{ deckKey: string; value: number }> = [];

      Object.entries(deckKeyToWeek).forEach(([deckKey, weekValues]) => {
        const weekValue = weekValues[weekId];
        const value = getMetaPartObjectValue(weekValue, top) || 0;
        weekData.push({ deckKey, value });
      });

      // Sort by value in descending order and take the top X
      weekData.sort((a, b) => b.value - a.value);
      const topXDeckKeys = weekData
        .slice(0, TOP_X)
        .filter(item => item.value > 0)
        .map(item => item.deckKey);

      // Add these deck keys to the map
      topXDeckKeys.forEach(deckKey => {
        topDeckKeysMap[deckKey] = true;
      });
    });

    // Second pass: create table rows for top deck keys
    const rows: WeekToWeekTableRow[] = Object.keys(topDeckKeysMap).map(deckKey => {
      const row: WeekToWeekTableRow = { deckKey };

      // Add data for each week
      sortedWeeks.forEach((weekId, index) => {
        const weekValue = deckKeyToWeek[deckKey]?.[weekId];
        const value = getMetaPartObjectValue(weekValue, top) || 0;

        // Calculate percentage if needed
        const weekTotal = getMetaPartObjectValue(weekTotals[weekId], top) || 0;
        const displayValue = showCounts ? value : weekTotal > 0 ? (value / weekTotal) * 100 : 0;

        // Add value to row
        row[`week_${weekId}`] = displayValue;

        // Calculate change from previous week
        if (index > 0) {
          const prevWeekId = sortedWeeks[index - 1];
          const prevWeekValue = deckKeyToWeek[deckKey]?.[prevWeekId];
          const prevValue = getMetaPartObjectValue(prevWeekValue, top) || 0;

          // Calculate change
          if (showCounts) {
            // Simple difference for counts
            row[`week_${weekId}_change`] = value - prevValue;
          } else {
            // For percentages, we need to calculate the previous percentage
            const prevWeekTotal = getMetaPartObjectValue(weekTotals[prevWeekId], top) || 0;
            const prevPercentage = prevWeekTotal > 0 ? (prevValue / prevWeekTotal) * 100 : 0;
            const currentPercentage = weekTotal > 0 ? (value / weekTotal) * 100 : 0;

            row[`week_${weekId}_change`] = currentPercentage - prevPercentage;
          }
        } else {
          // No change for the first week
          row[`week_${weekId}_change`] = 0;
        }
      });

      return row;
    });

    return rows;
  }, [data, top, showCounts]);

  // Sort the table data
  const sortedData = useMemo(() => {
    if (!tableData.length) return [];

    return [...tableData].sort((a, b) => {
      const multiplier = sorting.desc ? -1 : 1;

      // Handle sorting by deck key
      if (sorting.id === 'deckKey') {
        return a.deckKey.localeCompare(b.deckKey) * multiplier;
      }

      // Handle sorting by week columns
      const aValue = a[sorting.id] || 0;
      const bValue = b[sorting.id] || 0;

      return (aValue - bValue) * multiplier;
    });
  }, [tableData, sorting]);

  useEffect(() => {
    setShowCounts(viewType === 'count');
  }, [viewType]);

  const onCellMouseEnter = useCallback(
    data => {
      // Extract week ID from data.id if it matches the pattern ..._week_${weekId}
      if (data.id && data.id.includes('_week_')) {
        const match = data.id.match(/\_week\_([0-9a-f\-]+)/);
        if (match && match[1]) {
          console.log(match[1]);
          setWeekIdToCompare(match[1]);
        }
      }
    },
    [setWeekIdToCompare],
  );

  if (sortedData.length === 0) {
    return (
      <div className="flex items-center justify-center p-12 border rounded-md">
        <h2 className="text-2xl font-bold text-muted-foreground">
          No data available for week-to-week comparison
        </h2>
      </div>
    );
  }

  return (
    <div className="max-h-[65vh] overflow-y-auto">
      <DataTable<WeekToWeekTableRow, unknown>
        columns={columns}
        data={sortedData}
        onRowMouseEnter={handleRowMouseEnter}
        onCellMouseEnter={onCellMouseEnter}
      />
    </div>
  );
};

export default WeekToWeekDataTable;

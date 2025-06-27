import { useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button.tsx';
import * as React from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { useLabel } from '@/components/app/tournaments/TournamentMeta/useLabel.tsx';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { MetaInfo } from '@/components/app/tournaments/TournamentMeta/MetaInfoSelector.tsx';
import { WeekToWeekData } from '@/components/app/tournaments/pages/TournamentsPlanetaryQualifiers/WeekToWeek/useWeekToWeekData.ts';
import { PQTop } from '@/components/app/tournaments/pages/TournamentsPlanetaryQualifiers/pqLib.ts';
import { useWeekToWeekStoreActions } from '@/components/app/tournaments/pages/TournamentsPlanetaryQualifiers/WeekToWeek/useWeekToWeekStore.ts';

export type WeekToWeekDataTableSorting = { id: string; desc: boolean };

// Define the data structure for each row in the table
export interface WeekToWeekTableRow {
  deckKey: string;
  // Dynamic properties for each week will be added at runtime
  [key: string]: any;
}

// Helper function to render change values with appropriate styling
const renderChange = (value: number, isPercentage: boolean = true) => {
  if (value === 0) return <span className="text-muted-foreground">0{isPercentage ? '%' : ''}</span>;

  const formattedValue = isPercentage
    ? `${value > 0 ? '+' : ''}${value.toFixed(1)}%`
    : `${value > 0 ? '+' : ''}${value}`;

  return <span className={value > 0 ? 'text-green-500' : 'text-red-500'}>{formattedValue}</span>;
};

export const useWeekToWeekDataTableColumns = (
  data: WeekToWeekData,
  showCounts: boolean,
  sorting: WeekToWeekDataTableSorting,
  setSorting: React.Dispatch<React.SetStateAction<WeekToWeekDataTableSorting>>,
  metaInfo: MetaInfo,
  top: PQTop,
): ColumnDef<WeekToWeekTableRow>[] => {
  const labelRenderer = useLabel();
  const { setWeekIdToCompare, setDeckKey } = useWeekToWeekStoreActions();

  const handleSort = useCallback(
    (columnId: string) => {
      setSorting(prev => ({
        id: columnId,
        desc: prev.id === columnId ? !prev.desc : true,
      }));
    },
    [setSorting],
  );

  // Handle cell click to update the week and deck key in the store
  const handleCellClick = useCallback(
    (columnId: string, deckKey: string) => {
      // Extract the week ID from the column ID
      // Column IDs are in the format "week_${weekId}" or "week_${weekId}_change"
      let weekId: string | null = null;

      if (columnId.startsWith('week_')) {
        // Extract the weekId part
        const parts = columnId.split('_');
        if (parts.length >= 2) {
          // For "week_${weekId}", parts[1] is the weekId
          // For "week_${weekId}_change", parts[1] is still the weekId
          weekId = parts[1];
        }
      }

      // Update the store if we have a valid week ID
      if (weekId) {
        setWeekIdToCompare(weekId);
      }

      // Always update the deck key
      setDeckKey(deckKey);
    },
    [setWeekIdToCompare, setDeckKey],
  );

  const renderSortIcon = useCallback(
    (columnId: string) => {
      if (sorting.id !== columnId) return <div className="ml-1 size-4"></div>;
      return sorting.desc ? (
        <ArrowDown className="ml-1 h-4 w-4" />
      ) : (
        <ArrowUp className="ml-1 h-4 w-4" />
      );
    },
    [sorting],
  );

  const labelRendererType = ['leaders', 'leadersAndBase', 'bases'].includes(metaInfo)
    ? 'image-small'
    : 'compact';

  return useMemo(() => {
    // Start with the deck key column
    const columns: ColumnDef<WeekToWeekTableRow>[] = [
      {
        id: 'deckKey',
        accessorKey: 'deckKey',
        header: () => (
          <Button
            variant="ghost"
            className="p-0 font-bold flex items-center"
            onClick={() => handleSort('deckKey')}
          >
            {renderSortIcon('deckKey')}
          </Button>
        ),
        cell: ({ row }) => (
          <div className="cursor-pointer" onClick={() => setDeckKey(row.original.deckKey)}>
            {labelRenderer(row.original.deckKey, metaInfo, labelRendererType)}
          </div>
        ),
      },
    ];

    // Create a reversed copy of sortedWeeks for display purposes only
    const reversedWeeks = [...data.sortedWeeks].reverse();

    // Add columns for each week in reversed order
    reversedWeeks.forEach((weekId, reversedIndex) => {
      // Calculate the original index in sortedWeeks for change computation
      const index = data.sortedWeeks.length - 1 - reversedIndex;
      const weekNumber = data.weekMap[weekId]?.weekNumber || index + 1;
      const weekColumnId = `week_${weekId}`;
      const weekChangeColumnId = `week_${weekId}_change`;

      // Value column
      columns.push({
        id: weekColumnId,
        header: () => (
          <Button
            variant="ghost"
            className="p-0 w-full font-bold flex items-center justify-end text-right"
            onClick={() => handleSort(weekColumnId)}
          >
            {renderSortIcon(weekColumnId)}
            Wk {weekNumber}
          </Button>
        ),
        cell: ({ row }) => {
          const value = row.original[weekColumnId] || 0;
          return (
            <div
              className="font-medium text-right"
              onClick={() => handleCellClick(weekColumnId, row.original.deckKey)}
            >
              {showCounts ? value : `${value.toFixed(1)}%`}
            </div>
          );
        },
      });

      // Change column (only for weeks after the first one)
      if (index > 0) {
        columns.push({
          id: weekChangeColumnId,
          header: () => (
            <Button
              variant="ghost"
              className="p-0 font-bold flex items-center"
              onClick={() => handleSort(weekChangeColumnId)}
            >
              Δ{renderSortIcon(weekChangeColumnId)}
            </Button>
          ),
          cell: ({ row }) => {
            const change = row.original[weekChangeColumnId] || 0;
            return (
              <div
                className="cursor-pointer hover:bg-muted/50 p-1 rounded w-full h-full text-xs"
                onClick={() => handleCellClick(weekChangeColumnId, row.original.deckKey)}
              >
                {renderChange(change, !showCounts)}
              </div>
            );
          },
        });
      } else {
        // For the first week, add an empty change column for consistency
        columns.push({
          id: weekChangeColumnId,
          header: () => <span className="p-0 font-bold">Δ</span>,
          cell: ({ row }) => (
            <div
              className="cursor-pointer hover:bg-muted/50 p-1 rounded"
              onClick={() => handleCellClick(weekColumnId, row.original.deckKey)}
            >
              <span className="text-muted-foreground">-</span>
            </div>
          ),
        });
      }
    });

    return columns;
  }, [
    data.sortedWeeks,
    data.weekMap,
    showCounts,
    metaInfo,
    labelRenderer,
    labelRendererType,
    sorting,
    handleSort,
    renderSortIcon,
    top,
  ]);
};

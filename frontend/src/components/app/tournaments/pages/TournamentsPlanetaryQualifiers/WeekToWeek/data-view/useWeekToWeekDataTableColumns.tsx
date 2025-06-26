import { useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button.tsx';
import * as React from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { useLabel } from '@/components/app/tournaments/TournamentMeta/useLabel.tsx';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { MetaInfo } from '@/components/app/tournaments/TournamentMeta/MetaInfoSelector.tsx';
import { WeekToWeekData } from '@/components/app/tournaments/pages/TournamentsPlanetaryQualifiers/WeekToWeek/useWeekToWeekData.ts';
import { PQTop } from '@/components/app/tournaments/pages/TournamentsPlanetaryQualifiers/pqLib.ts';

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

  const handleSort = useCallback(
    (columnId: string) => {
      setSorting(prev => ({
        id: columnId,
        desc: prev.id === columnId ? !prev.desc : true,
      }));
    },
    [setSorting],
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
        cell: ({ row }) => labelRenderer(row.original.deckKey, metaInfo, labelRendererType),
      },
    ];

    // Add columns for each week
    data.sortedWeeks.forEach((weekId, index) => {
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
            <div className="font-medium text-right">
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
            return renderChange(change, !showCounts);
          },
        });
      } else {
        // For the first week, add an empty change column for consistency
        columns.push({
          id: weekChangeColumnId,
          header: () => <span className="p-0 font-bold">Δ</span>,
          cell: () => <span className="text-muted-foreground">-</span>,
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

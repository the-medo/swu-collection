import { useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button.tsx';
import * as React from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { useLabel } from '@/components/app/tournaments/TournamentMeta/useLabel.tsx';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { MetaInfo } from '@/components/app/tournaments/TournamentMeta/MetaInfoSelector.tsx';

export type SideStatWeekOverviewTableSorting = { id: string; desc: boolean };

interface TableDataItem {
  key: string;
  championCount: number;
  championPercentage: number;
  top8Count: number;
  top8Percentage: number;
  totalCount: number;
  totalPercentage: number;
}

export const useSideStatWeekOverviewTableColumns = (
  showCounts: boolean,
  sorting: SideStatWeekOverviewTableSorting,
  setSorting: React.Dispatch<React.SetStateAction<SideStatWeekOverviewTableSorting>>,
  metaInfo: MetaInfo,
): ColumnDef<TableDataItem>[] => {
  const labelRenderer = useLabel();

  const getColumnId = useCallback(
    (base: string) => (showCounts ? `${base}Count` : `${base}Percentage`),
    [showCounts],
  );

  const handleSort = useCallback((columnId: string) => {
    setSorting(prev => ({
      id: columnId,
      desc: prev.id === columnId ? !prev.desc : true,
    }));
  }, []);

  const renderSortIcon = useCallback(
    (columnId: string) => {
      if (sorting.id !== columnId) return null;
      return sorting.desc ? (
        <ArrowDown className="ml-1 h-4 w-4" />
      ) : (
        <ArrowUp className="ml-1 h-4 w-4" />
      );
    },
    [sorting],
  );

  const labelRendererType = ['leaders', 'leaderAndBase', 'bases'].includes(metaInfo)
    ? 'image-small'
    : 'compact';

  return useMemo(
    () => [
      {
        id: 'key',
        accessorKey: 'key',
        header: 'Label',
        cell: ({ row }) => labelRenderer(row.original.key, metaInfo, labelRendererType),
      },
      {
        id: getColumnId('champion'),
        header: () => (
          <Button
            variant="ghost"
            className="p-0 font-bold flex items-center"
            onClick={() => handleSort(getColumnId('champion'))}
          >
            Champ
            {renderSortIcon(getColumnId('champion'))}
          </Button>
        ),
        cell: ({ row }) => (
          <div className="font-bold">
            {showCounts
              ? row.original.championCount
              : `${row.original.championPercentage.toFixed(1)}%`}
          </div>
        ),
      },
      {
        id: getColumnId('top8'),
        header: () => (
          <Button
            variant="ghost"
            className="p-0 font-bold flex items-center"
            onClick={() => handleSort(getColumnId('top8'))}
          >
            Top 8{renderSortIcon(getColumnId('top8'))}
          </Button>
        ),
        cell: ({ row }) => (
          <div>
            {showCounts ? row.original.top8Count : `${row.original.top8Percentage.toFixed(1)}%`}
          </div>
        ),
      },
      {
        id: getColumnId('total'),
        header: () => (
          <Button
            variant="ghost"
            className="p-0 font-bold flex items-center"
            onClick={() => handleSort(getColumnId('total'))}
          >
            Total
            {renderSortIcon(getColumnId('total'))}
          </Button>
        ),
        cell: ({ row }) => (
          <div>
            {showCounts ? row.original.totalCount : `${row.original.totalPercentage.toFixed(1)}%`}
          </div>
        ),
      },
    ],
    [showCounts, labelRenderer, labelRendererType],
  );
};

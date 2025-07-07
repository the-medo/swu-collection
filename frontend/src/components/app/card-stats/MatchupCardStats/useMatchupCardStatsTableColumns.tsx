import * as React from 'react';
import { useMemo, useCallback } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button.tsx';
import { ArrowDown, ArrowUp } from 'lucide-react';

// Define the structure of the card stats data
export interface CardStat {
  total: number;
  gameWins: number;
  gameLosses: number;
  gameDraws: number;
  matchWins: number;
  matchLosses: number;
  matchDraws: number;
}

// Define the structure of the card stats by count
export type CardStatsByCount = Record<string, CardStat>;

// Define the structure of the card stats by board
export type CardStatsByBoard = Record<string, CardStatsByCount>;

// Define the structure of the card stats data
export interface CardStats {
  [cardId: string]: CardStatsByBoard;
}

// Define the structure of the API response
export interface MatchupCardStatsData {
  overviewId: string;
  tournamentCount: number;
  deckCount: number;
  matchCount: number;
  cardStats: CardStats;
}

// Define the structure of a table row
export interface MatchupCardStatsTableRow {
  cardId: string;
  cardName?: string;
  [key: string]: any;
}

export type MatchupCardStatsTableSorting = { id: string; desc: boolean };

export const useMatchupCardStatsTableColumns = (
  data: MatchupCardStatsData,
  selectedView: string,
  sorting: MatchupCardStatsTableSorting,
  setSorting: React.Dispatch<React.SetStateAction<MatchupCardStatsTableSorting>>,
): ColumnDef<MatchupCardStatsTableRow>[] => {
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

  return useMemo(() => {
    const cols: ColumnDef<MatchupCardStatsTableRow>[] = [
      {
        accessorKey: 'cardName',
        header: () => (
          <Button
            variant="ghost"
            className="p-0 font-bold flex items-center"
            onClick={() => handleSort('cardName')}
          >
            Card {renderSortIcon('cardName')}
          </Button>
        ),
        cell: ({ row }) => <div>{row.getValue('cardName') || row.getValue('cardId')}</div>,
      },
    ];

    const allColumns = new Set<string>();
    Object.keys(data.cardStats).forEach(cardId => {
      Object.keys(data.cardStats[cardId][selectedView]).forEach(count => {
        allColumns.add(count);
      });
    });

    const allColumnsArray = Array.from(allColumns).sort((a, b) => b.localeCompare(a));

    allColumnsArray.forEach(column => {
      const columnId = `winRate_${column}`;
      cols.push({
        accessorKey: columnId,
        header: () => (
          <Button
            variant="ghost"
            className="p-0 w-full font-bold flex items-center justify-end text-right"
            onClick={() => handleSort(columnId)}
          >
            {renderSortIcon(columnId)}
            {column}
          </Button>
        ),
        cell: ({ row }) => {
          const value = row.getValue(columnId) as number;
          const total = row.original[`total_${column}`];

          if (isNaN(value) || total === 0) {
            return <div className="text-right text-muted-foreground">N/A</div>;
          }

          return (
            <div className="text-right font-medium">
              {value.toFixed(2)}%
              <span className="text-xs text-muted-foreground ml-2">({total})</span>
            </div>
          );
        },
      });
    });

    return cols;
  }, [data, selectedView, sorting, handleSort, renderSortIcon]);
};

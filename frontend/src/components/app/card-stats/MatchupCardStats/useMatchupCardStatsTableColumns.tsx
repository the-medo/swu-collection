import * as React from 'react';
import { useMemo, useCallback } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button.tsx';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { MatchupDisplayMode } from '@/components/app/tournaments/TournamentMatchups/types';
import { getWinrateColorClass } from '@/components/app/tournaments/TournamentMatchups/utils/getWinrateColorClass';
import { cn } from '@/lib/utils';

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
  displayMode: MatchupDisplayMode = 'winrate',
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
        size: 80,
        header: () => (
          <Button
            variant="ghost"
            className="p-0 font-bold flex items-center"
            onClick={() => handleSort('cardName')}
          >
            Card {renderSortIcon('cardName')}
          </Button>
        ),
        cell: ({ row }) => (
          <div className="px-2">{row.getValue('cardName') || row.getValue('cardId')}</div>
        ),
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
        size: 32,
        cell: ({ row }) => {
          const total = row.original[`total_${column}`];
          const cardId = row.original.cardId;
          const stats = data.cardStats[cardId]?.[selectedView]?.[column];

          if (!stats || total === 0) {
            return <div className="text-right text-muted-foreground p-1 px-2">-</div>;
          }
          const totalMatches = stats.matchWins + stats.matchLosses + stats.matchDraws;
          const totalGames = stats.gameWins + stats.gameLosses + stats.gameDraws;
          const winRateMatches = totalMatches > 0 ? (stats.matchWins / totalMatches) * 100 : 0;
          const winRateGames = totalGames > 0 ? (stats.gameWins / totalGames) * 100 : 0;

          switch (displayMode) {
            case 'winLoss': {
              const colorClass = getWinrateColorClass(winRateMatches);
              return (
                <div className={cn('text-right font-medium p-1', colorClass)}>
                  {stats.matchWins}/{stats.matchLosses}
                  <span className="text-xs text-muted-foreground ml-2">({totalMatches})</span>
                </div>
              );
            }
            case 'gameWinLoss': {
              const colorClass = getWinrateColorClass(winRateGames);
              return (
                <div className={cn('text-right font-medium p-1', colorClass)}>
                  {stats.gameWins}/{stats.gameLosses}
                  <span className="text-xs text-muted-foreground ml-2">({totalGames})</span>
                </div>
              );
            }
            case 'gameWinrate': {
              const colorClass = getWinrateColorClass(winRateGames);
              return (
                <div className={cn('text-right font-medium p-1', colorClass)}>
                  {winRateMatches.toFixed(2)}%
                  <span className="text-xs text-muted-foreground ml-2">({totalGames})</span>
                </div>
              );
            }
            case 'winrate':
            default: {
              const colorClass = getWinrateColorClass(winRateMatches);
              return (
                <div className={cn('text-right font-medium h-full w-full p-1', colorClass)}>
                  {winRateMatches.toFixed(2)}%
                  <span className="text-xs text-muted-foreground ml-2">({totalMatches})</span>
                </div>
              );
            }
          }
        },
      });
    });

    return cols;
  }, [data, selectedView, sorting, handleSort, renderSortIcon, displayMode]);
};

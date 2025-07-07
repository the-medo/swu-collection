import * as React from 'react';
import { useMemo, useState, useCallback } from 'react';
import { DataTable } from '@/components/ui/data-table.tsx';
import { CardMatchupView } from './CardMatchupViewSelector';
import {
  MatchupCardStatsData,
  MatchupCardStatsTableRow,
  MatchupCardStatsTableSorting,
  useMatchupCardStatsTableColumns,
} from './useMatchupCardStatsTableColumns';
import { useCardList } from '@/api/lists/useCardList.ts';
import { useMatchupCardStatsStoreActions } from './useMatchupCardStatsStore';

interface MatchupCardStatsTableProps {
  data: MatchupCardStatsData;
  selectedView: CardMatchupView;
}

const MatchupCardStatsTable: React.FC<MatchupCardStatsTableProps> = ({ data, selectedView }) => {
  const { data: cardList } = useCardList();
  const { setSelectedCardId } = useMatchupCardStatsStoreActions();

  // State for sorting
  const [sorting, setSorting] = useState<MatchupCardStatsTableSorting>({
    id: 'cardName',
    desc: false,
  });

  // Handle row click to set the selected card ID
  const handleRowClick = useCallback(
    row => {
      setSelectedCardId(row.original.cardId);
    },
    [setSelectedCardId],
  );

  // Get columns from the hook
  const columns = useMatchupCardStatsTableColumns(data, selectedView, sorting, setSorting);

  // Transform the data for the table
  const tableData = useMemo<MatchupCardStatsTableRow[]>(() => {
    const rows: MatchupCardStatsTableRow[] = [];

    Object.entries(data.cardStats).forEach(([cardId, boardStats]) => {
      const row: MatchupCardStatsTableRow = {
        cardId,
        cardName: cardList?.cards[cardId]?.name ?? cardId,
      };

      let hasNonZeroCount = false;

      if (boardStats[selectedView]) {
        Object.entries(boardStats[selectedView]).forEach(([count, stats]) => {
          // Calculate win rate
          const totalGames = stats.gameWins + stats.gameLosses + stats.gameDraws;
          const winRate = totalGames > 0 ? (stats.gameWins / totalGames) * 100 : 0;

          row[`winRate_${count}`] = winRate;
          row[`total_${count}`] = stats.total;

          // Check if this card has any non-zero counts
          if (stats.total > 0) {
            hasNonZeroCount = true;
          }
        });
      }

      // Only add rows with at least one non-zero count
      if (hasNonZeroCount) {
        rows.push(row);
      }
    });

    // Sort the rows based on the current sorting
    return [...rows].sort((a, b) => {
      const multiplier = sorting.desc ? -1 : 1;

      if (sorting.id === 'cardId' || sorting.id === 'cardName') {
        // Make sure we have valid strings to compare
        const aName = a.cardName || a.cardId || '';
        const bName = b.cardName || b.cardId || '';
        return aName.localeCompare(bName) * multiplier;
      }

      // For numeric columns, ensure we have numbers to compare
      const aValue = a[sorting.id] !== undefined ? a[sorting.id] : 0;
      const bValue = b[sorting.id] !== undefined ? b[sorting.id] : 0;

      return (aValue - bValue) * multiplier;
    });
  }, [data, cardList, selectedView, sorting]);

  if (tableData.length === 0) {
    return (
      <div className="flex items-center justify-center p-12 border rounded-md">
        <h2 className="text-2xl font-bold text-muted-foreground">
          No data available for card matchup statistics
        </h2>
      </div>
    );
  }

  return (
    <div className="max-h-[calc(100vh-100px)] overflow-y-auto">
      <DataTable<MatchupCardStatsTableRow, unknown>
        columns={columns}
        data={tableData}
        onRowClick={handleRowClick}
      />
    </div>
  );
};

export default MatchupCardStatsTable;

import {
  MatchupDisplayMode,
  MatchupTotalData,
} from '@/components/app/tournaments/TournamentMatchups/types.ts';
import React, { useMemo } from 'react';
import { cn } from '@/lib/utils.ts';
import { getWinrateColorClass } from '@/components/app/tournaments/TournamentMatchups/utils/getWinrateColorClass.ts';

const RowTotalCell = React.memo(
  ({
    rowKey,
    totalStats,
    displayMode,
  }: {
    rowKey: string;
    totalStats?: Map<string, MatchupTotalData>;
    displayMode: MatchupDisplayMode;
  }) => {
    // Memoize the row's data calculation
    const rowData = useMemo(() => {
      const stats = totalStats?.get(rowKey);
      if (!stats)
        return {
          className: cn('p-2 border text-center w-[70px] text-xs font-semibold'),
          content: '-',
        };

      // Calculate data for display
      let displayWins, displayLosses, total;
      const { totalWins, totalLosses, totalGameWins, totalGameLosses } = stats;

      if (displayMode === 'winLoss' || displayMode === 'winrate') {
        displayWins = totalWins;
        displayLosses = totalLosses;
        total = totalWins + totalLosses;

        if (total === 0)
          return {
            className: cn('p-2 border text-center w-[70px] text-xs font-semibold'),
            content: '-',
          };

        const winrate = (totalWins / total) * 100;
        const colorClass = getWinrateColorClass(winrate);

        return {
          className: cn('p-2 border text-center w-[70px] text-xs font-semibold', colorClass),
          content:
            displayMode === 'winLoss'
              ? `${Math.round(totalWins)}/${Math.round(totalLosses)}`
              : `${winrate.toFixed(1)}%`,
        };
      } else {
        // Game stats
        displayWins = totalGameWins;
        displayLosses = totalGameLosses;
        total = totalGameWins + totalGameLosses;

        if (total === 0)
          return {
            className: cn('p-2 border text-center w-[70px] text-xs font-semibold'),
            content: '-',
          };

        const gameWinrate = (totalGameWins / total) * 100;
        const colorClass = getWinrateColorClass(gameWinrate);

        return {
          className: cn('p-2 border text-center w-[70px] text-xs font-semibold', colorClass),
          content:
            displayMode === 'gameWinLoss'
              ? `${Math.round(totalGameWins)}/${Math.round(totalGameLosses)}`
              : `${gameWinrate.toFixed(1)}%`,
        };
      }
    }, [rowKey, totalStats, displayMode]);

    return <td className={rowData.className}>{rowData.content}</td>;
  },
);

export default RowTotalCell;

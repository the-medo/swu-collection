import {
  MatchupDataMap,
  MatchupDisplayMode,
} from '@/components/app/tournaments/TournamentMatchups/types.ts';
import React, { useMemo } from 'react';
import { cn } from '@/lib/utils.ts';
import { getWinrateColorClass } from '@/components/app/tournaments/TournamentMatchups/utils/getWinrateColorClass.ts';

const baseClassName = 'p-2 border text-center w-[70px] text-xs font-semibold';

const RowTotalCell = React.memo(
  ({
    rowKey,
    colKeys,
    matchups,
    displayMode,
  }: {
    rowKey: string;
    colKeys: string[];
    matchups: MatchupDataMap;
    displayMode: MatchupDisplayMode;
  }) => {
    // Memoize the row's data calculation
    const rowData = useMemo(() => {
      const rowMatchups = matchups[rowKey];
      if (!rowMatchups) {
        return { className: cn(baseClassName), content: '-' };
      }

      const stats = colKeys.reduce(
        (totals, colKey) => {
          if (colKey === rowKey) return totals;

          const matchup = rowMatchups[colKey];
          if (!matchup) return totals;

          totals.totalWins += matchup.wins;
          totals.totalLosses += matchup.losses;
          totals.totalGameWins += matchup.gameWins;
          totals.totalGameLosses += matchup.gameLosses;

          return totals;
        },
        { totalWins: 0, totalLosses: 0, totalGameWins: 0, totalGameLosses: 0 },
      );

      const isMatchMode = displayMode === 'winLoss' || displayMode === 'winrate';
      const displayWins = isMatchMode ? stats.totalWins : stats.totalGameWins;
      const displayLosses = isMatchMode ? stats.totalLosses : stats.totalGameLosses;
      const total = displayWins + displayLosses;

      if (total === 0) {
        return { className: cn(baseClassName), content: '-' };
      }

      const winrate = (displayWins / total) * 100;
      const colorClass = getWinrateColorClass(winrate);

      return {
        className: cn(baseClassName, colorClass),
        content:
          displayMode === 'winLoss' || displayMode === 'gameWinLoss'
            ? `${Math.round(displayWins)}/${Math.round(displayLosses)}`
            : `${winrate.toFixed(1)}%`,
      };
    }, [colKeys, displayMode, matchups, rowKey]);

    return <td className={rowData.className}>{rowData.content}</td>;
  },
);

export default RowTotalCell;

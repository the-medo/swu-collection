import * as React from 'react';
import { CardStatTableRow as CardStatTableRowType } from '../cardStatLib.ts';
import { getWinrateColorClass } from '../../../../tournaments/TournamentMatchups/utils/getWinrateColorClass.ts';
import { StatsTableCell } from './CardStatsTableHeader.tsx';

interface CardStatsTableRowProps {
  row: CardStatTableRowType;
}

const CardStatsTableRow: React.FC<CardStatsTableRowProps> = ({ row }) => {
  const renderMetricCells = (total: number, wins: number, winrate: number) => (
    <>
      <StatsTableCell>{total}</StatsTableCell>
      <StatsTableCell>{wins}</StatsTableCell>
      <StatsTableCell className={getWinrateColorClass(winrate)} thickRightBorder>
        {winrate.toFixed(1)}%
      </StatsTableCell>
    </>
  );

  return (
    <tr className="hover:bg-slate-50 dark:hover:bg-slate-900 border-b border-slate-200 dark:border-slate-800 hover:brightness-90">
      <td className="px-4 py-2 font-medium sticky left-0 bg-white dark:bg-slate-950 border-x border-slate-200 dark:border-slate-800 border-r-2 border-r-slate-400 dark:border-r-slate-600">
        {row.cardId}
      </td>
      {renderMetricCells(row.included, row.includedInWins, row.includedWinrate)}
      {renderMetricCells(row.drawn, row.drawnInWins, row.drawnWinrate)}
      {renderMetricCells(row.played, row.playedInWins, row.playedWinrate)}
      {renderMetricCells(row.activated, row.activatedInWins, row.activatedWinrate)}
      {renderMetricCells(row.resourced, row.resourcedInWins, row.resourcedWinrate)}
      {renderMetricCells(row.discarded, row.discardedInWins, row.discardedWinrate)}
    </tr>
  );
};

export default CardStatsTableRow;

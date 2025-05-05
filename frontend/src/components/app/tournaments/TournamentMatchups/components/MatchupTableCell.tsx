import * as React from 'react';
import { MatchupDataMap, MatchupDisplayMode } from '../types';
import { getWinrateColorClass } from '../utils/getWinrateColorClass';
import { cn } from '@/lib/utils.ts';
import { useCallback } from 'react';

export interface MatchupTableCellProps {
  rowKey: string;
  colKey: string;
  matchups: MatchupDataMap;
  displayMode: MatchupDisplayMode;
  setHoveredCol: React.Dispatch<React.SetStateAction<number | null>>;
  columnIndex: number;
}

export const MatchupTableCell: React.FC<MatchupTableCellProps> = ({
  rowKey,
  colKey,
  matchups,
  displayMode,
  setHoveredCol,
  columnIndex,
}) => {
  const wins = matchups[rowKey]?.[colKey]?.wins || 0;
  const losses = matchups[rowKey]?.[colKey]?.losses || 0;
  const gameWins = matchups[rowKey]?.[colKey]?.gameWins || 0;
  const gameLosses = matchups[rowKey]?.[colKey]?.gameLosses || 0;

  // Determine which stats to use based on display mode
  let displayWins, displayLosses, total;

  if (displayMode === 'winLoss' || displayMode === 'winrate') {
    displayWins = wins;
    displayLosses = losses;
    total = wins + losses;
  } else {
    displayWins = gameWins;
    displayLosses = gameLosses;
    total = gameWins + gameLosses;
  }

  const onMouseEnter = useCallback(() => {
    setHoveredCol(columnIndex);
  }, [columnIndex]);

  // If there's no data, show a dash
  if (total === 0 || rowKey === colKey) {
    return (
      <td
        className={cn('p-2 border text-center w-[50px] text-xs')}
        onMouseEnter={onMouseEnter}
        data-column-index={columnIndex}
      >
        -
      </td>
    );
  }

  const winrate = (displayWins / total) * 100;
  const colorClass = getWinrateColorClass(winrate);

  return (
    <td
      className={cn('p-2 border text-center w-[50px] text-xs', colorClass)}
      onMouseEnter={onMouseEnter}
      data-column-index={columnIndex}
    >
      {displayMode === 'winLoss' || displayMode === 'gameWinLoss' ? (
        <>
          {Math.round(displayWins)}/{Math.round(displayLosses)}
        </>
      ) : (
        `${winrate.toFixed(1)}%`
      )}
    </td>
  );
};

export default MatchupTableCell;

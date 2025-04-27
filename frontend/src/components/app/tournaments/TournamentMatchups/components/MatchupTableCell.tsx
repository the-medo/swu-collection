import * as React from 'react';
import { MatchupData, MatchupDisplayMode } from '../types';
import { getWinrateColorClass } from '../utils/getWinrateColorClass';
import { cn } from '@/lib/utils.ts';

export interface MatchupTableCellProps {
  rowKey: string;
  colKey: string;
  matchups: MatchupData;
  displayMode: MatchupDisplayMode;
  isHovered: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

export const MatchupTableCell: React.FC<MatchupTableCellProps> = ({
  rowKey,
  colKey,
  matchups,
  displayMode,
  isHovered,
  onMouseEnter,
  onMouseLeave,
}) => {
  // If it's a mirror match, just show a dash
  if (rowKey === colKey) {
    return <td className="p-2 border text-center w-[50px] text-xs">-</td>;
  }

  const wins = matchups[rowKey]?.[colKey]?.wins || 0;
  const losses = matchups[rowKey]?.[colKey]?.losses || 0;
  const total = wins + losses;

  // If there's no data, show a dash
  if (total === 0) {
    return <td className="p-2 border text-center w-[50px] text-xs">-</td>;
  }

  const winrate = (wins / total) * 100;
  const colorClass = getWinrateColorClass(winrate);

  return (
    <td
      className={cn(
        'p-2 border text-center w-[50px] text-xs',
        colorClass,
        isHovered && 'opacity-90',
      )}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {displayMode === 'winLoss' ? (
        <>
          {Math.round(wins)}/{Math.round(losses)}
        </>
      ) : (
        `${winrate.toFixed(1)}%`
      )}
    </td>
  );
};

export default MatchupTableCell;

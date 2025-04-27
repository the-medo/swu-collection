import * as React from 'react';
import { useState } from 'react';
import { MatchupData, MatchupDisplayMode } from '../types';
import { MatchupTableCell } from './MatchupTableCell';
import { getWinrateColorClass } from '../utils/getWinrateColorClass';
import { cn } from '@/lib/utils.ts';
import { MetaInfo } from '@/components/app/tournaments/TournamentMeta/MetaInfoSelector.tsx';
import { useLabel } from '@/components/app/tournaments/TournamentMeta/useLabel.tsx';

export interface MatchupTableProps {
  matchupData: {
    keys: string[];
    matchups: MatchupData;
    totalStats?: Map<string, { totalWins: number; totalLosses: number }>;
  };
  displayMode: MatchupDisplayMode;
  metaInfo: MetaInfo;
  labelRenderer: ReturnType<typeof useLabel>;
}

export const MatchupTable: React.FC<MatchupTableProps> = ({
  matchupData,
  displayMode,
  metaInfo,
  labelRenderer,
}) => {
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [hoveredCol, setHoveredCol] = useState<string | null>(null);

  return (
    <div className="overflow-x-auto">
      <table className="border-collapse">
        <thead>
          <tr>
            <td className="p-2 border text-center font-semibold align-bottom min-w-[80px]">
              Total
            </td>
            <td className="p-2 border"></td>
            {matchupData.keys.map(key => (
              <td
                key={key}
                className={cn(
                  'p-2 border w-[40px] max-w-[40px]',
                  hoveredCol === key && 'opacity-90 bg-accent',
                )}
              >
                <div className="transform -rotate-90 origin-bottom-left whitespace-nowrap h-[250px] flex items-end translate-x-1/2 ml-[20px] transform-gpu">
                  {labelRenderer(key, metaInfo, 'compact')}
                </div>
              </td>
            ))}
          </tr>
        </thead>
        <tbody>
          {matchupData.keys.map(rowKey => (
            <tr
              key={rowKey}
              className={cn('h-[20px] text-sm', hoveredRow === rowKey && 'bg-accent')}
            >
              <td
                className={(() => {
                  const stats = matchupData.totalStats?.get(rowKey);
                  if (!stats)
                    return cn(
                      'p-2 border text-center w-[70px] text-xs font-semibold',
                      hoveredRow === rowKey && 'bg-accent',
                    );
                  const { totalWins, totalLosses } = stats;
                  const total = totalWins + totalLosses;

                  if (total === 0)
                    return cn(
                      'p-2 border text-center w-[70px] text-xs font-semibold',
                      hoveredRow === rowKey && 'bg-accent',
                    );

                  // Calculate winrate and color class
                  const winrate = (totalWins / total) * 100;
                  const colorClass = getWinrateColorClass(winrate);

                  return cn(
                    'p-2 border text-center w-[70px] text-xs font-semibold',
                    colorClass,
                    hoveredRow === rowKey && 'bg-accent',
                  );
                })()}
              >
                {(() => {
                  const stats = matchupData.totalStats?.get(rowKey);
                  if (!stats) return '-';
                  const { totalWins, totalLosses } = stats;
                  const total = totalWins + totalLosses;

                  if (total === 0) return '-';

                  const winrate = (totalWins / total) * 100;
                  return displayMode === 'winLoss'
                    ? `${Math.round(totalWins)}/${Math.round(totalLosses)}`
                    : `${winrate.toFixed(1)}%`;
                })()}
              </td>
              <td
                className={cn(
                  'p-1 border w-[250px] min-w-[250px]',
                  hoveredRow === rowKey && 'bg-accent font-semibold',
                )}
              >
                {labelRenderer(rowKey, metaInfo, 'compact')}
              </td>
              {matchupData.keys.map(colKey => (
                <MatchupTableCell
                  key={colKey}
                  rowKey={rowKey}
                  colKey={colKey}
                  matchups={matchupData.matchups}
                  displayMode={displayMode}
                  isHovered={(hoveredRow === rowKey || hoveredCol === colKey) && rowKey !== colKey}
                  onMouseEnter={() => {
                    setHoveredRow(rowKey);
                    setHoveredCol(colKey);
                  }}
                  onMouseLeave={() => {
                    setHoveredRow(null);
                    setHoveredCol(null);
                  }}
                />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default MatchupTable;

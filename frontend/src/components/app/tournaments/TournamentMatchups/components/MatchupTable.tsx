import * as React from 'react';
import { useCallback, useMemo, useState } from 'react';
import { MatchupDataMap, MatchupDisplayMode, MatchupTotalData } from '../types';
import { MatchupTableCell } from './MatchupTableCell';
import { getWinrateColorClass } from '../utils/getWinrateColorClass';
import { cn } from '@/lib/utils.ts';
import { MetaInfo } from '@/components/app/tournaments/TournamentMeta/MetaInfoSelector.tsx';
import { useLabel } from '@/components/app/tournaments/TournamentMeta/useLabel.tsx';
import { useTournamentMetaActions } from '@/components/app/tournaments/TournamentMeta/useTournamentMetaStore.ts';
import { labelWidthBasedOnMetaInfo } from '@/components/app/tournaments/TournamentMeta/tournamentMetaLib.ts';

export interface MatchupTableProps {
  matchupData: {
    keys: string[];
    matchups: MatchupDataMap;
    totalStats?: Map<string, MatchupTotalData>;
  };
  displayMode: MatchupDisplayMode;
  metaInfo: MetaInfo;
  labelRenderer: ReturnType<typeof useLabel>;
  totalMatchesAnalyzed: number;
}

export const MatchupTable: React.FC<MatchupTableProps> = ({
  matchupData,
  displayMode,
  metaInfo,
  labelRenderer,
  totalMatchesAnalyzed,
}) => {
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [hoveredCol, setHoveredCol] = useState<string | null>(null);

  const { setTournamentDeckKey } = useTournamentMetaActions();

  const onRowClick = useCallback(
    (key: string) => {
      setTournamentDeckKey({
        key,
        metaInfo,
      });
    },
    [metaInfo],
  );

  const labelWidth = useMemo(
    () => ({
      width: `${labelWidthBasedOnMetaInfo[metaInfo]}px`,
      minWidth: `${labelWidthBasedOnMetaInfo[metaInfo]}px`,
    }),
    [metaInfo],
  );

  const labelHeight = useMemo(
    () => ({
      height: `${labelWidthBasedOnMetaInfo[metaInfo]}px`,
    }),
    [metaInfo],
  );

  return (
    <div className="overflow-x-auto">
      <table className="border-collapse">
        <thead>
          <tr>
            <td className="p-2 border text-center font-semibold align-bottom min-w-[80px]">
              <div>Total</div>
              <span className="text-[10px] font-semibold mb-4">{totalMatchesAnalyzed} mtch</span>
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
                <div
                  className="transform text-[13px] -rotate-90 origin-bottom-left whitespace-nowrap flex items-end translate-x-1/2 ml-[20px] transform-gpu"
                  style={labelHeight}
                >
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

                  // Determine which stats to use based on display mode
                  let displayWins, displayLosses, total;

                  if (displayMode === 'winLoss' || displayMode === 'winrate') {
                    displayWins = stats.totalWins;
                    displayLosses = stats.totalLosses;
                  } else {
                    displayWins = stats.totalGameWins;
                    displayLosses = stats.totalGameLosses;
                  }

                  total = displayWins + displayLosses;

                  if (total === 0)
                    return cn(
                      'p-2 border text-center w-[70px] text-xs font-semibold',
                      hoveredRow === rowKey && 'bg-accent',
                    );

                  // Calculate winrate and color class
                  const winrate = (displayWins / total) * 100;
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
                  const { totalWins, totalLosses, totalGameWins, totalGameLosses } = stats;

                  if (displayMode === 'winLoss' || displayMode === 'winrate') {
                    const total = totalWins + totalLosses;
                    if (total === 0) return '-';

                    const winrate = (totalWins / total) * 100;
                    return displayMode === 'winLoss'
                      ? `${Math.round(totalWins)}/${Math.round(totalLosses)}`
                      : `${winrate.toFixed(1)}%`;
                  } else {
                    const totalGames = totalGameWins + totalGameLosses;
                    if (totalGames === 0) return '-';

                    const gameWinrate = (totalGameWins / totalGames) * 100;
                    return displayMode === 'gameWinLoss'
                      ? `${Math.round(totalGameWins)}/${Math.round(totalGameLosses)}`
                      : `${gameWinrate.toFixed(1)}%`;
                  }
                })()}
              </td>
              <td
                className={cn(
                  'p-1 border cursor-pointer text-[13px]',
                  hoveredRow === rowKey && 'bg-accent font-semibold',
                )}
                onClick={() => onRowClick(rowKey)}
                style={labelWidth}
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

import * as React from 'react';
import { useCallback, useMemo } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';

import { MatchResult } from '@/components/app/statistics/lib/MatchResult.ts';
import { useAnalyzeMatchups } from '@/components/app/statistics/lib/useAnalyzeMatchups.ts';
import SingleMatchupRow from '@/components/app/statistics/components/SubpageMatchups/SingleMatchupRow.tsx';
import {
  MatchupSort,
  sortMatchups,
} from '@/components/app/statistics/components/SubpageMatchups/matchupLib.ts';
import { ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils.ts';
import DebouncedInput from '@/components/app/global/DebouncedInput/DebouncedInput.tsx';

interface SubpageMatchupsProps {
  matches: MatchResult[];
  matrixKey: string;
}

const SubpageMatchups: React.FC<SubpageMatchupsProps> = ({ matches, matrixKey }) => {
  const navigate = useNavigate();
  const {
    sMatchupSort = MatchupSort.matchesTotal,
    sMinMatches,
    sMinGames,
  } = useSearch({ strict: false });

  const { matchups: matrix } = useAnalyzeMatchups(matches);
  const matchups = matrix[matrixKey] || {};

  const onSortChange = useCallback((sort: MatchupSort) => {
    navigate({
      to: '.',
      search: prev => ({ ...prev, sMatchupSort: sort }),
    });
  }, []);

  const onMinMatchesChange = useCallback((val: number | undefined) => {
    navigate({
      to: '.',
      search: prev => ({ ...prev, sMinMatches: val }),
    });
  }, []);

  const onMinGamesChange = useCallback((val: number | undefined) => {
    navigate({
      to: '.',
      search: prev => ({ ...prev, sMinGames: val }),
    });
  }, []);

  const finalMatchups = useMemo(() => {
    let filtered = Object.entries(matchups);

    console.log({ matchups });

    if (sMinMatches) {
      filtered = filtered.filter(([, result]) => result.total >= sMinMatches);
    }

    if (sMinGames) {
      filtered = filtered.filter(([, result]) => result.gameTotal >= sMinGames);
    }

    return sortMatchups(filtered, sMatchupSort);
  }, [matchups, sMatchupSort, sMinMatches, sMinGames]);

  const SortHeader: React.FC<{
    label: string;
    sortKey: MatchupSort;
    className?: string;
  }> = ({ label, sortKey, className }) => {
    const isActive = sMatchupSort === sortKey;
    return (
      <span
        className={cn(
          'cursor-pointer hover:text-foreground transition-colors flex items-center gap-1',
          isActive && 'text-foreground font-bold',
          className,
        )}
        onClick={() => onSortChange(sortKey)}
      >
        {label}
        {isActive && <ArrowDown className="w-3 h-3" />}
      </span>
    );
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b text-muted-foreground text-xs uppercase tracking-wider">
            <th className="py-3 px-4 font-semibold w-[200px]">Opponent</th>
            <th className="py-3 px-4 font-semibold"></th>
            <th className="py-3 px-4 font-semibold">
              <div className=" flex flex-col gap-2">
                <div className=" flex gap-2 items-center">
                  <span>Matches</span>
                  <span className="pl-10 flex">Min:</span>{' '}
                  <DebouncedInput
                    type="number"
                    className="w-18 h-6"
                    value={sMinMatches}
                    onChange={onMinMatchesChange}
                  />
                </div>
                <div className=" flex gap-2 items-center">
                  <SortHeader
                    label="Count"
                    sortKey={MatchupSort.matchesTotal}
                    className="underline"
                  />
                  <SortHeader
                    label="WR%"
                    sortKey={MatchupSort.matchesWinrate}
                    className="pl-10 underline"
                  />
                </div>
              </div>
            </th>
            <th className="py-3 px-4 font-semibold">
              <div className=" flex gap-2 items-center">
                <span>Games</span>
                <span className="pl-10 flex">Min:</span>{' '}
                <DebouncedInput
                  type="number"
                  className="w-18 h-6"
                  value={sMinGames}
                  onChange={onMinGamesChange}
                />
              </div>
              <div className=" flex gap-2 items-center">
                <SortHeader label="Count" sortKey={MatchupSort.gamesTotal} className="underline" />
                <SortHeader
                  label="WR%"
                  sortKey={MatchupSort.gamesWinrate}
                  className="pl-10 underline"
                />
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          {finalMatchups.length > 0 ? (
            finalMatchups.map(([opponentKey, result]) => (
              <SingleMatchupRow key={opponentKey} opponentDeckKey={opponentKey} result={result} />
            ))
          ) : (
            <tr>
              <td colSpan={4} className="py-8 text-center text-muted-foreground">
                No matchup data available
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default SubpageMatchups;

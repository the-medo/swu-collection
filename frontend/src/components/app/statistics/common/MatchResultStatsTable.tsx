import * as React from 'react';
import { useMemo } from 'react';
import { MatchResult } from '@/components/app/statistics/lib/MatchResult.ts';
import { getWRColor } from '@/components/app/statistics/common/statsUtils.ts';
import { cn } from '@/lib/utils.ts';

interface MatchResultStatsTableProps {
  matches: MatchResult[];
  keyFunction: (match: MatchResult) => string | null | undefined;
  labelFunction: (key: string) => React.ReactNode;
  emptyMessage?: string;
}

type MatchResultStatsTableRow = {
  key: string;
  totalMatches: number;
  matchWins: number;
  matchLosses: number;
  matchDraws: number;
  matchWinrate: number;
  totalGames: number;
  gameWins: number;
  gameLosses: number;
  gameWinrate: number;
};

const headerCellClass =
  'px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800';
const headerGroupClass =
  'px-4 py-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800';
const tableCellClass = 'px-4 py-2 border-x border-slate-200 dark:border-slate-800';
const numericCellClass = `${tableCellClass} text-right`;

const getGameRecord = (match: MatchResult) => {
  if (match.finalWins !== undefined || match.finalLosses !== undefined) {
    return {
      wins: match.finalWins ?? 0,
      losses: match.finalLosses ?? 0,
    };
  }

  let wins = 0;
  let losses = 0;

  match.games.forEach(game => {
    if (game.isWinner === true) wins++;
    else if (game.isWinner === false) losses++;
  });

  return { wins, losses };
};

const MatchResultStatsTable: React.FC<MatchResultStatsTableProps> = ({
  matches,
  keyFunction,
  labelFunction,
  emptyMessage = 'No grouped match data available.',
}) => {
  const rows = useMemo<MatchResultStatsTableRow[]>(() => {
    const groups = new Map<
      string,
      {
        totalMatches: number;
        matchWins: number;
        matchLosses: number;
        matchDraws: number;
        gameWins: number;
        gameLosses: number;
      }
    >();

    matches.forEach(match => {
      const key = keyFunction(match);
      if (!key) return;

      if (!groups.has(key)) {
        groups.set(key, {
          totalMatches: 0,
          matchWins: 0,
          matchLosses: 0,
          matchDraws: 0,
          gameWins: 0,
          gameLosses: 0,
        });
      }

      const entry = groups.get(key);
      if (!entry) return;

      entry.totalMatches++;

      if (match.result === 3) entry.matchWins++;
      else if (match.result === 0) entry.matchLosses++;
      else if (match.result === 1) entry.matchDraws++;

      const { wins, losses } = getGameRecord(match);
      entry.gameWins += wins;
      entry.gameLosses += losses;
    });

    return Array.from(groups.entries())
      .map(([key, value]) => {
        const totalGames = value.gameWins + value.gameLosses;

        return {
          key,
          totalMatches: value.totalMatches,
          matchWins: value.matchWins,
          matchLosses: value.matchLosses,
          matchDraws: value.matchDraws,
          matchWinrate: value.totalMatches > 0 ? (value.matchWins / value.totalMatches) * 100 : 0,
          totalGames,
          gameWins: value.gameWins,
          gameLosses: value.gameLosses,
          gameWinrate: totalGames > 0 ? (value.gameWins / totalGames) * 100 : 0,
        };
      })
      .sort((a, b) => {
        if (b.totalMatches !== a.totalMatches) return b.totalMatches - a.totalMatches;
        if (b.totalGames !== a.totalGames) return b.totalGames - a.totalGames;
        if (b.matchWins !== a.matchWins) return b.matchWins - a.matchWins;
        return a.key.localeCompare(b.key);
      });
  }, [keyFunction, matches]);

  if (rows.length === 0) {
    return <div className="text-sm text-muted-foreground">{emptyMessage}</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="border-collapse border border-slate-200 dark:border-slate-800 text-sm">
        <thead>
          <tr>
            <th className={cn(headerGroupClass, 'w-20')} rowSpan={2}></th>
            <th
              className={`${headerGroupClass} border-r-2 border-r-slate-400 dark:border-r-slate-600 text-left min-w-[240px]`}
              rowSpan={2}
            >
              Leader & Base
            </th>
            <th
              className={`${headerGroupClass} border-r-2 border-r-slate-400 dark:border-r-slate-600`}
              colSpan={4}
            >
              Matches
            </th>
            <th className={headerGroupClass} colSpan={4}>
              Games
            </th>
          </tr>
          <tr>
            <th className={headerCellClass}>Total</th>
            <th className={headerCellClass}>Wins</th>
            <th className={headerCellClass}>Losses</th>
            <th
              className={`${headerCellClass} border-r-2 border-r-slate-400 dark:border-r-slate-600`}
            >
              WR[%]
            </th>
            <th className={headerCellClass}>Total</th>
            <th className={headerCellClass}>Wins</th>
            <th className={headerCellClass}>Losses</th>
            <th className={headerCellClass}>WR[%]</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr
              key={row.key}
              className="border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 hover:brightness-90"
            >
              <td className={cn(`${numericCellClass} whitespace-nowrap px-2`)}>
                <span className={`font-bold ${getWRColor(row.gameWinrate)}`}>
                  {row.gameWins}/{row.gameLosses}
                </span>
              </td>
              <td
                className={`${tableCellClass} text-left border-r-2 border-r-slate-400 dark:border-r-slate-600 min-w-[240px]`}
              >
                {labelFunction(row.key)}
              </td>
              <td className={cn(numericCellClass, 'w-20')}>{row.totalMatches}</td>
              <td className={cn(numericCellClass, 'w-20')}>{row.matchWins}</td>
              <td className={cn(numericCellClass, 'w-20')}>{row.matchLosses}</td>
              <td
                className={`${cn(numericCellClass, 'w-20')} border-r-2 border-r-slate-400 dark:border-r-slate-600 ${getWRColor(row.matchWinrate)}`}
              >
                {row.matchWinrate.toFixed(1)}%
              </td>
              <td className={cn(numericCellClass, 'w-20')}>{row.totalGames}</td>
              <td className={cn(numericCellClass, 'w-20')}>{row.gameWins}</td>
              <td className={cn(numericCellClass, 'w-20')}>{row.gameLosses}</td>
              <td className={cn(numericCellClass, 'w-20', getWRColor(row.gameWinrate))}>
                {row.gameWinrate.toFixed(1)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default MatchResultStatsTable;

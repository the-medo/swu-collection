import * as React from 'react';
import { useCallback, useMemo } from 'react';
import { MatchResult } from '@/components/app/statistics/lib/MatchResult.ts';
import { getWRColor } from '@/components/app/statistics/common/statsUtils.ts';
import { cn } from '@/lib/utils.ts';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { format, formatDistanceToNow } from 'date-fns';
import {
  getStatisticsTimestampMs,
  parseStatisticsTimestamp,
} from '@/components/app/statistics/lib/date.ts';
import {
  StatsTableHeaderCell,
  StatsTableHeaderGroup,
} from '@/components/app/statistics/components/SubpageCardStats/CardStatsTable/CardStatsTableHeader.tsx';
import {
  defaultSortColumn,
  getGameRecord,
  getSortedRowDifference,
  isSortColumn,
  MatchResultStatsTableRow,
  MatchResultStatsTableSortColumn,
  numericCellClass,
  tableCellClass,
} from '@/components/app/statistics/common/MatchResultStatsTable/matchResultStatsTableLib.ts';
import { RowSpanHeaderCell } from '@/components/app/statistics/common/MatchResultStatsTable/RowSpanHeaderCell.tsx';

interface MatchResultStatsTableProps {
  matches: MatchResult[];
  keyFunction: (match: MatchResult) => string | null | undefined;
  labelFunction: (key: string) => React.ReactNode;
  labelHeader?: string;
  emptyMessage?: string;
}

const MatchResultStatsTable: React.FC<MatchResultStatsTableProps> = ({
  matches,
  keyFunction,
  labelFunction,
  labelHeader = 'Label',
  emptyMessage = 'No grouped match data available.',
}) => {
  const navigate = useNavigate();
  const search = useSearch({ strict: false });

  const sMatchResultStatsColumn = isSortColumn(search.sMatchResultStatsColumn)
    ? search.sMatchResultStatsColumn
    : defaultSortColumn;
  const sMatchResultStatsSort = search.sMatchResultStatsSort === 'asc' ? 'asc' : 'desc';

  const onSortChange = useCallback(
    (column: MatchResultStatsTableSortColumn) => {
      navigate({
        to: '.',
        search: prev => ({
          ...prev,
          sMatchResultStatsColumn: column,
          sMatchResultStatsSort:
            column === prev.sMatchResultStatsColumn
              ? prev.sMatchResultStatsSort === 'asc'
                ? 'desc'
                : 'asc'
              : 'desc',
        }),
      });
    },
    [navigate],
  );

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
        lastPlayedAt?: string;
        lastPlayedAtMs: number;
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
          lastPlayedAt: undefined,
          lastPlayedAtMs: Number.NEGATIVE_INFINITY,
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

      const playedAtMs = getStatisticsTimestampMs(match.firstGameCreatedAt);
      if (playedAtMs > entry.lastPlayedAtMs) {
        entry.lastPlayedAt = match.firstGameCreatedAt;
        entry.lastPlayedAtMs = playedAtMs;
      }
    });

    return Array.from(groups.entries()).map(([key, value]) => {
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
        lastPlayedAt: value.lastPlayedAt,
        lastPlayedAtMs:
          value.lastPlayedAtMs === Number.NEGATIVE_INFINITY ? 0 : value.lastPlayedAtMs,
      };
    });
  }, [keyFunction, matches]);

  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => {
      const diff = getSortedRowDifference(a, b, sMatchResultStatsColumn);
      if (diff !== 0) {
        return sMatchResultStatsSort === 'asc' ? diff : -diff;
      }

      const fallbackDiff = getSortedRowDifference(a, b, defaultSortColumn);
      if (fallbackDiff !== 0) {
        return sMatchResultStatsSort === 'asc' && sMatchResultStatsColumn === defaultSortColumn
          ? fallbackDiff
          : -fallbackDiff;
      }

      return a.key.localeCompare(b.key);
    });
  }, [rows, sMatchResultStatsColumn, sMatchResultStatsSort]);

  if (sortedRows.length === 0) {
    return <div className="text-sm text-muted-foreground">{emptyMessage}</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="border-collapse border border-slate-200 dark:border-slate-800 text-sm">
        <thead>
          <tr>
            <RowSpanHeaderCell
              className="w-20"
              rowSpan={2}
              onClick={() => onSortChange('gameWinLossRatio')}
              isActive={
                sMatchResultStatsColumn === 'gameWinLossRatio' ? sMatchResultStatsSort : false
              }
            >
              W/L
            </RowSpanHeaderCell>
            <RowSpanHeaderCell
              className="border-r-2 border-r-slate-400 dark:border-r-slate-600 text-left min-w-[240px]"
              rowSpan={2}
              onClick={() => onSortChange('key')}
              isActive={sMatchResultStatsColumn === 'key' ? sMatchResultStatsSort : false}
            >
              {labelHeader}
            </RowSpanHeaderCell>
            <StatsTableHeaderGroup
              colSpan={4}
              thickRightBorder
              onClick={() => onSortChange('totalMatches')}
            >
              Matches
            </StatsTableHeaderGroup>
            <StatsTableHeaderGroup colSpan={4} onClick={() => onSortChange('totalGames')}>
              Games
            </StatsTableHeaderGroup>
            <RowSpanHeaderCell
              className="border-r-2 border-r-slate-400 dark:border-r-slate-600 text-left min-w-[150px]"
              rowSpan={2}
              onClick={() => onSortChange('lastPlayedAt')}
              isActive={sMatchResultStatsColumn === 'lastPlayedAt' ? sMatchResultStatsSort : false}
            >
              Last Played At
            </RowSpanHeaderCell>
          </tr>
          <tr>
            <StatsTableHeaderCell
              onClick={() => onSortChange('totalMatches')}
              isActive={sMatchResultStatsColumn === 'totalMatches' ? sMatchResultStatsSort : false}
            >
              Total
            </StatsTableHeaderCell>
            <StatsTableHeaderCell
              onClick={() => onSortChange('matchWins')}
              isActive={sMatchResultStatsColumn === 'matchWins' ? sMatchResultStatsSort : false}
            >
              Wins
            </StatsTableHeaderCell>
            <StatsTableHeaderCell
              onClick={() => onSortChange('matchLosses')}
              isActive={sMatchResultStatsColumn === 'matchLosses' ? sMatchResultStatsSort : false}
            >
              Losses
            </StatsTableHeaderCell>
            <StatsTableHeaderCell
              thickRightBorder
              onClick={() => onSortChange('matchWinrate')}
              isActive={sMatchResultStatsColumn === 'matchWinrate' ? sMatchResultStatsSort : false}
            >
              WR[%]
            </StatsTableHeaderCell>
            <StatsTableHeaderCell
              onClick={() => onSortChange('totalGames')}
              isActive={sMatchResultStatsColumn === 'totalGames' ? sMatchResultStatsSort : false}
            >
              Total
            </StatsTableHeaderCell>
            <StatsTableHeaderCell
              onClick={() => onSortChange('gameWins')}
              isActive={sMatchResultStatsColumn === 'gameWins' ? sMatchResultStatsSort : false}
            >
              Wins
            </StatsTableHeaderCell>
            <StatsTableHeaderCell
              onClick={() => onSortChange('gameLosses')}
              isActive={sMatchResultStatsColumn === 'gameLosses' ? sMatchResultStatsSort : false}
            >
              Losses
            </StatsTableHeaderCell>
            <StatsTableHeaderCell
              onClick={() => onSortChange('gameWinrate')}
              isActive={sMatchResultStatsColumn === 'gameWinrate' ? sMatchResultStatsSort : false}
            >
              WR[%]
            </StatsTableHeaderCell>
          </tr>
        </thead>
        <tbody>
          {sortedRows.map(row => (
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
              <td
                className={`${tableCellClass} text-left border-r-2 border-r-slate-400 dark:border-r-slate-600 min-w-[150px] whitespace-nowrap`}
              >
                {row.lastPlayedAt ? (
                  <div title={format(parseStatisticsTimestamp(row.lastPlayedAt), 'PPpp')}>
                    <div className="flex gap-2 justify-between text-sm">
                      {formatDistanceToNow(parseStatisticsTimestamp(row.lastPlayedAt), {
                        addSuffix: true,
                      })}
                    </div>
                  </div>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default MatchResultStatsTable;

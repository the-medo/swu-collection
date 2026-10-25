import { calculateResultStatistics } from '@/components/app/statistics/lib/resultStatistics';
import { statisticsStyles } from '@/components/app/statistics/statisticsStyles';
import * as React from 'react';
import { useMemo, useCallback } from 'react';
import { ResponsiveTimeRange, CalendarDatum, TimeRangeSvgProps } from '@nivo/calendar';
import { format, subDays } from 'date-fns';
import DashboardCalendarTooltip from './DashboardCalendarTooltip.tsx';
import { MatchResult } from '@/components/app/statistics/lib/MatchResult.ts';
import { useSearch } from '@tanstack/react-router';

export type DashboardCalendarData = CalendarDatum & {
  matchWins: number;
  matchLosses: number;
  matchDraws: number;
  matchesCount: number;
  gamesCount: number;
  gameWins: number;
  gameLosses: number;
  gameDraws: number;
  containsInTeam: boolean;
  containsNotInTeam: boolean;
};

interface DashboardCalendarProps {
  matchesByDate: Record<string, MatchResult[]> | undefined;
}

const DashboardCalendar: React.FC<DashboardCalendarProps> = ({ matchesByDate }) => {
  const { sInTeam } = useSearch({
    strict: false,
  });

  const calendarData = useMemo<DashboardCalendarData[]>(() => {
    if (!matchesByDate) return [];

    return Object.entries(matchesByDate)
      .map(([date, matches]) => {
        const stats = calculateResultStatistics(matches);
        const ratedMatches = stats.matchWins + stats.matchLosses + stats.matchDraws;
        return {
          day: date,
          value: ratedMatches > 0 ? stats.matchWins / ratedMatches : -1,
          matchWins: stats.matchWins,
          matchLosses: stats.matchLosses,
          matchDraws: stats.matchDraws,
          matchesCount: stats.totalMatches,
          gamesCount: stats.totalGames,
          gameWins: stats.gameWins,
          gameLosses: stats.gameLosses,
          gameDraws: stats.gameDraws,
          containsInTeam: stats.containsInTeam,
          containsNotInTeam: stats.containsNotInTeam,
        };
      })
      .filter(day => day.gamesCount > 0);
  }, [matchesByDate]);

  const { from, to } = useMemo(() => {
    const today = new Date();
    return {
      from: format(subDays(today, 90), 'yyyy-MM-dd'),
      to: format(today, 'yyyy-MM-dd'),
    };
  }, []);

  const tooltip = useCallback(
    (n: DashboardCalendarData) => {
      return <DashboardCalendarTooltip data={n} showWinLose={!sInTeam} />;
    },
    [sInTeam],
  );

  const colorScale = useMemo(
    () =>
      Object.assign(
        (value: number | { valueOf(): number }) => {
          if (sInTeam) return 'var(--workspace-accent)';
          const winrate = Number(value);
          // Played days without eligible match results have no win rate yet.
          if (winrate < 0) return 'var(--statistics-activity-unrated)';
          const step = Math.min(7, Math.floor(Math.max(0, winrate) * 8)) + 1;
          return `var(--statistics-activity-${step})`;
        },
        { ticks: () => [0, 0.5, 1] },
      ),
    [sInTeam],
  );

  return (
    <div className={statisticsStyles.calendar}>
      <ResponsiveTimeRange
        data={calendarData}
        from={from}
        to={to}
        minValue={0}
        maxValue={1}
        emptyColor="var(--statistics-activity-empty)"
        colorScale={colorScale}
        margin={{ top: 20, right: 20, bottom: 20, left: 40 }}
        dayBorderWidth={2}
        dayBorderColor="var(--statistics-activity-surface)"
        tooltip={tooltip as unknown as TimeRangeSvgProps['tooltip']}
        monthLegendOffset={10}
        firstWeekday="monday"
        theme={{
          text: {
            fill: 'hsl(var(--muted-foreground))',
          },
          grid: {
            line: {
              stroke: 'hsl(var(--border))',
            },
          },
        }}
      />
    </div>
  );
};

export default DashboardCalendar;

import * as React from 'react';
import { useMemo, useCallback } from 'react';
import { ResponsiveTimeRange, CalendarDatum, TimeRangeSvgProps } from '@nivo/calendar';
import { useTheme } from '@/components/theme-provider.tsx';
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
  containsInTeam: boolean;
  containsNotInTeam: boolean;
};

interface DashboardCalendarProps {
  matchesByDate: Record<string, MatchResult[]> | undefined;
}

const DashboardCalendar: React.FC<DashboardCalendarProps> = ({ matchesByDate }) => {
  const { theme } = useTheme();
  const { sInTeam } = useSearch({
    strict: false,
  });

  const calendarData = useMemo<DashboardCalendarData[]>(() => {
    if (!matchesByDate) return [];

    return Object.entries(matchesByDate).map(([date, matches]) => {
      let totalMatches = 0;
      let totalGames = 0;
      let wins = 0;
      let losses = 0;
      let draws = 0;
      let gWins = 0;
      let gLosses = 0;
      let containsInTeam = false;
      let containsNotInTeam = false;

      matches.forEach(match => {
        if (match.inTeam) {
          containsInTeam = true;
          if (match.id.startsWith('inTeam-')) {
            totalGames += match.games.length;
            totalMatches++;
          }
          return;
        } else {
          containsNotInTeam = true;
        }

        if (match.result === 3) wins++;
        else if (match.result === 1) draws++;
        else if (match.result === 0) losses++;

        totalGames += match.games.length;
        totalMatches++;

        match.games.forEach(game => {
          if (game.isWinner === true) gWins++;
          else if (game.isWinner === false) gLosses++;
        });
      });

      return {
        day: date,
        value: totalMatches ? wins / totalMatches : 0,
        matchWins: wins,
        matchLosses: losses,
        matchDraws: draws,
        matchesCount: totalMatches,
        gamesCount: totalGames,
        gameWins: gWins,
        gameLosses: gLosses,
        containsInTeam,
        containsNotInTeam,
      };
    });
  }, [matchesByDate]);

  const { from, to } = useMemo(() => {
    const today = new Date();
    return {
      from: format(subDays(today, 90), 'yyyy-MM-dd'),
      to: format(today, 'yyyy-MM-dd'),
    };
  }, []);

  const isDark = theme === 'dark';

  const tooltip = useCallback(
    (n: DashboardCalendarData) => {
      return <DashboardCalendarTooltip data={n} showWinLose={!sInTeam} />;
    },
    [sInTeam],
  );

  return (
    <div style={{ height: '200px', minWidth: '400px' }}>
      <ResponsiveTimeRange
        data={calendarData}
        from={from}
        to={to}
        emptyColor={isDark ? '#222222' : '#eeeeee'}
        colors={['#f47560', '#e8c1a0', '#bcf497', '#61cdbb', '#61cdbb']}
        margin={{ top: 20, right: 20, bottom: 20, left: 40 }}
        dayBorderWidth={2}
        dayBorderColor={isDark ? '#111111' : '#ffffff'}
        tooltip={tooltip as unknown as TimeRangeSvgProps['tooltip']}
        monthLegendOffset={10}
        firstWeekday="monday"
        theme={{
          text: {
            fill: isDark ? '#ffffff' : '#333333',
          },
          ...(isDark
            ? {
                grid: {
                  line: {
                    stroke: '#333333',
                  },
                },
              }
            : {}),
        }}
      />
    </div>
  );
};

export default DashboardCalendar;

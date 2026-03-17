import * as React from 'react';
import { useGameResultsContext } from '@/components/app/statistics/GameResultsContext.tsx';
import { Card } from '@/components/ui/card.tsx';
import DashboardCalendar from '@/components/app/statistics/StatisticsDashboard/DashboardCalendar/DashboardCalendar.tsx';
import DashboardLeaderBase from '@/components/app/statistics/StatisticsDashboard/DashboardLeaderBase/DashboardLeaderBase.tsx';
import DashboardOverview from '@/components/app/statistics/StatisticsDashboard/DashboardOverview/DashboardOverview.tsx';
import { startOfDay, subDays } from 'date-fns';
import { useMemo } from 'react';
import MatchResultBox from '@/components/app/statistics/components/MatchResultBox/MatchResultBox.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Link, useSearch } from '@tanstack/react-router';
import { getTeamUrlPrefix } from '@/components/app/teams/lib/getTeamUrlPrefix.ts';
import { getStatisticsTimestampMs } from '@/components/app/statistics/lib/date.ts';

interface StatisticsDashboardProps {
  teamId?: string;
}

const StatisticsDashboard: React.FC<StatisticsDashboardProps> = ({ teamId }) => {
  const gameResultData = useGameResultsContext();
  const { sInTeam } = useSearch({
    strict: false,
  });

  const { todayMatches, last7DaysMatches, allMatches } = React.useMemo(() => {
    const matches = gameResultData?.matches.array ?? [];
    const todayStartTime = startOfDay(new Date()).getTime();
    const last7DaysStartTime = startOfDay(subDays(new Date(), 7)).getTime();

    return {
      todayMatches: matches.filter(
        m => getStatisticsTimestampMs(m.firstGameCreatedAt) >= todayStartTime,
      ),
      last7DaysMatches: matches.filter(
        m => getStatisticsTimestampMs(m.firstGameCreatedAt) >= last7DaysStartTime,
      ),
      allMatches: matches,
    };
  }, [gameResultData?.matches.array]);

  const visibleMatches = useMemo(() => {
    if (!gameResultData) return [];
    return gameResultData.matches.array.slice(0, 5);
  }, [gameResultData]);

  const showWinLose = !sInTeam;

  return (
    <div className="flex flex-wrap gap-4">
      <div className="flex flex-1 flex-col gap-2">
        <Card className="p-4 h-fit">
          <h3 className="text-lg font-semibold mb-4">Activity</h3>
          <DashboardCalendar matchesByDate={gameResultData?.matches.byDate} />
          <div className="flex">
            <div className="p-2 w-full md:min-w-[270px]">
              <h3 className="text-lg font-semibold">Today</h3>
              <DashboardOverview matches={todayMatches} showWinLose={showWinLose} />
            </div>
            <div className="p-2 w-full md:min-w-[270px]">
              <h3 className="text-lg font-semibold mb-4">Last 7 days</h3>
              <DashboardOverview matches={last7DaysMatches} showWinLose={showWinLose} />
            </div>
            {/*{allMatches.length !== last7DaysMatches.length && (*/}
            <div className="p-2 w-full md:min-w-[270px]">
              <h3 className="text-lg font-semibold mb-4">All</h3>
              <DashboardOverview matches={allMatches} showWinLose={showWinLose} />
            </div>
            {/*)}*/}
          </div>
        </Card>
        {visibleMatches.map(match => (
          <MatchResultBox key={match.id} match={match} />
        ))}
        <Link
          to={`${getTeamUrlPrefix(teamId)}/statistics/history`}
          params={{
            teamId,
          }}
          search={prev => prev}
        >
          <Button variant="outline">View full match history</Button>
        </Link>
      </div>
      <div className="flex flex-1 flex-wrap gap-4">
        {gameResultData && (
          <DashboardLeaderBase
            teamId={teamId}
            byLeaderBase={gameResultData.matches.byLeaderBase}
            byDeckId={gameResultData.matches.byDeckId}
          />
        )}
      </div>
    </div>
  );
};

export default StatisticsDashboard;

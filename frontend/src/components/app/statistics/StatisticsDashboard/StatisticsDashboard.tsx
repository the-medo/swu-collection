import * as React from 'react';
import { useGameResults } from '@/components/app/statistics/useGameResults.ts';
import { Card } from '@/components/ui/card.tsx';
import DashboardCalendar from '@/components/app/statistics/StatisticsDashboard/DashboardCalendar/DashboardCalendar.tsx';
import DashboardLeaderBase from '@/components/app/statistics/StatisticsDashboard/DashboardLeaderBase/DashboardLeaderBase.tsx';
import DashboardOverview from '@/components/app/statistics/StatisticsDashboard/DashboardOverview/DashboardOverview.tsx';
import { isAfter, startOfDay, subDays } from 'date-fns';
import { useMemo } from 'react';
import MatchResultBox from '@/components/app/statistics/components/MatchResultBox/MatchResultBox.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Link } from '@tanstack/react-router';

interface StatisticsDashboardProps {
  teamId?: string;
}

const StatisticsDashboard: React.FC<StatisticsDashboardProps> = ({ teamId }) => {
  const gameResultData = useGameResults({ teamId });

  const { todayMatches, last7DaysMatches, allMatches } = React.useMemo(() => {
    const matches = gameResultData?.matches.array ?? [];
    const now = new Date();
    const todayStart = startOfDay(now);
    const last7DaysStart = startOfDay(subDays(now, 7));

    return {
      todayMatches: matches.filter(m => isAfter(new Date(m.firstGameCreatedAt), todayStart)),
      last7DaysMatches: matches.filter(m =>
        isAfter(new Date(m.firstGameCreatedAt), last7DaysStart),
      ),
      allMatches: matches,
    };
  }, [gameResultData?.matches.array]);

  const visibleMatches = useMemo(() => {
    if (!gameResultData) return [];
    return gameResultData.matches.array.slice(0, 5);
  }, [gameResultData]);

  return (
    <div className="flex flex-wrap gap-4">
      <div className="flex flex-1 flex-col gap-2">
        <Card className="p-4 h-fit">
          <h3 className="text-lg font-semibold mb-4">Activity</h3>
          <DashboardCalendar matchesByDate={gameResultData?.matches.byDate} />
          <div className="flex">
            <div className="p-2 w-full md:w-[250px]">
              <h3 className="text-lg font-semibold">Today</h3>
              <DashboardOverview matches={todayMatches} />
            </div>
            <div className="p-2 w-full md:w-[250px]">
              <h3 className="text-lg font-semibold mb-4">Last 7 days</h3>
              <DashboardOverview matches={last7DaysMatches} />
            </div>
            {allMatches.length !== last7DaysMatches.length && (
              <div className="p-2 w-full md:w-[250px]">
                <h3 className="text-lg font-semibold mb-4">All</h3>
                <DashboardOverview matches={allMatches} />
              </div>
            )}
          </div>
        </Card>
        {visibleMatches.map(match => (
          <MatchResultBox key={match.id} match={match} />
        ))}
        <Link to={teamId ? `/teams/${teamId}/statistics/history` : `/statistics/history`}>
          <Button variant="outline">View full match history</Button>
        </Link>
      </div>
      <div className="flex flex-1 flex-wrap gap-4">
        {gameResultData && (
          <DashboardLeaderBase
            byLeaderBase={gameResultData.matches.byLeaderBase}
            byDeckId={gameResultData.matches.byDeckId}
          />
        )}
      </div>
    </div>
  );
};

export default StatisticsDashboard;

import * as React from 'react';
import { useGameResults } from '@/components/app/statistics/useGameResults.ts';
import { Card } from '@/components/ui/card.tsx';
import DashboardCalendar from '@/components/app/statistics/StatisticsDashboard/DashboardCalendar/DashboardCalendar.tsx';
import DashboardDecks from '@/components/app/statistics/StatisticsDashboard/DashboardDecks/DashboardDecks.tsx';
import DashboardOverview from '@/components/app/statistics/StatisticsDashboard/DashboardOverview/DashboardOverview.tsx';
import { isAfter, startOfDay, subDays } from 'date-fns';

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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col md:flex-row gap-4">
        <Card className="p-4 flex-1">
          <h3 className="text-lg font-semibold mb-4">Activity</h3>
          <DashboardCalendar matchesByDate={gameResultData?.matches.byDate} />
        </Card>
        <Card className="p-4 w-full md:w-[250px]">
          <h3 className="text-lg font-semibold mb-4">Today</h3>
          <DashboardOverview matches={todayMatches} />
        </Card>
        <Card className="p-4 w-full md:w-[250px]">
          <h3 className="text-lg font-semibold mb-4">Last 7 days</h3>
          <DashboardOverview matches={last7DaysMatches} />
        </Card>
        {allMatches.length !== last7DaysMatches.length && (
          <Card className="p-4 w-full md:w-[250px]">
            <h3 className="text-lg font-semibold mb-4">All</h3>
            <DashboardOverview matches={allMatches} />
          </Card>
        )}
      </div>
      {gameResultData && (
        <Card className="p-4 overflow-x-auto">
          <h3 className="text-lg font-semibold mb-4">Recently played decks</h3>
          <DashboardDecks byDeckId={gameResultData.matches.byDeckId} />
        </Card>
      )}
    </div>
  );
};

export default StatisticsDashboard;

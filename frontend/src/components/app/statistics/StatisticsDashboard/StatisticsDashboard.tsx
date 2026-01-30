import * as React from 'react';
import { useGameResults } from '@/components/app/statistics/useGameResults.ts';
import { Card } from '@/components/ui/card.tsx';
import DashboardCalendar from '@/components/app/statistics/StatisticsDashboard/DashboardCalendar/DashboardCalendar.tsx';
import DashboardDecks from '@/components/app/statistics/StatisticsDashboard/DashboardDecks/DashboardDecks.tsx';
import DashboardOverview from '@/components/app/statistics/StatisticsDashboard/DashboardOverview/DashboardOverview.tsx';

interface StatisticsDashboardProps {
  teamId?: string;
}

const StatisticsDashboard: React.FC<StatisticsDashboardProps> = ({ teamId }) => {
  const gameResultData = useGameResults({ teamId });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col md:flex-row gap-4">
        <Card className="p-4 flex-1">
          <h3 className="text-lg font-semibold mb-4">Activity</h3>
          <DashboardCalendar matchesByDate={gameResultData?.matches.byDate} />
        </Card>
        <Card className="p-4 w-full md:w-[400px]">
          <h3 className="text-lg font-semibold mb-4">Overview</h3>
          <DashboardOverview matches={gameResultData?.matches.array} />
        </Card>
      </div>
      {gameResultData && (
        <Card className="p-4">
          <h3 className="text-lg font-semibold mb-4">Decks</h3>
          <DashboardDecks byDeckId={gameResultData.matches.byDeckId} />
        </Card>
      )}
    </div>
  );
};

export default StatisticsDashboard;

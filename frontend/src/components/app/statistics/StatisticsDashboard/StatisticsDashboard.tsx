import * as React from 'react';
import { useGameResults } from '@/components/app/statistics/useGameResults.ts';
import { Card } from '@/components/ui/card.tsx';
import DashboardCalendar from '@/components/app/statistics/StatisticsDashboard/DashboardCalendar/DashboardCalendar.tsx';
import DashboardDecks from '@/components/app/statistics/StatisticsDashboard/DashboardDecks/DashboardDecks.tsx';

interface StatisticsDashboardProps {
  teamId?: string;
}

const StatisticsDashboard: React.FC<StatisticsDashboardProps> = ({ teamId }) => {
  const gameResultData = useGameResults({ teamId });

  return (
    <div className="flex flex-col gap-4">
      <Card className="p-4">
        <div className="flex gap-4 flex-1">
          <DashboardCalendar matchesByDate={gameResultData?.matches.byDate} />
          {gameResultData && (
            <div className="flex flex-1 gap-4">
              <DashboardDecks byDeckId={gameResultData.matches.byDeckId} />
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default StatisticsDashboard;

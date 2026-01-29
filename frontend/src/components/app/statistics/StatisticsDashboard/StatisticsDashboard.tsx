import * as React from 'react';
import { useGameResults } from '@/components/app/statistics/useGameResults.ts';
import { Card } from '@/components/ui/card.tsx';
import DashboardCalendar from '@/components/app/statistics/StatisticsDashboard/DashboardCalendar/DashboardCalendar.tsx';

interface StatisticsDashboardProps {
  teamId?: string;
}

const StatisticsDashboard: React.FC<StatisticsDashboardProps> = ({ teamId }) => {
  const gameResultData = useGameResults({ teamId });

  return (
    <div className="flex flex-col gap-4">
      <Card className="p-4">
        <DashboardCalendar matchesByDate={gameResultData?.matches.byDate} />
      </Card>
    </div>
  );
};

export default StatisticsDashboard;

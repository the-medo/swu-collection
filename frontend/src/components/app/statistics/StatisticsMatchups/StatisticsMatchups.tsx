import * as React from 'react';
import { useGameResultsContext } from '@/components/app/statistics/GameResultsContext.tsx';
import StatisticsMatchupsTable from '@/components/app/statistics/StatisticsMatchups/StatisticsMatchupsTable/StatisticsMatchupsTable.tsx';

interface StatisticsMatchupsProps {
  teamId?: string;
}

const StatisticsMatchups: React.FC<StatisticsMatchupsProps> = () => {
  const gameResultData = useGameResultsContext();

  return <StatisticsMatchupsTable matches={gameResultData?.matches.array ?? []} />;
};

export default StatisticsMatchups;

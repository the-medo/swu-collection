import * as React from 'react';
import { useGameResults } from '@/components/app/statistics/useGameResults.ts';
import StatisticsMatchupsTable from '@/components/app/statistics/StatisticsMatchups/StatisticsMatchupsTable/StatisticsMatchupsTable.tsx';

interface StatisticsMatchupsProps {
  teamId?: string;
}

const StatisticsMatchups: React.FC<StatisticsMatchupsProps> = ({ teamId }) => {
  const gameResultData = useGameResults({ teamId });

  return <StatisticsMatchupsTable matches={gameResultData?.matches.array ?? []} />;
};

export default StatisticsMatchups;

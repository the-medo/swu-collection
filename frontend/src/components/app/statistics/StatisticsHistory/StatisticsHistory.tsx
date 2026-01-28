import * as React from 'react';
import { useGameResults } from '@/components/app/statistics/useGameResults.ts';

interface StatisticsHistoryProps {
  teamId?: string;
}

const StatisticsHistory: React.FC<StatisticsHistoryProps> = ({ teamId }) => {
  const gameResultData = useGameResults({ teamId });

  return <div>Statistics History {JSON.stringify(gameResultData)}</div>;
};

export default StatisticsHistory;

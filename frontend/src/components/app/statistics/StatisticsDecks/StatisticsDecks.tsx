import * as React from 'react';
import StatisticsDeckLists from '@/components/app/statistics/StatisticsDecks/StatisticsDeckLists/StatisticsDeckLists.tsx';
import { useGameResults } from '@/components/app/statistics/useGameResults.ts';

interface StatisticsDecksProps {
  teamId?: string;
}

const StatisticsDecks: React.FC<StatisticsDecksProps> = ({ teamId }) => {
  const gameResultData = useGameResults({ teamId });

  if (!gameResultData) return 'No data to show';
  return <StatisticsDeckLists byDeckId={gameResultData.matches.byDeckId} />;
};

export default StatisticsDecks;

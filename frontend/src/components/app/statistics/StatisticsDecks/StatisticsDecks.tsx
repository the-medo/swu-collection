import * as React from 'react';
import StatisticsDeckLists from '@/components/app/statistics/StatisticsDecks/StatisticsDeckLists/StatisticsDeckLists.tsx';
import { useGameResults } from '@/components/app/statistics/useGameResults.ts';
import { useSearch } from '@tanstack/react-router';
import StatisticsDeckDetail from '@/components/app/statistics/StatisticsDecks/StatisticsDeckDetail/StatisticsDeckDetail.tsx';

interface StatisticsDecksProps {
  teamId?: string;
}

const StatisticsDecks: React.FC<StatisticsDecksProps> = ({ teamId }) => {
  const gameResultData = useGameResults({ teamId });
  const { sDeckId } = useSearch({ strict: false });

  if (!gameResultData) return 'No data to show';
  if (sDeckId) {
    return <StatisticsDeckDetail matches={gameResultData.matches.byDeckId.matches[sDeckId]} />;
  }
  return <StatisticsDeckLists byDeckId={gameResultData.matches.byDeckId} />;
};

export default StatisticsDecks;

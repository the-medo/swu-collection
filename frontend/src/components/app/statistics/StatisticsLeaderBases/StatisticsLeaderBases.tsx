import * as React from 'react';
import { useGameResults } from '@/components/app/statistics/useGameResults.ts';
import { useSearch } from '@tanstack/react-router';
import StatisticsLeaderBaseLists from '@/components/app/statistics/StatisticsLeaderBases/StatisticsLeaderBaseLists/StatisticsLeaderBaseLists.tsx';
import StatisticsLeaderBaseDetail from '@/components/app/statistics/StatisticsLeaderBases/StatisticsLeaderBaseDetail/StatisticsLeaderBaseDetail.tsx';

interface StatisticsLeaderBasesProps {
  teamId?: string;
}

const StatisticsLeaderBases: React.FC<StatisticsLeaderBasesProps> = ({ teamId }) => {
  const gameResultData = useGameResults({ teamId });

  const { sLeaderCardId, sBaseCardKey } = useSearch({ strict: false });

  if (!gameResultData) return 'No data to show';
  if (sLeaderCardId && sBaseCardKey) {
    const key = `${sLeaderCardId}|${sBaseCardKey}`;
    return (
      <StatisticsLeaderBaseDetail
        matches={gameResultData.matches.byLeaderBase.matches[key]}
        byDeckId={gameResultData.matches.byDeckId}
      />
    );
  }
  return (
    <StatisticsLeaderBaseLists
      byLeaderBase={gameResultData.matches.byLeaderBase}
      byDeckId={gameResultData.matches.byDeckId}
    />
  );
};

export default StatisticsLeaderBases;

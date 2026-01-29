import * as React from 'react';
import { useGameResults } from '@/components/app/statistics/useGameResults.ts';
import MatchResultBox from '@/components/app/statistics/components/MatchResultBox/MatchResultBox.tsx';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll.ts';
import { useMemo } from 'react';

interface StatisticsHistoryProps {
  teamId?: string;
}

const StatisticsHistory: React.FC<StatisticsHistoryProps> = ({ teamId }) => {
  const gameResultData = useGameResults({ teamId });

  const totalMatches = gameResultData?.matches.array.length ?? 0;

  const { itemsToShow, observerTarget } = useInfiniteScroll({
    totalItems: totalMatches,
    initialItemsToLoad: 20,
    itemsPerBatch: 20,
    threshold: 400,
  });

  const visibleMatches = useMemo(() => {
    if (!gameResultData) return [];
    return gameResultData.matches.array.slice(0, itemsToShow);
  }, [gameResultData, itemsToShow]);

  if (!gameResultData || totalMatches === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-muted-foreground">
        No matches found.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {visibleMatches.map(match => (
        <MatchResultBox key={match.id} match={match} />
      ))}
      <div ref={observerTarget} className="h-4" />
    </div>
  );
};

export default StatisticsHistory;

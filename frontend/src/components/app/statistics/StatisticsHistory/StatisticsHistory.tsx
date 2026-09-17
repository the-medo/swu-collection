import * as React from 'react';
import { useGameResultsContext } from '@/components/app/statistics/GameResultsContext.tsx';
import MatchResultBox from '@/components/app/statistics/components/MatchResultBox/MatchResultBox.tsx';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll.ts';
import { useMemo } from 'react';
import { Button } from '@/components/ui/button.tsx';

interface StatisticsHistoryProps {
  teamId?: string;
}

const StatisticsHistory: React.FC<StatisticsHistoryProps> = () => {
  const gameResultData = useGameResultsContext();
  const matches = useMemo(() => gameResultData?.matches.array ?? [], [gameResultData]);

  const totalMatches = matches.length;

  const { itemsToShow, observerTarget } = useInfiniteScroll({
    totalItems: totalMatches,
    initialItemsToLoad: 20,
    itemsPerBatch: 20,
    threshold: 400,
  });

  const visibleMatches = useMemo(() => {
    return matches.slice(0, itemsToShow);
  }, [matches, itemsToShow]);

  return (
    <div className="flex flex-col gap-2">
      {gameResultData?.isLoading && <p role="status">Loading game history…</p>}
      {gameResultData?.isError && (
        <div role="alert">
          Could not refresh game history.{' '}
          <Button variant="outline" onClick={gameResultData.refetch}>
            Retry
          </Button>
        </div>
      )}
      {!gameResultData?.isLoading && !gameResultData?.isError && totalMatches === 0 && (
        <p className="p-8 text-center text-muted-foreground">No matches found.</p>
      )}
      {visibleMatches.map(match => (
        <MatchResultBox key={match.id} match={match} />
      ))}
      <div ref={observerTarget} className="h-4" />
    </div>
  );
};

export default StatisticsHistory;

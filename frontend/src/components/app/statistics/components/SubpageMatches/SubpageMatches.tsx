import * as React from 'react';
import { MatchResult } from '@/components/app/statistics/useGameResults.ts';
import MatchResultBox from '@/components/app/statistics/components/MatchResultBox/MatchResultBox.tsx';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll.ts';
import { useMemo } from 'react';

interface SubpageMatchesProps {
  matches: MatchResult[];
}

const SubpageMatches: React.FC<SubpageMatchesProps> = ({ matches }) => {
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

  if (totalMatches === 0) {
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

export default SubpageMatches;

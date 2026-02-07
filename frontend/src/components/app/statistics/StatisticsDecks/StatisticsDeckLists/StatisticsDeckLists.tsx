import * as React from 'react';
import { StatisticsHistoryData } from '@/components/app/statistics/useGameResults.ts';
import { useMemo } from 'react';
import DeckInfoThumbnail from './DeckInfoThumbnail.tsx';
import { calculateDeckStatistics } from '@/components/app/statistics/lib/deckLib.ts';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll.ts';

interface StatisticsDeckListsProps {
  byDeckId: StatisticsHistoryData['matches']['byDeckId'];
}

const StatisticsDeckLists: React.FC<StatisticsDeckListsProps> = ({ byDeckId }) => {
  const recentDecks = useMemo(() => {
    if (!byDeckId || !byDeckId.lastPlayed) return [];

    const deckIds = Object.keys(byDeckId.lastPlayed);

    // Sort by last played date desc
    const sortedDeckIds = deckIds.sort((a, b) => {
      const dateA = new Date(byDeckId.lastPlayed[a]).getTime();
      const dateB = new Date(byDeckId.lastPlayed[b]).getTime();
      return dateB - dateA;
    });

    return sortedDeckIds.map(deckId => {
      const matches = byDeckId.matches[deckId] || [];
      return calculateDeckStatistics(deckId, matches);
    });
  }, [byDeckId]);

  const totalMatches = recentDecks.length ?? 0;

  const { itemsToShow, observerTarget } = useInfiniteScroll({
    totalItems: totalMatches,
    initialItemsToLoad: 20,
    itemsPerBatch: 20,
    threshold: 400,
  });

  const visibleDecks = useMemo(() => {
    if (!recentDecks) return [];
    return recentDecks.slice(0, itemsToShow);
  }, [recentDecks, itemsToShow]);

  if (visibleDecks.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {visibleDecks.map(deck => (
        <DeckInfoThumbnail key={deck.deckId} statistics={deck} statSectionVariant="horizontal" />
      ))}
      <div ref={observerTarget} className="h-4" />
    </div>
  );
};

export default StatisticsDeckLists;

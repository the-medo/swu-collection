import * as React from 'react';
import { StatisticsHistoryData } from '@/components/app/statistics/useGameResults.ts';
import { useMemo, useState } from 'react';
import DeckInfoThumbnail from './DeckInfoThumbnail.tsx';
import {
  calculateDeckStatistics,
  matchesDeckQuickFilter,
} from '@/components/app/statistics/lib/deckLib.ts';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll.ts';
import DebouncedInput from '@/components/app/global/DebouncedInput/DebouncedInput.tsx';

interface StatisticsDeckListsProps {
  teamId?: string;
  byDeckId: StatisticsHistoryData['matches']['byDeckId'];
}

const StatisticsDeckLists: React.FC<StatisticsDeckListsProps> = ({ teamId, byDeckId }) => {
  const [quickFilter, setQuickFilter] = useState<string | undefined>(undefined);

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

  const filteredDecks = useMemo(() => {
    return recentDecks.filter(deck => matchesDeckQuickFilter(deck, quickFilter));
  }, [quickFilter, recentDecks]);

  const hasQuickFilter = !!quickFilter?.trim();
  const totalMatches = filteredDecks.length ?? 0;

  const { itemsToShow, observerTarget } = useInfiniteScroll({
    totalItems: totalMatches,
    initialItemsToLoad: 20,
    itemsPerBatch: 20,
    threshold: 400,
  });

  const visibleDecks = useMemo(() => {
    return filteredDecks.slice(0, itemsToShow);
  }, [filteredDecks, itemsToShow]);

  if (recentDecks.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium whitespace-nowrap">Quick filter:</span>
        <DebouncedInput
          type="text"
          value={quickFilter}
          onChange={setQuickFilter}
          width="full"
          placeholder="Deck name, leader, or base"
        />
      </div>
      {visibleDecks.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2">
          {hasQuickFilter ? 'No decks match this quick filter.' : 'No decks to show.'}
        </p>
      ) : (
        <>
          {visibleDecks.map(deck => (
            <DeckInfoThumbnail
              key={deck.deckId}
              teamId={teamId}
              statistics={deck}
              statSectionVariant="horizontal"
            />
          ))}
          <div ref={observerTarget} className="h-4" />
        </>
      )}
    </div>
  );
};

export default StatisticsDeckLists;

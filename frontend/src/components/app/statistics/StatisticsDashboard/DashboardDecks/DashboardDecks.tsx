import * as React from 'react';
import { StatisticsHistoryData } from '@/components/app/statistics/useGameResults.ts';
import { useMemo } from 'react';
import DeckInfoThumbnail from './DeckInfoThumbnail.tsx';
import { calculateDeckStatistics } from '@/components/app/statistics/lib/deckLib.ts';

interface DashboardDecksProps {
  byDeckId: StatisticsHistoryData['matches']['byDeckId'];
}

const RECENT_DECK_COUNT = 5;

const DashboardDecks: React.FC<DashboardDecksProps> = ({ byDeckId }) => {
  const recentDecks = useMemo(() => {
    if (!byDeckId || !byDeckId.lastPlayed) return [];

    const deckIds = Object.keys(byDeckId.lastPlayed);

    // Sort by last played date desc
    const sortedDeckIds = deckIds.sort((a, b) => {
      const dateA = new Date(byDeckId.lastPlayed[a]).getTime();
      const dateB = new Date(byDeckId.lastPlayed[b]).getTime();
      return dateB - dateA;
    });

    const recentIds = sortedDeckIds.slice(0, RECENT_DECK_COUNT);

    return recentIds.map(deckId => {
      const matches = byDeckId.matches[deckId] || [];
      return calculateDeckStatistics(deckId, matches);
    });
  }, [byDeckId]);

  if (recentDecks.length === 0) return null;

  return (
    <div className="flex gap-4">
      {recentDecks.map(deck => (
        <DeckInfoThumbnail key={deck.deckId} statistics={deck} />
      ))}
    </div>
  );
};

export default DashboardDecks;

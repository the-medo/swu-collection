import React from 'react';
import { useDeckData } from '@/components/app/decks/DeckContents/useDeckData.ts';
import DeckCostChart from './DeckCostChart';
import DeckAspectChart from './DeckAspectChart';

interface DeckStatsProps {
  deckId: string;
}

const DeckStats: React.FC<DeckStatsProps> = ({ deckId }) => {
  const { deckCardsForLayout, isLoading } = useDeckData(deckId);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex flex-col gap-8 w-full">
      <div>
        <h3 className="text-lg font-semibold mb-4">Card Cost Distribution</h3>
        <DeckCostChart deckCardsForLayout={deckCardsForLayout} />
      </div>
      
      <div>
        <h3 className="text-lg font-semibold mb-4">Card Aspect Distribution</h3>
        <DeckAspectChart deckCardsForLayout={deckCardsForLayout} />
      </div>
    </div>
  );
};

export default DeckStats;
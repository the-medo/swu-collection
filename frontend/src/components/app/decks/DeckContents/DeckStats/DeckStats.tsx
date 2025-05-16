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
    <div className="flex flex-col gap-8 w-full items-center">
      <div className="flex flex-col w-full items-center">
        <h3 className="text-lg font-semibold">Card Cost Distribution</h3>
        <div className="w-[400px]">
          <DeckCostChart deckCardsForLayout={deckCardsForLayout} />
        </div>
      </div>

      <div className="flex flex-col w-full items-center">
        <h3 className="text-lg font-semibold">Card Aspect Distribution</h3>
        <div className="w-[400px]">
          <DeckAspectChart deckCardsForLayout={deckCardsForLayout} />
        </div>
      </div>
    </div>
  );
};

export default DeckStats;

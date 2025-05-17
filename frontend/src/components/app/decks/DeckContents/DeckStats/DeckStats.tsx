import React, { useState } from 'react';
import { useDeckData } from '@/components/app/decks/DeckContents/useDeckData.ts';
import DeckCostChart from './DeckCostChart';
import DeckAspectChart from './DeckAspectChart';
import DeckStatsSelectedCards, { FilterType } from './DeckStatsSelectedCards';

interface DeckStatsProps {
  deckId: string;
}

const DeckStats: React.FC<DeckStatsProps> = ({ deckId }) => {
  const { deckCardsForLayout, isLoading } = useDeckData(deckId);
  const [filterType, setFilterType] = useState<FilterType>(null);
  const [filterValue, setFilterValue] = useState<string | null>(null);

  // Handlers for chart click events
  const handleCostClick = (cost: string) => {
    setFilterType('cost');
    setFilterValue(cost);
  };

  const handleAspectClick = (aspect: string) => {
    setFilterType('aspect');
    setFilterValue(aspect);
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex flex-row gap-8 w-full">
      <div className="flex flex-col gap-8">
        <div className="flex flex-col w-full">
          <h3 className="text-lg font-semibold">Card Cost Distribution</h3>
          <div className="max-w-[400px]">
            <DeckCostChart deckCardsForLayout={deckCardsForLayout} onCostClick={handleCostClick} />
          </div>
        </div>

        <div className="flex flex-col w-full">
          <h3 className="text-lg font-semibold">Card Aspect Distribution</h3>
          <div className="max-w-[400px]">
            <DeckAspectChart
              deckCardsForLayout={deckCardsForLayout}
              onAspectClick={handleAspectClick}
            />
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-8 flex-1">
        <DeckStatsSelectedCards
          deckId={deckId}
          deckCardsForLayout={deckCardsForLayout}
          filterType={filterType}
          filterValue={filterValue}
        />
      </div>
    </div>
  );
};

export default DeckStats;

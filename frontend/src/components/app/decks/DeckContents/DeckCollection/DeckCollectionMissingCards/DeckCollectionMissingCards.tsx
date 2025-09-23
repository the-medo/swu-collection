import React from 'react';
import MissingCardsActionSelector from '@/components/app/decks/DeckContents/DeckCollection/DeckCollectionMissingCards/MissingCardsActionSelector.tsx';
import MissingCardsTable from '@/components/app/decks/DeckContents/DeckCollection/DeckCollectionMissingCards/MissingCardsTable/MissingCardsTable.tsx';

interface DeckCollectionMissingCardsProps {
  deckId: string;
}

const DeckCollectionMissingCards: React.FC<DeckCollectionMissingCardsProps> = ({ deckId }) => {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-row gap-2 text-xs italic flex-wrap">
        <div className="flex gap-2">
          <div className="flex gap-1">
            <span className="font-bold">CD:</span> <span>collections (for decks)</span>
          </div>
          <div className="flex gap-1">
            <span className="font-bold">CO:</span> <span>other collections</span>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="flex gap-1">
            <span className="font-bold">WL:</span> <span>wantlists</span>
          </div>
          <div className="flex gap-1">
            <span className="font-bold">OL:</span> <span>other lists</span>
          </div>
        </div>
      </div>
      <div className="flex flex-row gap-2 flex-wrap">
        <MissingCardsTable deckId={deckId} />
        <MissingCardsActionSelector deckId={deckId} />
      </div>
    </div>
  );
};

export default DeckCollectionMissingCards;

import React from 'react';
import MissingCardsActionSelector from '@/components/app/decks/DeckContents/DeckCollection/DeckCollectionMissingCards/MissingCardsActionSelector.tsx';
import MissingCardsTable from '@/components/app/decks/DeckContents/DeckCollection/DeckCollectionMissingCards/MissingCardsTable/MissingCardsTable.tsx';

interface DeckCollectionMissingCardsProps {
  deckId: string;
}

const DeckCollectionMissingCards: React.FC<DeckCollectionMissingCardsProps> = ({ deckId }) => {
  return (
    <div className="flex flex-row gap-2">
      <MissingCardsTable deckId={deckId} />
      <MissingCardsActionSelector deckId={deckId} />
    </div>
  );
};

export default DeckCollectionMissingCards;

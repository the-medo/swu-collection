import React from 'react';
import MissingCardsActionSelector from '@/components/app/decks/DeckContents/DeckCollection/DeckCollectionMissingCards/MissingCardsActionSelector.tsx';

interface DeckCollectionMissingCardsProps {
  deckId: string;
}

const DeckCollectionMissingCards: React.FC<DeckCollectionMissingCardsProps> = ({ deckId }) => {
  return (
    <div className="flex flex-row gap-2">
      <div className="flex flex-col gap-1 flex-1">Here will be table.</div>
      <MissingCardsActionSelector deckId={deckId} />
    </div>
  );
};

export default DeckCollectionMissingCards;

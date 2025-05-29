import React from 'react';
import DeckLayout from '@/components/app/decks/DeckContents/DeckCards/DeckLayout/DeckLayout.tsx';
import { useDeckData } from '@/components/app/decks/DeckContents/useDeckData.ts';

interface DeckCardsProps {
  deckId: string;
  highlightedCardId?: string;
}

const DeckCards: React.FC<DeckCardsProps> = ({ deckId, highlightedCardId }) => {
  const { deckCardsForLayout } = useDeckData(deckId);

  return <DeckLayout deckId={deckId} deckCardsForLayout={deckCardsForLayout} highlightedCardId={highlightedCardId} />;
};

export default DeckCards;

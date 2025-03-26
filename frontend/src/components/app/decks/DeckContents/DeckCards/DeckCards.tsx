import React from 'react';
import DeckLayout from '@/components/app/decks/DeckContents/DeckCards/DeckLayout/DeckLayout.tsx';
import { useDeckData } from '@/components/app/decks/DeckContents/useDeckData.ts';

interface DeckCardsProps {
  deckId: string;
}

const DeckCards: React.FC<DeckCardsProps> = ({ deckId }) => {
  const { deckCardsForLayout } = useDeckData(deckId);

  return <DeckLayout deckId={deckId} deckCardsForLayout={deckCardsForLayout} />;
};

export default DeckCards;

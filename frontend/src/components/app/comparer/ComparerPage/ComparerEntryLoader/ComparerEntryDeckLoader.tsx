import * as React from 'react';
import { useGetDeck } from '@/api/decks/useGetDeck.ts';
import { useGetDeckCards } from '@/api/decks/useGetDeckCards.ts';

interface ComparerEntryDeckLoaderProps {
  deckId: string;
}

const ComparerEntryDeckLoader: React.FC<ComparerEntryDeckLoaderProps> = ({ deckId }) => {
  useGetDeck(deckId);
  useGetDeckCards(deckId);

  return null;
};

export default ComparerEntryDeckLoader;

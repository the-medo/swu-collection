import React from 'react';
import { useDeckCollection } from '@/components/app/decks/DeckContents/DeckCollection/useDeckCollection.ts';
import { useUserCollectionsData } from '@/api/collection/useUserCollectionsData.ts';

interface MissingCardsTableProps {
  deckId: string;
}

const MissingCardsTable: React.FC<MissingCardsTableProps> = ({ deckId }) => {
  const { data: d, isLoading } = useDeckCollection(deckId);
  const { data } = useUserCollectionsData();

  console.log({ data, d });

  return <pre>{JSON.stringify(data, null, 2)}</pre>;
};

export default MissingCardsTable;

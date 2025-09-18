import React from 'react';
import { useDeckCollection } from '@/components/app/decks/DeckContents/DeckCollection/useDeckCollection.ts';
import { DataTable } from '@/components/ui/data-table.tsx';
import { useMissingCardsTableColumns } from './useMissingCardsTableColumns.tsx';
import { useUserCollectionsData } from '@/api/collection/useUserCollectionsData.ts';

interface MissingCardsTableProps {
  deckId: string;
}

const MissingCardsTable: React.FC<MissingCardsTableProps> = ({ deckId }) => {
  const { data: d, isLoading } = useDeckCollection(deckId);
  const { data } = useUserCollectionsData();
  const columns = useMissingCardsTableColumns();

  const rows = React.useMemo(() => {
    if (!d) return [] as any[];
    const ids = Object.keys(d.usedCards || {});
    return ids.map(cardId => ({
      cardId,
      card: d.usedCards[cardId],
      quantity: d.missingCards[cardId]?.quantity ?? 0,
      ownedQuantity: d.ownedCardQuantity[cardId],
    }));
  }, [d]);

  console.log({ d });
  console.log({ data });

  return <DataTable columns={columns} data={rows} loading={isLoading} />;
};

export default MissingCardsTable;

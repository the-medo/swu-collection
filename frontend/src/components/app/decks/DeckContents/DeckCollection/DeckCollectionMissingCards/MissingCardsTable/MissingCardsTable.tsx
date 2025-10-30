import React, { useEffect } from 'react';
import { useDeckCollection } from '@/components/app/decks/DeckContents/DeckCollection/useDeckCollection.ts';
import { DataTable } from '@/components/ui/data-table.tsx';
import { useMissingCardsTableColumns } from './useMissingCardsTableColumns.tsx';
import { useMissingCardsFinalQuantity } from './useMissingCardsFinalQuantity.ts';
import { useDeckMissingCardsStoreActions } from '@/components/app/decks/DeckContents/DeckCollection/useDeckMissingCardsStore.ts';

interface MissingCardsTableProps {
  deckId: string;
}

const MissingCardsTable: React.FC<MissingCardsTableProps> = ({ deckId }) => {
  const { data: deckCollectionData, isLoading } = useDeckCollection(deckId);
  const columns = useMissingCardsTableColumns();
  const { resetDeckMissingCardsStore } = useDeckMissingCardsStoreActions();

  const rows = React.useMemo(() => {
    if (!deckCollectionData) return [] as any[];
    const ids = Object.keys(deckCollectionData.usedCards || {});
    return ids
      .map(cardId => ({
        cardId,
        card: deckCollectionData.usedCards[cardId],
        quantity: deckCollectionData.missingCards[cardId]?.quantity ?? 0,
        ownedQuantity: deckCollectionData.ownedCardQuantity[cardId],
      }))
      .filter(c => c.card?.type !== 'Base' && c.card?.type !== 'Leader')
      .sort(
        (a, b) =>
          b.quantity -
          b.ownedQuantity.deckCollection -
          (a.quantity - a.ownedQuantity.deckCollection),
      );
  }, [deckCollectionData]);

  useEffect(() => {
    return () => {
      resetDeckMissingCardsStore();
    };
  }, []);

  // compute and push final quantities to the store based on rows and settings
  useMissingCardsFinalQuantity(rows);

  return (
    <div className="flex flex-col flex-100 border min-w-[350px] min-h-[300px] max-h-[60vh] @container/missing-cards-table overflow-auto">
      <DataTable
        columns={columns}
        data={rows}
        loading={isLoading}
        cellClassName="p-0"
        headerCellClassName="px-0"
        tableBorder={false}
      />
    </div>
  );
};

export default MissingCardsTable;

import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.tsx';
import * as React from 'react';
import { useCardList } from '@/api/lists/useCardList.ts';
import type { CollectionCard } from '../../../../../../types/CollectionCard.ts';
import { useCollectionCardSelectionStore } from '@/components/app/collections/CollectionCardSelection/useCollectionCardSelectionStore.ts';
import { useCollectionCardObjectsTableColumns } from '@/components/app/collections/CollectionContents/CollectionCards/useCollectionCardObjectsTableColumns.tsx';
import { DataTable } from '@/components/ui/data-table.tsx';
import { useMemo } from 'react';

interface CollectionCardSelectionProps {
  collectionId: string;
}

const CollectionCardSelection: React.FC<CollectionCardSelectionProps> = ({ collectionId }) => {
  const { data: cardList } = useCardList();
  const selection = useCollectionCardSelectionStore(collectionId);

  const columns = useCollectionCardObjectsTableColumns({
    collectionId,
    cardList: cardList?.cards,
    layout: 'table-list',
    forceHorizontal: false,
  });

  const collectionCards = useMemo(() => {
    const result: CollectionCard[] = [];
    if (!selection?.cards) return result;
    for (const [cardId, variants] of Object.entries(selection.cards)) {
      for (const [variantId, subtypes] of Object.entries(variants)) {
        for (const subtype of subtypes) {
          result.push({
            cardId,
            variantId,
            foil: subtype.foil,
            condition: subtype.condition,
            language: subtype.language,
            note: subtype.note ?? '',
            amount: subtype.amount ?? 0,
            amount2: subtype.amount2,
            price: subtype.price,
          });
        }
      }
    }
    return result;
  }, [selection]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-start">
          <span>Card selection</span>{' '}
          <div className="flex flex-col gap-0">
            <span className="font-normal text-sm text-gray-500">
              {collectionCards.reduce((sum, c) => sum + (c.amount ?? 0), 0)} total cards
            </span>
          </div>
        </CardTitle>
        <CardDescription className="flex flex-col gap-2">
          <div className="flex flex-1 max-h-[400px] flex-col gap-2 overflow-y-auto">
            <DataTable columns={columns} data={collectionCards} />
          </div>
        </CardDescription>
      </CardHeader>
    </Card>
  );
};

export default CollectionCardSelection;

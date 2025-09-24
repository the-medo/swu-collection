import { useGetCollection } from '@/api/collections/useGetCollection.ts';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.tsx';
import * as React from 'react';
import { useGetCollectionCards } from '@/api/collections/useGetCollectionCards.ts';
import { cn } from '@/lib/utils.ts';
import { useMemo } from 'react';
import { useCardList } from '@/api/lists/useCardList.ts';
import RarityIcon from '@/components/app/global/icons/RarityIcon.tsx';
import { useCollectionInfo } from '@/components/app/collections/CollectionContents/CollectionSettings/useCollectionLayoutStore.ts';
import { useCollectionCardSelectionStore } from '@/components/app/collections/CollectionCardSelection/useCollectionCardSelectionStore.ts';

interface CollectionCardSelectionProps {
  collectionId: string;
}

const CollectionCardSelection: React.FC<CollectionCardSelectionProps> = ({ collectionId }) => {
  const { data, isFetching } = useGetCollection(collectionId);
  const { data: collectionCards, isFetching: isFetchingCollectionCards } =
    useGetCollectionCards(collectionId);
  const { data: cardList } = useCardList();
  const collectionCurrency = data?.user.currency;
  const loading = isFetching || isFetchingCollectionCards;
  const selection = useCollectionCardSelectionStore(collectionId);

  return (
    <Card className={cn({ 'opacity-50': loading })}>
      <CardHeader>
        <CardTitle className="flex justify-between items-start">
          <span>Card selection</span>{' '}
          <div className="flex flex-col gap-0">
            <span className="font-normal text-sm text-gray-500">X total cards</span>
          </div>
        </CardTitle>
        <CardDescription className="flex flex-col gap-2">
          {JSON.stringify(selection)}
        </CardDescription>
      </CardHeader>
    </Card>
  );
};

export default CollectionCardSelection;

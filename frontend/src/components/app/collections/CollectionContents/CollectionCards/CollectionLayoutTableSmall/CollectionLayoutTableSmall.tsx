import { useCardList } from '@/api/lists/useCardList.ts';
import { useCollectionCardTableColumns } from '@/components/app/collections/CollectionContents/CollectionCards/useCollectionCardTableColumns.tsx';
import { DataTable } from '@/components/ui/data-table.tsx';
import { CollectionLayout } from '@/components/app/collections/CollectionContents/CollectionSettings/useCollectionLayoutStore.ts';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll.ts';
import { useMemo } from 'react';

interface CollectionLayoutTableSmallProps {
  collectionId: string;
  cardKeys: string[];
  horizontal?: boolean;
  dataTransforming?: boolean;
}

const CollectionLayoutTableSmall: React.FC<CollectionLayoutTableSmallProps> = ({
  collectionId,
  cardKeys,
  horizontal = false,
  dataTransforming,
}) => {
  const { data: cardList, isFetching: isFetchingCardList } = useCardList();
  const columns = useCollectionCardTableColumns({
    collectionId,
    cardList: cardList?.cards,
    layout: CollectionLayout.TABLE_SMALL,
    forceHorizontal: horizontal,
  });

  // Setup infinite scroll
  const { itemsToShow, observerTarget } = useInfiniteScroll({
    totalItems: cardKeys.length,
    initialItemsToLoad: 50,
    itemsPerBatch: 30,
    threshold: 300,
  });

  // Get visible data
  const visibleCardKeys = useMemo(() => {
    return cardKeys.slice(0, itemsToShow);
  }, [cardKeys, itemsToShow]);

  const loading = isFetchingCardList || dataTransforming;

  return (
    <DataTable 
      columns={columns} 
      data={visibleCardKeys} 
      loading={loading} 
      infiniteScrollObserver={observerTarget}
    />
  );
};

export default CollectionLayoutTableSmall;

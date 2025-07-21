import { useCardList } from '@/api/lists/useCardList.ts';
import { DataTable } from '@/components/ui/data-table.tsx';
import { CollectionLayout } from '@/components/app/collections/CollectionContents/CollectionSettings/useCollectionLayoutStore.ts';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll.ts';
import { useMemo } from 'react';
import { useCollectionCardObjectsTableColumns } from '@/components/app/collections/CollectionContents/CollectionCards/useCollectionCardObjectsTableColumns.tsx';
import { CollectionCard } from '../../../../../../../../types/CollectionCard.ts';

interface CollectionLayoutTableSmallObjectsProps {
  collectionId: string;
  cards: CollectionCard[];
  horizontal?: boolean;
  dataTransforming?: boolean;
}

const CollectionLayoutTableSmallObjects: React.FC<CollectionLayoutTableSmallObjectsProps> = ({
  collectionId,
  cards,
  horizontal = false,
  dataTransforming,
}) => {
  const { data: cardList, isFetching: isFetchingCardList } = useCardList();
  const columns = useCollectionCardObjectsTableColumns({
    collectionId,
    cardList: cardList?.cards,
    layout: CollectionLayout.TABLE_SMALL,
    forceHorizontal: horizontal,
  });

  // Setup infinite scroll
  const { itemsToShow, observerTarget } = useInfiniteScroll({
    totalItems: cards.length,
    initialItemsToLoad: 50,
    itemsPerBatch: 30,
    threshold: 300,
  });

  // Get visible data
  const visibleCards = useMemo(() => {
    return cards.slice(0, itemsToShow);
  }, [cards, itemsToShow]);

  const loading = isFetchingCardList || dataTransforming;

  return (
    <DataTable
      columns={columns}
      data={visibleCards}
      loading={loading}
      infiniteScrollObserver={observerTarget}
    />
  );
};

export default CollectionLayoutTableSmallObjects;

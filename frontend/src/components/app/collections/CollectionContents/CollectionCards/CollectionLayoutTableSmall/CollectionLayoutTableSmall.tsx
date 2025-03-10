import { useCardList } from '@/api/lists/useCardList.ts';
import type { CollectionCard } from '../../../../../../../../types/CollectionCard.ts';
import { useCollectionCardTableColumns } from '@/components/app/collections/CollectionContents/CollectionCards/useCollectionCardTableColumns.tsx';
import { DataTable } from '@/components/ui/data-table.tsx';
import { CollectionLayout } from '@/components/app/collections/CollectionContents/CollectionSettings/useCollectionLayoutStore.ts';

interface CollectionLayoutTableSmallProps {
  collectionId: string;
  cards: CollectionCard[];
  horizontal?: boolean;
  dataTransforming?: boolean;
}

const CollectionLayoutTableSmall: React.FC<CollectionLayoutTableSmallProps> = ({
  collectionId,
  cards,
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

  const loading = isFetchingCardList || dataTransforming;

  return <DataTable columns={columns} data={cards} loading={loading} />;
};

export default CollectionLayoutTableSmall;

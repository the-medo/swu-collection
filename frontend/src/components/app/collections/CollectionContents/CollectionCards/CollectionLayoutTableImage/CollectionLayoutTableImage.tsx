import { useCardList } from '@/api/lists/useCardList.ts';
import { useCollectionCardTableColumns } from '@/components/app/collections/CollectionContents/CollectionCards/useCollectionCardTableColumns.tsx';
import { DataTable } from '@/components/ui/data-table.tsx';
import { CollectionLayout } from '@/components/app/collections/CollectionContents/CollectionSettings/useCollectionLayoutStore.ts';

interface CollectionLayoutTableImageProps {
  collectionId: string;
  cardKeys: string[];
  horizontal?: boolean;
  dataTransforming?: boolean;
}

const CollectionLayoutTableImage: React.FC<CollectionLayoutTableImageProps> = ({
  collectionId,
  cardKeys,
  horizontal = false,
  dataTransforming,
}) => {
  const { data: cardList, isFetching: isFetchingCardList } = useCardList();
  const columns = useCollectionCardTableColumns({
    collectionId,
    cardList: cardList?.cards,
    layout: CollectionLayout.TABLE_IMAGE,
    forceHorizontal: horizontal,
  });

  const loading = isFetchingCardList || dataTransforming;

  return <DataTable columns={columns} data={cardKeys} loading={loading} />;
};

export default CollectionLayoutTableImage;

import { useCardList } from '@/api/useCardList.ts';
import type { CollectionCard } from '../../../../../../../../types/CollectionCard.ts';
import { useCollectionCardTableColumns } from '@/components/app/collections/CollectionContents/CollectionCards/useCollectionCardTableColumns.tsx';
import { DataTable } from '@/components/ui/data-table.tsx';
import { CollectionLayout } from '@/components/app/collections/CollectionContents/CollectionSettings/useCollectionLayoutStore.ts';

interface CollectionLayoutTableImageProps {
  collectionId: string;
  cards: CollectionCard[];
  horizontal?: boolean;
}

const CollectionLayoutTableImage: React.FC<CollectionLayoutTableImageProps> = ({
  collectionId,
  cards,
  horizontal = false,
}) => {
  const { data: cardList, isFetching: isFetchingCardList } = useCardList();
  const columns = useCollectionCardTableColumns({
    collectionId,
    cardList: cardList?.cards,
    layout: CollectionLayout.TABLE_IMAGE,
    forceHorizontal: horizontal,
  });

  const loading = isFetchingCardList;

  return <DataTable columns={columns} data={cards} loading={loading} />;
};

export default CollectionLayoutTableImage;

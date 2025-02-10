import { useCardList } from '@/api/useCardList.ts';
import type { CollectionCard } from '../../../../../../../../types/CollectionCard.ts';
import { useCollectionCardTableColumns } from '@/components/app/collections/CollectionContents/CollectionCards/CollectionLayoutTableSmall/useCollectionCardTableColumns.tsx';
import { DataTable } from '@/components/ui/data-table.tsx';

interface CollectionLayoutTableSmallProps {
  cards: CollectionCard[];
  horizontal?: boolean;
}

const CollectionLayoutTableSmall: React.FC<CollectionLayoutTableSmallProps> = ({ cards }) => {
  const { data: cardList, isFetching: isFetchingCardList } = useCardList();
  const columns = useCollectionCardTableColumns({
    cardList: cardList?.cards,
    currency: 'Kč',
  });

  const loading = isFetchingCardList;

  return <DataTable columns={columns} data={cards} loading={loading} />;
};

export default CollectionLayoutTableSmall;

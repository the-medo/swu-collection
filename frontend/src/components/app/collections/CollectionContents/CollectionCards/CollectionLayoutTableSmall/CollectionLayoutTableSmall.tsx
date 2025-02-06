import { useCardList } from '@/api/useCardList.ts';
import type { CollectionCard } from '../../../../../../../../types/CollectionCard.ts';
import { Skeleton } from '@/components/ui/skeleton.tsx';

interface CollectionLayoutTableSmallProps {
  cards: CollectionCard[];
  horizontal?: boolean;
}

const CollectionLayoutTableSmall: React.FC<CollectionLayoutTableSmallProps> = ({ cards }) => {
  const { data: cardList, isFetching: isFetchingCardList } = useCardList();

  const loading = isFetchingCardList;

  return (
    <div className="flex gap-4 flex-wrap">
      {cards.map(c => {
        const card = cardList?.cards[c.cardId];

        if (loading) {
          return (
            <div className="w-full flex ">
              <Skeleton key={c.variantId} className="w-full rounded-md" />
            </div>
          );
        }

        return (
          <div className="w-full flex gap-4 ">
            <span className="font-medium">{card?.name}</span>
          </div>
        );
      })}
    </div>
  );
};

export default CollectionLayoutTableSmall;

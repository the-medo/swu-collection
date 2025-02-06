import { useCardList } from '@/api/useCardList.ts';
import CardImage, { cardImageVariants } from '@/components/app/global/CardImage.tsx';
import type { CollectionCard } from '../../../../../../../../types/CollectionCard.ts';
import { Skeleton } from '@/components/ui/skeleton.tsx';
import { cn } from '@/lib/utils.ts';

interface CollectionLayoutTableImageProps {
  cards: CollectionCard[];
  horizontal?: boolean;
}

const CollectionLayoutTableImage: React.FC<CollectionLayoutTableImageProps> = ({
  cards,
  horizontal = false,
}) => {
  const { data: cardList, isFetching: isFetchingCardList } = useCardList();

  const loading = isFetchingCardList;

  return (
    <div className="flex gap-4 flex-wrap">
      {cards.map(c => {
        const card = cardList?.cards[c.cardId];

        if (loading) {
          return (
            <div className="w-full flex gap-4 ">
              <Skeleton
                key={c.variantId}
                className={cn(
                  cardImageVariants({
                    size: 'w50',
                    horizontal: false,
                  }),
                  'rounded-lg',
                )}
              />
              <Skeleton key={c.variantId} className="w-full rounded-md" />
            </div>
          );
        }

        return (
          <div className="w-full flex gap-4 ">
            <CardImage
              card={card}
              cardVariantId={c.variantId}
              size="w50"
              foil={c.foil}
              forceHorizontal={horizontal}
            />
            <span className="font-medium">{card?.name}</span>
          </div>
        );
      })}
    </div>
  );
};

export default CollectionLayoutTableImage;

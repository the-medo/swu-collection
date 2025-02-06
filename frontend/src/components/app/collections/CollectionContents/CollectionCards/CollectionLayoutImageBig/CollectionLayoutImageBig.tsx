import { useCardList } from '@/api/useCardList.ts';
import CardImage, { cardImageVariants } from '@/components/app/global/CardImage.tsx';
import type { CollectionCard } from '../../../../../../../../types/CollectionCard.ts';
import { Skeleton } from '@/components/ui/skeleton.tsx';
import { cn } from '@/lib/utils.ts';

interface CollectionLayoutImageBigProps {
  cards: CollectionCard[];
  horizontal?: boolean;
}

const CollectionLayoutImageBig: React.FC<CollectionLayoutImageBigProps> = ({
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
            <Skeleton
              key={c.variantId}
              className={cn(
                cardImageVariants({
                  size: 'w200',
                  horizontal: horizontal,
                }),
                'rounded-lg',
              )}
            />
          );
        }

        return (
          <div className="max-w-[200px]" key={`${c.variantId}-${c.foil}`}>
            <CardImage
              card={card}
              cardVariantId={c.variantId}
              size="w200"
              foil={c.foil}
              forceHorizontal={horizontal}
            />
          </div>
        );
      })}
    </div>
  );
};

export default CollectionLayoutImageBig;

import { useCardList } from '@/api/useCardList.ts';
import CardImage, { cardImageVariants } from '@/components/app/global/CardImage.tsx';
import type { CollectionCard } from '../../../../../../../../types/CollectionCard.ts';
import { Skeleton } from '@/components/ui/skeleton.tsx';
import { cn } from '@/lib/utils.ts';
import CollectionCardHoverDetail from '@/components/app/collections/CollectionCardDetail/CollectionCardHoverDetail.tsx';
import { useCollectionInfo } from '@/components/app/collections/CollectionContents/CollectionSettings/useCollectionLayoutStore.ts';

interface CollectionLayoutImageSmallProps {
  collectionId: string;
  cards: CollectionCard[];
  horizontal?: boolean;
}

const CollectionLayoutImageSmall: React.FC<CollectionLayoutImageSmallProps> = ({
  collectionId,
  cards,
  horizontal = false,
}) => {
  const { currency } = useCollectionInfo(collectionId);
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
                  size: 'w100',
                  horizontal: horizontal,
                }),
                'rounded-lg',
              )}
            />
          );
        }

        return (
          <CollectionCardHoverDetail cardData={card} collectionId={collectionId} collectionCard={c}>
            <div
              className="max-w-[100px] flex flex-col gap-1 bg-gray-200 rounded-lg"
              key={`${c.variantId}-${c.foil}`}
            >
              <CardImage
                card={card}
                cardVariantId={c.variantId}
                size="w100"
                foil={c.foil}
                forceHorizontal={horizontal}
                backSideButton={false}
              >
                <div className="absolute bottom-0 right-0 w-fit flex flex-col grow-0 items-end mr-1 mb-1 bg-white opacity-90 rounded-lg">
                  <div className="font-medium text-sm px-2">{c.amount}x</div>
                </div>
              </CardImage>
              {c.price && (
                <div className="text-xs p-1 pt-0 text-gray-700 text-right">
                  {c.price} {currency}
                </div>
              )}
            </div>
          </CollectionCardHoverDetail>
        );
      })}
    </div>
  );
};

export default CollectionLayoutImageSmall;

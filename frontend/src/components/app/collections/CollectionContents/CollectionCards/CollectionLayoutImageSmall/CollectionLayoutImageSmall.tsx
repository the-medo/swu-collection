import { useCardList } from '@/api/lists/useCardList.ts';
import CardImage, { cardImageVariants } from '@/components/app/global/CardImage.tsx';
import { Skeleton } from '@/components/ui/skeleton.tsx';
import { cn } from '@/lib/utils.ts';
import CollectionCardHoverDetail from '@/components/app/collections/CollectionCardDetail/CollectionCardHoverDetail.tsx';
import { useCollectionInfo } from '@/components/app/collections/CollectionContents/CollectionSettings/useCollectionLayoutStore.ts';
import {
  useCCDetail,
  useCCCard,
} from '@/components/app/collections/CollectionContents/CollectionGroups/useCollectionGroupStore.ts';

interface CollectionLayoutImageSmallProps {
  collectionId: string;
  cardKeys: string[];
  horizontal?: boolean;
  dataTransforming?: boolean;
}

const CollectionLayoutImageSmall: React.FC<CollectionLayoutImageSmallProps> = ({
  collectionId,
  cardKeys,
  horizontal = false,
  dataTransforming,
}) => {
  const { currency } = useCollectionInfo(collectionId);
  const { isFetching: isFetchingCardList } = useCardList();

  const loading = isFetchingCardList || dataTransforming;

  return (
    <div className="flex gap-4 flex-wrap">
      {cardKeys.map(cardKey => {
        if (loading) {
          return (
            <Skeleton
              key={cardKey}
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

        const collectionCard = useCCDetail(cardKey);
        const card = useCCCard(cardKey);

        return (
          <CollectionCardHoverDetail
            key={cardKey}
            cardData={card}
            collectionId={collectionId}
            collectionCard={collectionCard}
          >
            <div
              className="max-w-[100px] flex flex-col gap-1 bg-secondary gray-200 rounded-lg"
              key={`${collectionCard.variantId}-${collectionCard.foil}`}
            >
              <CardImage
                card={card}
                cardVariantId={collectionCard.variantId}
                size="w100"
                foil={collectionCard.foil}
                forceHorizontal={horizontal}
                backSideButton={false}
              >
                <div className="absolute bottom-0 right-0 w-fit flex flex-col grow-0 items-end mr-1 mb-1 bg-background opacity-90 rounded-lg">
                  <div className="font-medium text-sm px-2">{collectionCard.amount}x</div>
                </div>
              </CardImage>
              {collectionCard.price && (
                <div className="text-xs p-1 pt-0 text-secondary-foreground text-right">
                  {collectionCard.price} {currency}
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

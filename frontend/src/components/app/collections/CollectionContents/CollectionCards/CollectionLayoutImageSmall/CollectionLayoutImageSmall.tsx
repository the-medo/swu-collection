import { useCardList } from '@/api/lists/useCardList.ts';
import { cardImageVariants } from '@/components/app/global/CardImage.tsx';
import { Skeleton } from '@/components/ui/skeleton.tsx';
import { cn } from '@/lib/utils.ts';
import { useCollectionInfo } from '@/components/app/collections/CollectionContents/CollectionSettings/useCollectionLayoutStore.ts';
import SmallCardItem from './SmallCardItem';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll.ts';
import { useMemo } from 'react';

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

  // Setup infinite scroll
  const { itemsToShow, observerTarget } = useInfiniteScroll({
    totalItems: cardKeys.length,
    initialItemsToLoad: 50,
    itemsPerBatch: 30,
    threshold: 300,
  });

  // Get visible data
  const visibleCardKeys = useMemo(() => {
    return cardKeys.slice(0, itemsToShow);
  }, [cardKeys, itemsToShow]);

  const loading = isFetchingCardList || dataTransforming;

  return (
    <div className="flex gap-4 flex-wrap">
      {visibleCardKeys.map(cardKey => {
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

        return (
          <SmallCardItem
            key={cardKey}
            cardKey={cardKey}
            collectionId={collectionId}
            horizontal={horizontal}
            currency={currency}
          />
        );
      })}
      <div ref={observerTarget} id="OBSERVER">
        {' '}
      </div>
    </div>
  );
};

export default CollectionLayoutImageSmall;

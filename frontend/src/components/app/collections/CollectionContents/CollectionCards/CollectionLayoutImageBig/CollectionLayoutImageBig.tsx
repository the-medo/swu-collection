import { useCardList } from '@/api/lists/useCardList.ts';
import { cardImageVariants } from '@/components/app/global/CardImage.tsx';
import { Skeleton } from '@/components/ui/skeleton.tsx';
import { cn } from '@/lib/utils.ts';
import { useCollectionInfo } from '@/components/app/collections/CollectionContents/CollectionSettings/useCollectionLayoutStore.ts';
import { useCollectionCardInput } from '@/components/app/collections/CollectionContents/components/useCollectionCardInput.ts';
import BigCardItem from './BigCardItem';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll.ts';
import { useMemo } from 'react';
import { useGetUserSetting } from '@/api/user/useGetUserSetting.ts';

interface CollectionLayoutImageBigProps {
  collectionId: string;
  cardKeys: string[];
  horizontal?: boolean;
  dataTransforming?: boolean;
}

const CollectionLayoutImageBig: React.FC<CollectionLayoutImageBigProps> = ({
  collectionId,
  cardKeys,
  horizontal = false,
  dataTransforming,
}) => {
  const { isFetching: isFetchingCardList } = useCardList();
  const { currency, owned } = useCollectionInfo(collectionId);
  const onChange = useCollectionCardInput(collectionId);
  const { data: priceSourceTypeCollection } = useGetUserSetting('priceSourceTypeCollection');

  // Setup infinite scroll
  const { itemsToShow, observerTarget } = useInfiniteScroll({
    totalItems: cardKeys.length,
    initialItemsToLoad: 30,
    itemsPerBatch: 20,
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
                  size: 'w200',
                  horizontal: horizontal,
                }),
                'rounded-lg',
              )}
            />
          );
        }

        return (
          <BigCardItem
            key={cardKey}
            collectionId={collectionId}
            cardKey={cardKey}
            horizontal={horizontal}
            currency={currency}
            owned={owned}
            onChange={onChange}
            priceSourceType={priceSourceTypeCollection}
          />
        );
      })}
      <div ref={observerTarget} id="OBSERVER">
        {' '}
      </div>
    </div>
  );
};

export default CollectionLayoutImageBig;

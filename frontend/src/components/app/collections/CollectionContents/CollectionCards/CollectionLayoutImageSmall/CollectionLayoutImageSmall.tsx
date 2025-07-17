import { useCardList } from '@/api/lists/useCardList.ts';
import { cardImageVariants } from '@/components/app/global/CardImage.tsx';
import { Skeleton } from '@/components/ui/skeleton.tsx';
import { cn } from '@/lib/utils.ts';
import { useCollectionInfo } from '@/components/app/collections/CollectionContents/CollectionSettings/useCollectionLayoutStore.ts';
import SmallCardItem from './SmallCardItem';

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
    </div>
  );
};

export default CollectionLayoutImageSmall;

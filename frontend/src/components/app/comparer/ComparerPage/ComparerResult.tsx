import * as React from 'react';
import { useMemo } from 'react';
import { useGetCollectionCards } from '@/api/collections/useGetCollectionCards';
import { useComparerStore } from '@/components/app/comparer/useComparerStore';
import { CollectionCard } from '../../../../../../types/CollectionCard';
import ItemTypeBadge from './ItemTypeBadge';
import CollectionLayoutTableSmallObjects from '@/components/app/collections/CollectionContents/CollectionCards/CollectionLayoutTableSmall/CollectionLayoutTableSmallObjects.tsx';

interface ComparerResultProps {
  mainCardsMap: Map<string, CollectionCard>;
  entry: ReturnType<typeof useComparerStore>['entries'][number];
}

/**
 * Component for comparing collections and displaying the intersection of cards
 */
const ComparerResult: React.FC<ComparerResultProps> = ({ mainCardsMap, entry }) => {
  const { data: otherCollection } = useGetCollectionCards(entry.id);

  // Calculate intersection
  const intersectionCards = useMemo(() => {
    const result: CollectionCard[] = [];

    if (otherCollection?.data && mainCardsMap.size > 0) {
      // Generate a unique key for each card
      const getCardKey = (card: CollectionCard) =>
        `${card.cardId}|${card.variantId}|${card.foil}|${card.condition}|${card.language}`;

      // Find intersections
      otherCollection.data.forEach(otherCard => {
        const key = getCardKey(otherCard);
        const mainCard = mainCardsMap.get(key);

        if (mainCard) {
          // Card exists in both collections - take the lesser amount
          const intersectionCard: CollectionCard = {
            ...mainCard,
            amount: Math.min(mainCard.amount, otherCard.amount),
          };

          result.push(intersectionCard);
        }
      });
    }

    return result;
  }, [otherCollection, mainCardsMap]);

  return (
    <div className="p-4">
      <h3 className="flex gap-4 text-lg font-semibold mb-4">
        Comparison with {entry.additionalData?.title ?? '- Unknown -'}
        <ItemTypeBadge entry={entry} />
      </h3>

      <div className="mb-2">
        <span className="text-sm font-medium">{intersectionCards.length} cards in common</span>
      </div>

      {intersectionCards.length ? (
        <CollectionLayoutTableSmallObjects collectionId={entry.id} cards={intersectionCards} />
      ) : null}
    </div>
  );
};

export default ComparerResult;

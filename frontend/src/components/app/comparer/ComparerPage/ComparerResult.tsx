import * as React from 'react';
import { useMemo } from 'react';
import { useGetCollectionCards } from '@/api/collections/useGetCollectionCards';
import { useComparerStore } from '@/components/app/comparer/useComparerStore';
import { CollectionCard } from '../../../../../../types/CollectionCard';
import ItemTypeBadge from './ItemTypeBadge';
import CollectionLayoutTableSmallObjects from '@/components/app/collections/CollectionContents/CollectionCards/CollectionLayoutTableSmall/CollectionLayoutTableSmallObjects.tsx';

import { workspaceStyles } from '@/components/app/global/WorkspacePage/workspaceStyles.ts';
import { cn } from '@/lib/utils.ts';

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
    <section className={cn(workspaceStyles.panel, 'overflow-hidden')}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--workspace-border)] bg-[var(--workspace-soft)] px-3 py-2">
        <h2 className={cn(workspaceStyles.heading, 'flex flex-wrap items-center gap-2')}>
          Comparison with {entry.additionalData?.title ?? '- Unknown -'}
          <ItemTypeBadge entry={entry} />
        </h2>

        <div>
          <span className="text-sm font-medium">
            {intersectionCards.length} {intersectionCards.length === 1 ? 'card' : 'cards'} in common
          </span>
        </div>
      </div>
      <div className="overflow-x-auto p-2">
        {intersectionCards.length ? (
          <CollectionLayoutTableSmallObjects collectionId={entry.id} cards={intersectionCards} />
        ) : null}
      </div>
    </section>
  );
};

export default ComparerResult;

import * as React from 'react';
import { useCallback, useMemo } from 'react';
import { useCardList } from '@/api/lists/useCardList';
import { SortField, SearchCardData, useSearchCardTableColumns } from './useSearchCardTableColumns';
import { DataTable } from '@/components/ui/data-table';
import { selectDefaultVariant } from '../../../../../../../server/lib/cards/selectDefaultVariant.ts';
import CardImage from '@/components/app/global/CardImage';
import { cn } from '@/lib/utils';
import { raritySortValues } from '@/components/app/collections/CollectionContents/CollectionGroups/lib/sortCardsByCardRarity.ts';
import { useAdvancedCardSearchStore } from '@/components/app/cards/AdvancedCardSearch/useAdvancedCardSearchStore.ts';
import { Loader2 } from 'lucide-react';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll.ts';
import {
  CardDataWithVariants,
  CardListVariants,
} from '../../../../../../../lib/swu-resources/types.ts';

export type CardLayoutType =
  | 'imageBig'
  | 'imageMedium'
  | 'imageSmall'
  | 'tableImage'
  | 'tableSmall';

export interface CardLayoutProps {
  searchResults: string[];
  onCardClick: (cardId: string) => void;
}

export interface SearchCardLayoutProps extends CardLayoutProps {
  layoutType: CardLayoutType;
  cardSubcomponent?: (card: CardDataWithVariants<CardListVariants> | undefined) => React.ReactNode;
}

const SearchCardLayout: React.FC<SearchCardLayoutProps> = ({
  searchResults,
  onCardClick,
  layoutType,
  cardSubcomponent,
}) => {
  const { data: cardListData } = useCardList();
  const { sortField, sortOrder, setSortField, setSortOrder } = useAdvancedCardSearchStore();

  // Sort cards based on sortField and sortOrder
  const sortedResults = useMemo(() => {
    if (!cardListData) return searchResults;

    return [...searchResults].sort((a, b) => {
      const cardA = cardListData.cards[a];
      const cardB = cardListData.cards[b];

      if (!cardA || !cardB) return 0;

      let comparison = 0;

      if (sortField === 'name') {
        comparison = cardA.name.localeCompare(cardB.name);
      } else if (sortField === 'type') {
        comparison = cardA.type.localeCompare(cardB.type);
      } else if (sortField === 'rarity') {
        // Sort by rarity importance (legendary first, common last)
        const rarityValueA = raritySortValues[cardA.rarity] || 50; // Default high value for unknown rarity
        const rarityValueB = raritySortValues[cardB.rarity] || 50;
        comparison = rarityValueA - rarityValueB;
      } else if (sortField === 'cardNumber') {
        // Get default variants for both cards to extract card numbers
        const variantA = cardA.variants[selectDefaultVariant(cardA) || ''];
        const variantB = cardB.variants[selectDefaultVariant(cardB) || ''];

        if (variantA && variantB) {
          // First compare by set
          const setComparison = variantA.set.localeCompare(variantB.set);
          if (setComparison !== 0) return sortOrder === 'asc' ? setComparison : -setComparison;

          // Then compare by card number
          comparison = variantA.cardNo - variantB.cardNo;
        }
      } else if (sortField === 'cost') {
        const costA = cardA.cost !== null ? cardA.cost : Infinity;
        const costB = cardB.cost !== null ? cardB.cost : Infinity;
        comparison = costA - costB;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [cardListData, searchResults, sortField, sortOrder]);

  // Configure infinite scrolling
  // Grid layouts need more initial items but smaller batches for smooth scrolling
  const isGridLayout =
    layoutType === 'imageBig' || layoutType === 'imageMedium' || layoutType === 'imageSmall';
  const initialItemsToLoad = isGridLayout ? 60 : 40;
  const itemsPerBatch = isGridLayout ? 30 : 20;

  const { itemsToShow, isLoading, hasMore, observerTarget } = useInfiniteScroll({
    totalItems: sortedResults.length,
    initialItemsToLoad,
    itemsPerBatch,
    threshold: 300,
  });

  // Only take the subset of results we want to display
  const visibleResults = useMemo(() => {
    return sortedResults.slice(0, itemsToShow);
  }, [sortedResults, itemsToShow]);

  // Memoize the data transformation for the table
  const tableData = useMemo<SearchCardData[]>(() => {
    return visibleResults.map(cardId => ({ cardId }));
  }, [visibleResults]);

  const onSortChange = useCallback(
    (field: SortField) => {
      if (field === sortField) {
        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
      } else {
        setSortField(field);
        setSortOrder('asc');
      }
    },
    [sortField, sortOrder],
  );

  // Get columns for the table
  const columns = useSearchCardTableColumns({
    layoutType,
    sortField,
    sortOrder,
    onSort: onSortChange,
    cardSubcomponent,
  });

  if (!cardListData) {
    return <div>Loading card data...</div>;
  }

  return (
    <div className="w-full">
      {/* Card display */}
      {layoutType === 'imageBig' || layoutType === 'imageMedium' || layoutType === 'imageSmall' ? (
        <div className="relative">
          <div className={cn('flex flex-row flex-wrap gap-2')}>
            {visibleResults.map(cardId => {
              const card = cardListData.cards[cardId];
              if (!card) return null;

              const defaultVariant = selectDefaultVariant(card);

              return (
                <div
                  key={cardId}
                  className={cn('cursor-pointer  flex flex-col items-center border p-1', {
                    'hover:scale-105 transition-transform': !cardSubcomponent,
                  })}
                  onClick={() => onCardClick(cardId)}
                >
                  <CardImage
                    card={card}
                    cardVariantId={defaultVariant}
                    size={
                      layoutType === 'imageBig'
                        ? 'w300'
                        : layoutType === 'imageMedium'
                          ? 'w200'
                          : 'w100'
                    }
                    backSideButton={false}
                  >
                    {cardSubcomponent && (
                      <div className="absolute top-0 -right-3 px-2 z-10 b-1 border-2 border-foreground/30 bg-background/80 rounded flex flex-col items-end">
                        {cardSubcomponent(card) ?? null}
                      </div>
                    )}
                  </CardImage>
                  <div
                    className={cn('mt-1 text-sm font-medium text-center w-full', {
                      'w-[300px]': layoutType === 'imageBig',
                      'w-[200px]': layoutType === 'imageMedium',
                      'w-[100px]': layoutType === 'imageSmall',
                    })}
                    title={card.name}
                  >
                    {card.name}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Loading indicator and sentinel for infinite scroll */}
          <div ref={observerTarget} className="h-4 mt-4 flex justify-center items-center">
            {isLoading && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
                <span>Loading more cards...</span>
              </div>
            )}
          </div>

          {/* Show a "no more cards" message when all are loaded */}
          {!hasMore && sortedResults.length > initialItemsToLoad && (
            <div className="text-center text-muted-foreground p-4">
              All {sortedResults.length} cards loaded
            </div>
          )}
        </div>
      ) : (
        <div className="relative">
          <DataTable
            columns={columns}
            data={tableData}
            onRowClick={row => onCardClick(row.original.cardId)}
          />

          {/* Loading indicator and sentinel for infinite scroll */}
          <div ref={observerTarget} className="h-4 mt-4 flex justify-center items-center">
            {isLoading && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
                <span>Loading more cards...</span>
              </div>
            )}
          </div>

          {/* Show a message for table views too */}
          {!hasMore && sortedResults.length > initialItemsToLoad && (
            <div className="text-center text-muted-foreground p-4">
              All {sortedResults.length} cards loaded
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchCardLayout;

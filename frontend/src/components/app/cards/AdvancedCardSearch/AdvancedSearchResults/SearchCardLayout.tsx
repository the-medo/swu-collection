import * as React from 'react';
import { useCallback, useMemo } from 'react';
import { useCardList } from '@/api/lists/useCardList';
import { SortField, SearchCardData, useSearchCardTableColumns } from './useSearchCardTableColumns';
import { DataTable } from '@/components/ui/data-table';
import { selectDefaultVariant } from '@/lib/cards/selectDefaultVariant';
import CardImage from '@/components/app/global/CardImage';
import { cn } from '@/lib/utils';
import { raritySortValues } from '@/components/app/collections/CollectionContents/CollectionGroups/lib/sortCardsByCardRarity.ts';
import { useAdvancedCardSearchStore } from '@/components/app/cards/AdvancedCardSearch/useAdvancedCardSearchStore.ts';

export type CardLayoutType = 'imageBig' | 'imageSmall' | 'tableImage' | 'tableSmall';

export interface CardLayoutProps {
  searchResults: string[];
  onCardClick: (cardId: string) => void;
}

export interface SearchCardLayoutProps extends CardLayoutProps {
  layoutType: CardLayoutType;
}

const SearchCardLayout: React.FC<SearchCardLayoutProps> = ({
  searchResults,
  onCardClick,
  layoutType,
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

  // Memoize the data transformation for the table
  const tableData = useMemo<SearchCardData[]>(() => {
    return sortedResults.map(cardId => ({ cardId }));
  }, [sortedResults]);

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
  });

  if (!cardListData) {
    return <div>Loading card data...</div>;
  }

  return (
    <div className="w-full">
      {/* Card display */}
      {layoutType === 'imageBig' || layoutType === 'imageSmall' ? (
        <div
          className={cn('grid gap-4', {
            'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6':
              layoutType === 'imageBig',
            'grid-cols-3 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10':
              layoutType === 'imageSmall',
          })}
        >
          {sortedResults.map(cardId => {
            const card = cardListData.cards[cardId];
            if (!card) return null;

            const defaultVariant = selectDefaultVariant(card);

            return (
              <div
                key={cardId}
                className="cursor-pointer hover:scale-105 transition-transform flex flex-col items-center"
                onClick={() => onCardClick(cardId)}
              >
                <CardImage
                  card={card}
                  cardVariantId={defaultVariant}
                  size={layoutType === 'imageBig' ? 'w200' : 'w100'}
                  backSideButton={false}
                />
                <div
                  className="mt-1 text-sm font-medium text-center truncate w-full"
                  title={card.name}
                >
                  {card.name}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={tableData}
          onRowClick={row => onCardClick(row.original.cardId)}
        />
      )}
    </div>
  );
};

export default SearchCardLayout;

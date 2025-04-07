import { ColumnDef } from '@tanstack/react-table';
import { useCardList } from '@/api/lists/useCardList';
import { useMemo } from 'react';
import AspectIcon from '@/components/app/global/icons/AspectIcon';
import CostIcon from '@/components/app/global/icons/CostIcon';
import RarityIcon from '@/components/app/global/icons/RarityIcon';
import { selectDefaultVariant } from '../../../../../../../server/lib/cards/selectDefaultVariant.ts';
import CardImage from '@/components/app/global/CardImage';
import { CardLayoutType } from '@/components/app/cards/AdvancedCardSearch/AdvancedSearchResults/SearchCardLayout.tsx';

export type SearchCardData = {
  cardId: string;
};

export type SortField = 'name' | 'cardNumber' | 'cost' | 'type' | 'rarity';
export type SortOrder = 'asc' | 'desc';

export type SearchCardTableColumnsProps = {
  layoutType: CardLayoutType;
  sortField?: SortField;
  sortOrder?: SortOrder;
  onSort?: (field: SortField) => void;
};

export function useSearchCardTableColumns({
  layoutType,
  sortField = 'name',
  sortOrder = 'asc',
  onSort,
}: SearchCardTableColumnsProps): ColumnDef<SearchCardData>[] {
  const { data: cardListData } = useCardList();
  const showImage = layoutType === 'tableImage';

  return useMemo(() => {
    const definitions: ColumnDef<SearchCardData>[] = [];

    if (showImage) {
      definitions.push({
        id: 'image',
        header: '',
        size: 75,
        cell: ({ row }) => {
          const cardId = row.original.cardId;
          const card = cardListData?.cards[cardId];
          if (!card) return null;

          const defaultVariant = selectDefaultVariant(card);

          return (
            <div className="flex items-center justify-center">
              <CardImage
                card={card}
                cardVariantId={defaultVariant}
                size="w50"
                backSideButton={false}
              />
            </div>
          );
        },
      });
    }

    // Name column
    definitions.push({
      id: 'name',
      accessorFn: row => cardListData?.cards[row.cardId]?.name,
      header: () => (
        <div
          className={`cursor-pointer ${sortField === 'name' ? 'font-bold' : ''}`}
          onClick={() => onSort?.('name')}
        >
          Name
          {sortField === 'name' && <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>}
        </div>
      ),
      cell: ({ row }) => {
        const cardId = row.original.cardId;
        const card = cardListData?.cards[cardId];
        if (!card) return null;

        return (
          <div>
            <div className="font-medium">{card.name}</div>
            {layoutType === 'tableImage' && (
              <div className="text-xs text-muted-foreground">
                {card.traits.length > 0 ? card.traits.join(', ') : ''}
              </div>
            )}
          </div>
        );
      },
    });

    // Type column
    definitions.push({
      id: 'type',
      accessorFn: row => cardListData?.cards[row.cardId]?.type,
      header: () => (
        <div
          className={`cursor-pointer ${sortField === 'type' ? 'font-bold' : ''}`}
          onClick={() => onSort?.('type')}
        >
          Type
          {sortField === 'type' && <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>}
        </div>
      ),
      cell: ({ row }) => {
        const cardId = row.original.cardId;
        const card = cardListData?.cards[cardId];
        if (!card) return null;

        return (
          <div>
            <div>{card.type}</div>
            {layoutType === 'tableImage' && card.arenas.length > 0 && (
              <div className="text-xs text-muted-foreground">{card.arenas.join(', ')}</div>
            )}
          </div>
        );
      },
    });

    // Only include the aspects column if not in tableImage layout
    // In tableImage, we'll show aspects in the cost column
    if (layoutType !== 'tableImage') {
      // Aspects column
      definitions.push({
        id: 'aspects',
        header: 'Aspects',
        cell: ({ row }) => {
          const cardId = row.original.cardId;
          const card = cardListData?.cards[cardId];
          if (!card) return null;

          return (
            <div className="flex gap-1 justify-center">
              {card.aspects.map((aspect, index) => (
                <AspectIcon key={`${aspect}-${index}`} aspect={aspect} size="small" />
              ))}
            </div>
          );
        },
      });
    }

    // Cost column
    definitions.push({
      id: 'cost',
      accessorFn: row => {
        const card = cardListData?.cards[row.cardId];
        return card?.cost !== null ? card?.cost : 999; // Sort null costs at the end
      },
      header: () => (
        <div
          className={`cursor-pointer ${sortField === 'cost' ? 'font-bold' : ''}`}
          onClick={() => onSort?.('cost')}
        >
          Cost
          {sortField === 'cost' && <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>}
        </div>
      ),
      cell: ({ row }) => {
        const cardId = row.original.cardId;
        const card = cardListData?.cards[cardId];
        if (!card) return null;

        return (
          <div>
            {card.cost !== null ? (
              <div className="flex justify-center">
                <CostIcon cost={card.cost} size="small" />
              </div>
            ) : null}

            {layoutType === 'tableImage' && (
              <div className="flex gap-1 justify-center mt-1">
                {card.aspects.map((aspect, index) => (
                  <AspectIcon key={`${aspect}-${index}`} aspect={aspect} size="small" />
                ))}
              </div>
            )}
          </div>
        );
      },
    });

    // Rarity column
    definitions.push({
      id: 'rarity',
      accessorFn: row => cardListData?.cards[row.cardId]?.rarity,
      header: () => (
        <div
          className={`cursor-pointer ${sortField === 'rarity' ? 'font-bold' : ''}`}
          onClick={() => onSort?.('rarity')}
        >
          Rarity
          {sortField === 'rarity' && (
            <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
          )}
        </div>
      ),
      cell: ({ row }) => {
        const cardId = row.original.cardId;
        const card = cardListData?.cards[cardId];
        if (!card) return null;

        return (
          <div className="flex justify-center">
            <RarityIcon rarity={card.rarity} size="small" />
          </div>
        );
      },
    });

    // Set/Number column
    definitions.push({
      id: 'setNumber',
      accessorFn: row => {
        const card = cardListData?.cards[row.cardId];
        if (!card) return '';
        const defaultVariant = selectDefaultVariant(card) ?? '';
        const variant = card.variants[defaultVariant];
        return `${variant?.set.toUpperCase() || ''}-${variant?.cardNo.toString().padStart(3, '0') || ''}`;
      },
      header: () => (
        <div
          className={`cursor-pointer ${sortField === 'cardNumber' ? 'font-bold' : ''}`}
          onClick={() => onSort?.('cardNumber')}
        >
          Set/No
          {sortField === 'cardNumber' && (
            <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
          )}
        </div>
      ),
      cell: ({ row }) => {
        const cardId = row.original.cardId;
        const card = cardListData?.cards[cardId];
        if (!card) return null;

        const defaultVariant = selectDefaultVariant(card);
        if (!defaultVariant) return null;

        const variant = card.variants[defaultVariant];
        if (!variant) return null;

        return (
          <div className="flex flex-col items-center text-xs">
            <div>{variant.set.toUpperCase()}</div>
            <div>#{variant.cardNo}</div>
          </div>
        );
      },
    });

    return definitions;
  }, [cardListData, onSort, showImage, sortField, sortOrder]);
}

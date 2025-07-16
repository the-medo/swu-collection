import { useMemo } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { useCurrencyList } from '@/api/lists/useCurrencyList.ts';
import { CardList } from '../../../../../../../lib/swu-resources/types.ts';
import {
  CollectionLayout,
  CollectionSortBy,
  useCollectionInfo,
  useCollectionLayoutStoreActions,
} from '@/components/app/collections/CollectionContents/CollectionSettings/useCollectionLayoutStore.ts';

// Import table cell components
import AmountCell from './table-components/AmountCell';
import ImageCell from './table-components/ImageCell';
import CostCell from './table-components/CostCell';
import CardCell from './table-components/CardCell';
import VariantCell from './table-components/VariantCell';
import FoilCell from './table-components/FoilCell';
import LanguageCell from './table-components/LanguageCell';
import ConditionCell from './table-components/ConditionCell';
import CardNoCell from './table-components/CardNoCell';
import SetCell from './table-components/SetCell';
import RarityCell from './table-components/RarityCell';
import NoteCell from './table-components/NoteCell';
import PriceCell from './table-components/PriceCell';
import { useCollectionCardInput } from '@/components/app/collections/CollectionContents/components/useCollectionCardInput.ts';

interface CollectionCardTableColumnsProps {
  collectionId: string;
  cardList: CardList | undefined;
  layout: CollectionLayout | 'table-duplicate';
  forceHorizontal?: boolean;
}

export function useCollectionCardTableColumns({
  collectionId,
  cardList,
  layout,
  forceHorizontal = false,
}: CollectionCardTableColumnsProps): ColumnDef<string>[] {
  const { setSortBy } = useCollectionLayoutStoreActions();
  const { data: currencyData } = useCurrencyList();
  const { currency, owned } = useCollectionInfo(collectionId);
  const onChange = useCollectionCardInput(collectionId);

  return useMemo(() => {
    const definitions: ColumnDef<string>[] = [];

    if (layout === CollectionLayout.TABLE_IMAGE) {
      definitions.push({
        id: 'image',
        accessorFn: cardKey => cardKey,
        header: '',
        size: 12,
        cell: ({ row }) => {
          return <ImageCell cardKey={row.original} forceHorizontal={forceHorizontal} />;
        },
      });
    }

    definitions.push({
      id: 'amount',
      accessorFn: cardKey => cardKey,
      header: () => (
        <div className="cursor-pointer" onClick={() => setSortBy([CollectionSortBy.QUANTITY])}>
          Qty
        </div>
      ),
      size: 4,
      cell: ({ row }) => {
        return <AmountCell cardKey={row.original} collectionId={collectionId} owned={owned} onChange={onChange} />;
      },
    });

    if (layout === CollectionLayout.TABLE_SMALL) {
      definitions.push({
        id: 'cost',
        accessorFn: cardKey => cardKey,
        header: () => (
          <div className="cursor-pointer" onClick={() => setSortBy([CollectionSortBy.CARD_COST])}>
            Cost
          </div>
        ),
        size: 16,
        cell: ({ row }) => {
          return <CostCell cardKey={row.original} />;
        },
      });
    }

    if (layout !== 'table-duplicate') {
      definitions.push({
        id: 'cardId',
        accessorFn: cardKey => cardKey,
        header: () => (
          <div className="cursor-pointer" onClick={() => setSortBy([CollectionSortBy.CARD_NAME])}>
            Card
          </div>
        ),
        cell: ({ row }) => {
          return <CardCell cardKey={row.original} layout={layout} />;
        },
      });
    }

    definitions.push({
      id: 'variantId',
      accessorFn: cardKey => cardKey,
      header: () => (
        <div className="cursor-pointer" onClick={() => setSortBy([CollectionSortBy.VARIANT_NAME])}>
          Variant
        </div>
      ),
      size: 16,
      cell: ({ row }) => {
        return <VariantCell cardKey={row.original} />;
      },
    });

    definitions.push({
      id: 'foil',
      accessorFn: cardKey => cardKey,
      header: 'F',
      size: 4,
      cell: ({ row }) => {
        return <FoilCell cardKey={row.original} />;
      },
    });

    definitions.push({
      id: 'language',
      accessorFn: cardKey => cardKey,
      header: 'Lang.',
      size: 12,
      cell: ({ row }) => {
        return <LanguageCell cardKey={row.original} />;
      },
    });

    definitions.push({
      id: 'condition',
      accessorFn: cardKey => cardKey,
      header: 'Cond.',
      size: 8,
      cell: ({ row }) => {
        return <ConditionCell cardKey={row.original} />;
      },
    });

    if (layout !== 'table-duplicate') {
      definitions.push({
        id: 'cardNo',
        accessorFn: cardKey => cardKey,
        header: () => (
          <div className="cursor-pointer" onClick={() => setSortBy([CollectionSortBy.CARD_NUMBER])}>
            No.
          </div>
        ),
        size: 8,
        cell: ({ row }) => {
          return <CardNoCell cardKey={row.original} />;
        },
      });
    }

    definitions.push({
      id: 'set',
      accessorFn: cardKey => cardKey,
      header: 'Set',
      size: 8,
      cell: ({ row }) => {
        return <SetCell cardKey={row.original} />;
      },
    });

    if (layout !== 'table-duplicate') {
      definitions.push({
        id: 'rarity',
        accessorFn: cardKey => cardKey,
        header: () => (
          <div className="cursor-pointer" onClick={() => setSortBy([CollectionSortBy.RARITY])}>
            R.
          </div>
        ),
        size: 4,
        cell: ({ row }) => {
          return <RarityCell cardKey={row.original} />;
        },
      });
    }

    definitions.push({
      id: 'note',
      accessorFn: cardKey => cardKey,
      header: 'Note',
      size: 20,
      cell: ({ row }) => {
        return <NoteCell cardKey={row.original} collectionId={collectionId} owned={owned} onChange={onChange} />;
      },
    });

    definitions.push({
      id: 'price',
      accessorFn: cardKey => cardKey,
      header: () => (
        <div className="cursor-pointer" onClick={() => setSortBy([CollectionSortBy.PRICE])}>
          Price
        </div>
      ),
      size: owned ? 32 : 20,
      cell: ({ row }) => {
        return (
          <PriceCell
            cardKey={row.original}
            collectionId={collectionId}
            owned={owned}
            currency={currency}
            onChange={onChange}
          />
        );
      },
    });

    return definitions;
  }, [cardList, currencyData, currency, owned, layout, forceHorizontal]);
}

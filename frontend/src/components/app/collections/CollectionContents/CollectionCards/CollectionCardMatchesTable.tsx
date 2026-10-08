import { createContext, useContext, useMemo } from 'react';
import { Check } from 'lucide-react';
import type { CellContext, ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/ui/data-table.tsx';
import CollectionCardInput, {
  type CollectionCardInputOnChange,
} from '@/components/app/collections/CollectionContents/components/CollectionCardInput.tsx';
import { useCollectionCardInput } from '@/components/app/collections/CollectionContents/components/useCollectionCardInput.ts';
import {
  getCollectionCardIdentificationKey,
  type CollectionCardIdentification,
} from '@/api/collections/usePutCollectionCard.ts';
import { foilRenderer } from '@/lib/table/foilRenderer.tsx';
import { languageRenderer } from '@/lib/table/languageRenderer.tsx';
import { conditionRenderer } from '@/lib/table/conditionRenderer.tsx';
import { PriceBadge } from '@/components/app/card-prices/PriceBadge.tsx';
import { useGetUserSetting } from '@/api/user/useGetUserSetting.ts';
import type {
  CollectionCardLookupList,
  CollectionCardLookupRow,
} from '../../../../../../../shared/types/CollectionCardLookup.ts';
import type {
  CardDataWithVariants,
  CardListVariants,
} from '../../../../../../../lib/swu-resources/types.ts';
import { CardLanguage } from '../../../../../../../types/enums.ts';
import { CardPriceSourceType, cardPriceSourceInfo } from '../../../../../../../types/CardPrices.ts';

type EditableField = 'amount' | 'amount2' | 'note' | 'price';
type MatchCellProps = CellContext<CollectionCardLookupRow, unknown>;
type MatchContext = {
  card: CardDataWithVariants<CardListVariants>;
  collectionId: string;
  currency: string;
  onChange: CollectionCardInputOnChange;
  priceSource: CardPriceSourceType | undefined;
  selectedVariantId: string | undefined;
};
const MatchContext = createContext<MatchContext | null>(null);
function useMatchContext() {
  const context = useContext(MatchContext);
  if (!context) throw new Error('Card matches must be rendered inside their list table.');
  return context;
}
const fieldLabels: Record<EditableField, string> = {
  amount: 'Quantity',
  amount2: 'Quantity 2',
  note: 'Note',
  price: 'Price',
};
const getLanguage = (language: string | null) =>
  Object.values(CardLanguage).find(l => l === language);
const getRowId = (row: CollectionCardLookupRow) =>
  `${row.cardId}:${row.variantId}:${row.foil}:${row.condition}:${row.language}`;

// Stable cell components keep pending edits mounted when optional columns appear or disappear.
const amountColumn: ColumnDef<CollectionCardLookupRow> = {
  accessorKey: 'amount',
  header: 'Qty',
  cell: function AmountCell({ row }: MatchCellProps) {
    return <CardMatchInput row={row.original} field="amount" />;
  },
};
const amount2Column: ColumnDef<CollectionCardLookupRow> = {
  accessorKey: 'amount2',
  header: 'Qty 2',
  cell: function Amount2Cell({ row }: MatchCellProps) {
    return <CardMatchInput row={row.original} field="amount2" />;
  },
};
const detailColumns: ColumnDef<CollectionCardLookupRow>[] = [
  { accessorKey: 'variantId', header: 'Variant', cell: VariantCell },
  { accessorKey: 'foil', header: 'F', cell: ({ row }) => foilRenderer(row.original.foil) },
  {
    accessorKey: 'language',
    header: 'Lang.',
    cell: ({ row }) => {
      const language = getLanguage(row.original.language);
      return language ? languageRenderer(language) : (row.original.language ?? '-');
    },
  },
  {
    accessorKey: 'condition',
    header: 'Cond.',
    cell: ({ row }) => conditionRenderer(row.original.condition),
  },
  {
    accessorKey: 'note',
    header: 'Note',
    cell: function NoteCell({ row }: MatchCellProps) {
      return <CardMatchInput row={row.original} field="note" />;
    },
  },
];
const priceColumn: ColumnDef<CollectionCardLookupRow> = {
  accessorKey: 'price',
  header: 'Price',
  cell: PriceCell,
};
const PriceSourceCell = ({ row }: MatchCellProps) => {
  const { priceSource } = useMatchContext();
  return priceSource ? (
    <PriceBadge
      cardId={row.original.cardId}
      variantId={row.original.variantId}
      sourceType={priceSource}
      displayLogo
      displayTooltip
      size="sm"
    />
  ) : null;
};

/** Uses the collection-detail table, renderers and editable inputs without its singleton row store. */
export default function CollectionCardMatchesTable({
  list,
  card,
  currency,
  selectedVariantId,
}: {
  list: CollectionCardLookupList;
  card: CardDataWithVariants<CardListVariants>;
  currency: string;
  selectedVariantId?: string;
}) {
  const collectionId = list.collection.id;
  const onChange = useCollectionCardInput(collectionId);
  const { data: priceSourceSetting } = useGetUserSetting('priceSourceTypeCollection');
  const priceSource = priceSourceSetting as CardPriceSourceType | undefined;
  const showAmount2 = list.cards.some(row => row.amount2 !== null);
  const columns = useMemo<ColumnDef<CollectionCardLookupRow>[]>(
    () => [
      amountColumn,
      ...(showAmount2 ? [amount2Column] : []),
      ...detailColumns,
      ...(priceSource
        ? [
            {
              id: 'price-source-extra',
              header: cardPriceSourceInfo[priceSource]?.name ?? 'Price Source',
              cell: PriceSourceCell,
            },
          ]
        : []),
      priceColumn,
    ],
    [priceSource, showAmount2],
  );
  const context = useMemo(
    () => ({ card, collectionId, currency, onChange, priceSource, selectedVariantId }),
    [card, collectionId, currency, onChange, priceSource, selectedVariantId],
  );

  return (
    <MatchContext.Provider value={context}>
      <div
        role="region"
        aria-label={`Cards in ${list.collection.title}`}
        tabIndex={0}
        className="max-w-full overflow-x-auto rounded-md outline-offset-2"
      >
        <DataTable
          columns={columns}
          data={list.cards}
          getRowId={getRowId}
          cellClassName="py-1.5"
          isRowHighlighted={row => row.original.variantId === selectedVariantId}
        />
      </div>
    </MatchContext.Provider>
  );
}

function VariantCell({ row }: MatchCellProps) {
  const { card, selectedVariantId } = useMatchContext();
  const variant = card.variants[row.original.variantId];
  return (
    <div className="min-w-20 space-y-0.5" title={variant?.variantName}>
      <div className="flex items-center gap-1 text-sm text-muted-foreground">
        {variant?.variantName ?? row.original.variantId}
        {row.original.variantId === selectedVariantId && (
          <span title="Selected variant">
            <Check className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            <span className="sr-only">Selected variant</span>
          </span>
        )}
      </div>
      {variant && (
        <div className="whitespace-nowrap text-xs text-muted-foreground">
          {variant.set.toUpperCase()} #{variant.cardNo}
        </div>
      )}
    </div>
  );
}
function PriceCell({ row }: MatchCellProps) {
  const { currency } = useMatchContext();
  return (
    <div className="flex w-32 items-center justify-end gap-2">
      <CardMatchInput row={row.original} field="price" />
      <span>{row.original.price !== null ? currency : '-'}</span>
    </div>
  );
}
function CardMatchInput({ row, field }: { row: CollectionCardLookupRow; field: EditableField }) {
  const { collectionId, onChange } = useMatchContext();
  const id = useMemo<CollectionCardIdentification | undefined>(() => {
    const language = getLanguage(row.language);
    return language
      ? {
          cardId: row.cardId,
          variantId: row.variantId,
          foil: row.foil,
          condition: row.condition,
          language,
        }
      : undefined;
  }, [row.cardId, row.variantId, row.foil, row.condition, row.language]);
  if (!id) return <span>{row[field] ?? '-'}</span>;
  const inputId = `${collectionId}:${getCollectionCardIdentificationKey(id)}:${field}`;
  const inputProps = { id, inputId, onChange };
  return (
    <div className={field === 'note' ? 'min-w-24' : undefined}>
      <label htmlFor={inputId} className="sr-only">
        {fieldLabels[field]}
      </label>
      {field === 'amount' ? (
        <CollectionCardInput {...inputProps} field="amount" value={row.amount} />
      ) : field === 'amount2' ? (
        <CollectionCardInput {...inputProps} field="amount2" value={row.amount2 ?? undefined} />
      ) : (
        <CollectionCardInput {...inputProps} field={field} value={row[field] ?? undefined} />
      )}
    </div>
  );
}

import { useMemo } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { useCurrencyList } from '@/api/useCurrencyList.ts';
import type { CollectionCard } from '../../../../../../../types/CollectionCard.ts';
import { CardList } from '../../../../../../../lib/swu-resources/types.ts';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card.tsx';
import { Skeleton } from '@/components/ui/skeleton.tsx';
import CardImage from '@/components/app/global/CardImage.tsx';
import { NotebookPen } from 'lucide-react';
import { CardCondition, CardLanguage } from '../../../../../../../types/enums.ts';
import { languageRenderer } from '@/lib/table/languageRenderer.tsx';
import { conditionRenderer } from '@/lib/table/conditionRenderer.tsx';
import { variantRenderer } from '@/lib/table/variantRenderer.tsx';
import CostIcon from '@/components/app/global/icons/CostIcon.tsx';
import AspectIcon from '@/components/app/global/icons/AspectIcon.tsx';
import RarityIcon from '@/components/app/global/icons/RarityIcon.tsx';
import { getCollectionCardIdentificationKey } from '@/api/usePutCollectionCard.ts';
import CollectionCardInput from '@/components/app/collections/CollectionContents/components/CollectionCardInput.tsx';
import { getIdentificationFromCollectionCard } from '@/components/app/collections/CollectionCardTable/collectionTableLib.tsx';
import {
  CollectionLayout,
  useCollectionInfo,
} from '@/components/app/collections/CollectionContents/CollectionLayoutSettings/useCollectionLayoutStore.ts';
import { useCollectionCardInput } from '@/components/app/collections/CollectionContents/components/useCollectionCardInput.ts';
import { foilRenderer } from '@/lib/table/foilRenderer.tsx';
import { cn } from '@/lib/utils.ts';

interface CollectionCardTableColumnsProps {
  collectionId: string;
  cardList: CardList | undefined;
  layout: CollectionLayout;
  forceHorizontal?: boolean;
}

export function useCollectionCardTableColumns({
  collectionId,
  cardList,
  layout,
  forceHorizontal = false,
}: CollectionCardTableColumnsProps): ColumnDef<CollectionCard>[] {
  const { data: currencyData } = useCurrencyList();
  const { currency, owned } = useCollectionInfo(collectionId);
  const onChange = useCollectionCardInput(collectionId);

  return useMemo(() => {
    const definitions: ColumnDef<CollectionCard>[] = [];

    if (layout === CollectionLayout.TABLE_IMAGE) {
      definitions.push({
        id: 'image',
        accessorKey: 'cardId',
        header: '',
        size: 12,
        cell: ({ row }) => {
          const card = cardList?.[row.original.cardId];

          return (
            // @ts-ignore
            <CardImage
              card={card}
              cardVariantId={row.original.variantId}
              size="w50"
              foil={row.original.foil}
              forceHorizontal={forceHorizontal}
            />
          );
        },
      });
    }

    definitions.push({
      id: 'amount',
      accessorKey: 'amount',
      header: 'Qty',
      size: 4,
      cell: ({ getValue, row }) => {
        const amount = getValue() as number;

        if (owned) {
          const id = getIdentificationFromCollectionCard(row.original);
          return (
            // @ts-ignore
            <CollectionCardInput
              key={getCollectionCardIdentificationKey(id)}
              id={id}
              field="amount"
              value={amount}
              onChange={onChange}
            />
          );
        }

        return <div className="font-medium text-right w-8">{amount}</div>;
      },
    });

    if (layout === CollectionLayout.TABLE_SMALL) {
      definitions.push({
        id: 'cost',
        accessorKey: 'cardId',
        header: 'Cost',
        size: 16,
        cell: ({ getValue }) => {
          const cardId = getValue() as string;

          const card = cardList?.[cardId];
          if (!card) return <Skeleton className="w-16 h-4 rounded-md" />;

          return (
            <div className="flex gap-1 w-16">
              {card?.cost !== null ? <CostIcon cost={card?.cost ?? 0} size="small" /> : null}
              {card?.aspects.map((a, i) => <AspectIcon key={`${a}${i}`} aspect={a} size="small" />)}
            </div>
          );
        },
      });
    }

    definitions.push({
      id: 'cardId',
      accessorKey: 'cardId',
      header: 'Card',
      cell: ({ getValue, row }) => {
        const cardId = getValue() as string;
        const variantId = row.original.variantId;
        const foil = row.original.foil;

        const card = cardList?.[cardId];
        if (!card) return <Skeleton className="w-full h-4 rounded-md" />;

        return (
          <HoverCard openDelay={0} closeDelay={0}>
            <HoverCardTrigger>
              <div className="flex py-1 gap-1 flex-col">
                <span>{card.name}</span>
                {layout === CollectionLayout.TABLE_IMAGE && (
                  <div className="flex gap-1">
                    {card?.cost !== null ? <CostIcon cost={card?.cost ?? 0} size="small" /> : null}
                    {card?.aspects.map((a, i) => (
                      <AspectIcon key={`${a}${i}`} aspect={a} size="small" />
                    ))}
                  </div>
                )}
              </div>
            </HoverCardTrigger>
            <HoverCardContent side="right" className=" w-fit">
              <CardImage
                card={card}
                cardVariantId={variantId}
                size={card?.front?.horizontal ? 'h350' : 'w200'}
                foil={foil}
                forceHorizontal={card?.front?.horizontal}
              />
            </HoverCardContent>
          </HoverCard>
        );
      },
    });

    definitions.push({
      id: 'variantId',
      accessorKey: 'variantId',
      header: 'Variant',
      size: 16,
      cell: ({ getValue, row }) => {
        const cardId = row.original.cardId;
        const variantId = getValue() as string;

        const card = cardList?.[cardId];
        if (!card) return <Skeleton className="w-16 h-4 rounded-md" />;
        const variant = card.variants[variantId];
        return variantRenderer(variant?.variantName ?? '');
      },
    });

    definitions.push({
      id: 'foil',
      accessorKey: 'foil',
      header: 'F',
      size: 4,
      cell: ({ getValue }) => foilRenderer(getValue() as boolean),
    });

    definitions.push({
      id: 'language',
      accessorKey: 'language',
      header: 'Lang.',
      size: 12,
      cell: ({ getValue }) => languageRenderer(getValue() as CardLanguage),
    });

    definitions.push({
      id: 'condition',
      accessorKey: 'condition',
      header: 'Cond.',
      size: 8,
      cell: ({ getValue }) => conditionRenderer(getValue() as CardCondition),
    });

    definitions.push({
      id: 'cardNo',
      accessorKey: 'cardId',
      header: 'No.',
      size: 8,
      cell: ({ getValue, row }) => {
        const cardId = getValue() as string;
        const variantId = row.original.variantId;

        const card = cardList?.[cardId];
        if (!card) return <Skeleton className="w-8 h-4 rounded-md" />;
        const variant = card.variants[variantId];

        return <span className="text-xs text-gray-500 w-8">{variant?.cardNo}</span>;
      },
    });

    definitions.push({
      id: 'set',
      accessorKey: 'cardId',
      header: 'Set',
      size: 8,
      cell: ({ getValue, row }) => {
        const cardId = getValue() as string;
        const variantId = row.original.variantId;

        const card = cardList?.[cardId];
        if (!card) return <Skeleton className="w-8 h-4 rounded-md" />;
        const variant = card.variants[variantId];

        return (
          <span className="text-xs font-medium text-gray-500 w-8">
            {variant?.set.toUpperCase()}
          </span>
        );
      },
    });

    definitions.push({
      id: 'rarity',
      accessorKey: 'cardId',
      header: 'R.',
      size: 4,
      cell: ({ getValue }) => {
        const cardId = getValue() as string;

        const card = cardList?.[cardId];
        if (!card) return <Skeleton className="w-4 h-4 rounded-md" />;

        return <RarityIcon rarity={card.rarity} size="small" />;
      },
    });

    definitions.push({
      id: 'note',
      accessorKey: 'note',
      header: 'Note',
      size: 20,
      cell: ({ getValue, row }) => {
        const note = getValue() as string;

        if (owned) {
          const id = getIdentificationFromCollectionCard(row.original);

          return (
            // @ts-ignore
            <CollectionCardInput
              key={getCollectionCardIdentificationKey(id)}
              id={id}
              field="note"
              value={note}
              onChange={onChange}
            />
          );
        }

        if (note === '') return <div className="w-20 min-w-20"></div>;

        return (
          <div className="text-sm text-gray-500 relative group w-20 min-w-20 max-w-20 flex gap-1 items-center">
            <NotebookPen className="max-w-3 min-w-3 max-h-3 min-h-3" />
            <span
              className="text-left truncate max-w-full text-ellipsis overflow-hidden whitespace-nowrap"
              title={note}
            >
              {note}
            </span>
            <span className="invisible absolute bottom-6 left-0 z-10 w-max bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:visible group-hover:opacity-100">
              {note}
            </span>
          </div>
        );
      },
    });

    definitions.push({
      accessorKey: 'price',
      header: 'Price',
      size: owned ? 32 : 20,
      cell: ({ getValue, row }) => {
        const price = getValue() as number | undefined;
        const id = getIdentificationFromCollectionCard(row.original);

        return (
          <div
            className={cn('flex gap-2 items-center justify-end', {
              'w-32': owned,
              'w-20': !owned,
            })}
          >
            {owned ? (
              //@ts-ignore
              <CollectionCardInput
                key={getCollectionCardIdentificationKey(id)}
                id={id}
                field="price"
                value={price}
                onChange={onChange}
              />
            ) : (
              <span>{price}</span>
            )}
            <span>{price ? currency : '-'}</span>
          </div>
        );
      },
    });

    return definitions;
  }, [cardList, currencyData, currency, owned, layout, forceHorizontal]);
}

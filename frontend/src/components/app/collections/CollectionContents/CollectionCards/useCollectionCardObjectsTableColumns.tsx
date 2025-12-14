import { useMemo } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { useCurrencyList } from '@/api/lists/useCurrencyList.ts';
import type { CollectionCard } from '../../../../../../../types/CollectionCard.ts';
import {
  HoverCard,
  HoverCardContent,
  HoverCardPortal,
  HoverCardTrigger,
} from '@/components/ui/hover-card.tsx';
import { Skeleton } from '@/components/ui/skeleton.tsx';
import CardImage from '@/components/app/global/CardImage.tsx';
import { NotebookPen } from 'lucide-react';
import { CardLanguage } from '../../../../../../../types/enums.ts';
import { languageRenderer } from '@/lib/table/languageRenderer.tsx';
import { conditionRenderer } from '@/lib/table/conditionRenderer.tsx';
import { variantRenderer } from '@/lib/table/variantRenderer.tsx';
import CostIcon from '@/components/app/global/icons/CostIcon.tsx';
import AspectIcon from '@/components/app/global/icons/AspectIcon.tsx';
import RarityIcon from '@/components/app/global/icons/RarityIcon.tsx';
import { getCollectionCardIdentificationKey } from '@/api/collections/usePutCollectionCard.ts';
import CollectionCardInput from '@/components/app/collections/CollectionContents/components/CollectionCardInput.tsx';
import { getIdentificationFromCollectionCard } from '@/components/app/collections/CollectionCardTable/collectionTableLib.tsx';
import {
  CollectionLayout,
  CollectionSortBy,
  useCollectionInfo,
  useCollectionLayoutStoreActions,
} from '@/components/app/collections/CollectionContents/CollectionSettings/useCollectionLayoutStore.ts';
import { useCollectionCardInput } from '@/components/app/collections/CollectionContents/components/useCollectionCardInput.ts';
import { foilRenderer } from '@/lib/table/foilRenderer.tsx';
import { cn } from '@/lib/utils.ts';
import { CollectionCardTableColumnsProps } from '@/components/app/collections/CollectionContents/CollectionCards/collectionCardTableLib.ts';
import CircledNumberValue from '@/components/app/global/CircledNumberValue.tsx';
import { useGetUserSetting } from '@/api/user/useGetUserSetting.ts';
import { PriceBadge } from '@/components/app/card-prices/PriceBadge.tsx';
import { CardPriceSourceType, cardPriceSourceInfo } from '../../../../../../../types/CardPrices.ts';

export function useCollectionCardObjectsTableColumns({
  collectionId,
  cardList,
  layout,
  forceHorizontal = false,
}: CollectionCardTableColumnsProps): ColumnDef<CollectionCard>[] {
  const { setSortBy } = useCollectionLayoutStoreActions();
  const { data: currencyData } = useCurrencyList();
  const { currency, owned } = useCollectionInfo(collectionId);
  const onChange = useCollectionCardInput(collectionId);
  const { data: priceSourceTypeCollection } = useGetUserSetting('priceSourceTypeCollection');

  return useMemo(() => {
    const definitions: ColumnDef<CollectionCard>[] = [];

    if (layout === CollectionLayout.TABLE_IMAGE || layout === 'table-list') {
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
      header: () => (
        <div className="cursor-pointer" onClick={() => setSortBy([CollectionSortBy.QUANTITY])}>
          Qty
        </div>
      ),
      size: 4,
      cell: ({ getValue, row }) => {
        const amount = getValue() as number;

        if (layout === 'table-list') {
          return <CircledNumberValue val={amount} strong={true} background="muted" />;
        }

        if (owned) {
          const id = getIdentificationFromCollectionCard(row.original);
          return (
            // @ts-ignore
            <CollectionCardInput
              inputId={getCollectionCardIdentificationKey(id)}
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
        header: () => (
          <div className="cursor-pointer" onClick={() => setSortBy([CollectionSortBy.CARD_COST])}>
            Cost
          </div>
        ),
        size: 16,
        cell: ({ getValue }) => {
          const cardId = getValue() as string;

          const card = cardList?.[cardId];
          if (!card) return <Skeleton className="w-16 h-4 rounded-md" />;

          return (
            <div className="flex gap-1 w-16">
              {card?.cost !== null ? <CostIcon cost={card?.cost ?? 0} size="small" /> : null}
              {card?.aspects.map((a, i) => (
                <AspectIcon key={`${a}${i}`} aspect={a} size="small" />
              ))}
            </div>
          );
        },
      });
    }

    if (layout !== 'table-duplicate' && layout !== 'table-list') {
      definitions.push({
        id: 'cardId',
        accessorKey: 'cardId',
        header: () => (
          <div className="cursor-pointer" onClick={() => setSortBy([CollectionSortBy.CARD_NAME])}>
            Card
          </div>
        ),
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
                  <span className="min-w-[250px]">{card.name}</span>
                  {layout === CollectionLayout.TABLE_IMAGE && (
                    <div className="flex gap-1">
                      {card?.cost !== null ? (
                        <CostIcon cost={card?.cost ?? 0} size="small" />
                      ) : null}
                      {card?.aspects.map((a, i) => (
                        <AspectIcon key={`${a}${i}`} aspect={a} size="small" />
                      ))}
                    </div>
                  )}
                </div>
              </HoverCardTrigger>
              <HoverCardPortal>
                <HoverCardContent side="right" className=" w-fit">
                  <CardImage
                    card={card}
                    cardVariantId={variantId}
                    size={card?.front?.horizontal ? 'h350' : 'w200'}
                    foil={foil}
                    forceHorizontal={card?.front?.horizontal}
                  />
                </HoverCardContent>
              </HoverCardPortal>
            </HoverCard>
          );
        },
      });
    } else if (layout === 'table-list') {
      definitions.push({
        id: 'cardId',
        accessorKey: 'cardId',
        header: () => (
          <div className="cursor-pointer" onClick={() => setSortBy([CollectionSortBy.CARD_NAME])}>
            Card
          </div>
        ),
        cell: ({ getValue, row }) => {
          const cardId = getValue() as string;
          const variantId = row.original.variantId;
          const foil = row.original.foil;
          const language = row.original.language;
          const condition = row.original.condition;

          const card = cardList?.[cardId];
          if (!card) return <Skeleton className="w-full h-4 rounded-md" />;
          const variant = card.variants[variantId];

          return (
            <HoverCard openDelay={0} closeDelay={0}>
              <HoverCardTrigger>
                <div className="flex py-1 gap-1 flex-col">
                  <span>{card.name}</span>
                  <div className="flex flex-1 gap-2 items-center justify-start">
                    {foilRenderer(foil)}
                    {languageRenderer(language)}
                    {conditionRenderer(condition)}
                    {variantRenderer(variant?.variantName ?? '', 'free', true)}
                  </div>
                </div>
              </HoverCardTrigger>
              <HoverCardPortal>
                <HoverCardContent side="right" className=" w-fit">
                  <CardImage
                    card={card}
                    cardVariantId={variantId}
                    size={card?.front?.horizontal ? 'h350' : 'w200'}
                    foil={foil}
                    forceHorizontal={card?.front?.horizontal}
                  />
                </HoverCardContent>
              </HoverCardPortal>
            </HoverCard>
          );
        },
      });
    }

    if (layout !== 'table-list') {
      definitions.push({
        id: 'variantId',
        accessorKey: 'variantId',
        header: () => (
          <div
            className="cursor-pointer"
            onClick={() => setSortBy([CollectionSortBy.VARIANT_NAME])}
          >
            Variant
          </div>
        ),
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
        cell: ({ getValue }) => conditionRenderer(getValue() as number),
      });

      if (layout !== 'table-duplicate') {
        definitions.push({
          id: 'cardNo',
          accessorKey: 'cardId',
          header: () => (
            <div
              className="cursor-pointer"
              onClick={() => setSortBy([CollectionSortBy.CARD_NUMBER])}
            >
              No.
            </div>
          ),
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
      }

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

      if (layout !== 'table-duplicate') {
        definitions.push({
          id: 'rarity',
          accessorKey: 'cardId',
          header: () => (
            <div className="cursor-pointer" onClick={() => setSortBy([CollectionSortBy.RARITY])}>
              R.
            </div>
          ),
          size: 4,
          cell: ({ getValue }) => {
            const cardId = getValue() as string;

            const card = cardList?.[cardId];
            if (!card) return <Skeleton className="w-4 h-4 rounded-md" />;

            return <RarityIcon rarity={card.rarity} size="small" />;
          },
        });
      }

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
                inputId={getCollectionCardIdentificationKey(id)}
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
        header: () => (
          <div className="cursor-pointer" onClick={() => setSortBy([CollectionSortBy.PRICE])}>
            Price
          </div>
        ),
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
                  inputId={getCollectionCardIdentificationKey(id)}
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
      // Insert extra price source column before Price when user setting is set
      if (priceSourceTypeCollection) {
        const src = priceSourceTypeCollection as CardPriceSourceType;
        definitions.splice(definitions.length - 1, 0, {
          id: 'price-source-extra',
          accessorKey: 'cardId',
          header: cardPriceSourceInfo[src]?.name ?? 'Price Source',
          size: 20,
          cell: ({ getValue, row }) => {
            const cardId = getValue() as string;
            const variantId = row.original.variantId;
            return (
              <div className={cn('flex items-center justify-end')}>
                <PriceBadge
                  cardId={cardId}
                  variantId={variantId}
                  sourceType={src}
                  displayLogo={true}
                  displayTooltip={true}
                  size="sm"
                />
              </div>
            );
          },
        });
      }
    }

    return definitions;
  }, [cardList, currencyData, currency, owned, layout, forceHorizontal, priceSourceTypeCollection]);
}

import { useMemo } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { useCurrencyList } from '@/api/useCurrencyList.ts';
import type { CollectionCard } from '../../../../../../../../types/CollectionCard.ts';
import { Input } from '@/components/ui/input.tsx';
import { CardList } from '../../../../../../../../lib/swu-resources/types.ts';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card.tsx';
import { Skeleton } from '@/components/ui/skeleton.tsx';
import CardImage from '@/components/app/global/CardImage.tsx';
import { Star } from 'lucide-react';
import { CardCondition, CardLanguage } from '../../../../../../../../types/enums.ts';
import { languageRenderer } from '@/lib/table/languageRenderer.tsx';
import { conditionRenderer } from '@/lib/table/conditionRenderer.tsx';
import { variantRenderer } from '@/lib/table/variantRenderer.tsx';
import CostIcon from '@/components/app/global/icons/CostIcon.tsx';
import AspectIcon from '@/components/app/global/icons/AspectIcon.tsx';
import RarityIcon from '@/components/app/global/icons/RarityIcon.tsx';

interface CollectionCardTableColumnsProps {
  cardList: CardList | undefined;
  currency?: string;
}

export function useCollectionCardTableColumns({
  cardList,
  currency = '',
}: CollectionCardTableColumnsProps): ColumnDef<CollectionCard>[] {
  const { data: currencyData } = useCurrencyList();

  return useMemo(() => {
    const definitions: ColumnDef<CollectionCard>[] = [];

    definitions.push({
      id: 'amount',
      accessorKey: 'amount',
      header: 'Qty',
      cell: ({ getValue }) => {
        const amount = getValue() as number;
        return <Input value={amount} type="number" className="w-12 px-1 pl-2" />;
      },
    });

    definitions.push({
      id: 'cardId',
      accessorKey: 'cardId',
      header: 'Cost',
      cell: ({ getValue }) => {
        const cardId = getValue() as string;

        const card = cardList?.[cardId];
        if (!card) return <Skeleton className="w-full h-4 rounded-md" />;

        return (
          <div className="flex gap-1">
            {card?.cost !== null ? <CostIcon cost={card?.cost ?? 0} size="small" /> : null}
            {card?.aspects.map(a => <AspectIcon aspect={a} size="small" />)}
          </div>
        );
      },
    });

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
              <span>{card.name}</span>
            </HoverCardTrigger>
            <HoverCardContent side="right" className=" w-fit">
              <CardImage card={card} cardVariantId={variantId} size="w200" foil={foil} />
            </HoverCardContent>
          </HoverCard>
        );
      },
    });

    definitions.push({
      id: 'variantId',
      accessorKey: 'variantId',
      header: 'Variant',
      cell: ({ getValue, row }) => {
        const cardId = row.original.cardId;
        const variantId = getValue() as string;

        const card = cardList?.[cardId];
        if (!card) return <Skeleton className="w-full h-4 rounded-md" />;
        const variant = card.variants[variantId];
        return variantRenderer(variant?.variantName ?? '');
      },
    });

    definitions.push({
      id: 'foil',
      accessorKey: 'foil',
      header: 'F',
      cell: ({ getValue }) => {
        const foil = getValue() as boolean;

        return foil ? <Star className="w-4 h-4 text-yellow-600" /> : null;
      },
    });

    definitions.push({
      id: 'language',
      accessorKey: 'language',
      header: 'Lang.',
      cell: ({ getValue }) => languageRenderer(getValue() as CardLanguage),
    });

    definitions.push({
      id: 'condition',
      accessorKey: 'condition',
      header: 'Cond.',
      cell: ({ getValue }) => conditionRenderer(getValue() as CardCondition),
    });

    definitions.push({
      id: 'cardId',
      accessorKey: 'cardId',
      header: 'Card No.',
      cell: ({ getValue, row }) => {
        const cardId = getValue() as string;
        const variantId = row.original.variantId;

        const card = cardList?.[cardId];
        if (!card) return <Skeleton className="w-full h-4 rounded-md" />;
        const variant = card.variants[variantId];

        return <span className="text-xs text-gray-500">{variant?.cardNo}</span>;
      },
    });

    definitions.push({
      id: 'cardId',
      accessorKey: 'cardId',
      header: 'Set',
      cell: ({ getValue, row }) => {
        const cardId = getValue() as string;
        const variantId = row.original.variantId;

        const card = cardList?.[cardId];
        if (!card) return <Skeleton className="w-full h-4 rounded-md" />;
        const variant = card.variants[variantId];

        return (
          <span className="text-xs font-medium text-gray-500">{variant?.set.toUpperCase()}</span>
        );
      },
    });

    definitions.push({
      id: 'cardId',
      accessorKey: 'cardId',
      header: 'R.',
      cell: ({ getValue }) => {
        const cardId = getValue() as string;

        const card = cardList?.[cardId];
        if (!card) return <Skeleton className="w-full h-4 rounded-md" />;

        return <RarityIcon rarity={card.rarity} size="small" />;
      },
    });

    definitions.push({
      id: 'note',
      accessorKey: 'note',
      header: 'Note',
      cell: ({ getValue }) => {
        const note = getValue() as string;

        return <span className="text-sm text-gray-500">{note}</span>;
      },
    });

    definitions.push({
      accessorKey: 'price',
      header: 'Price',
      cell: ({ getValue }) => {
        const price = getValue() as number;

        return price ? (
          <div>
            {price}
            {currency}
          </div>
        ) : (
          '-'
        );
      },
    });

    return definitions;
  }, [cardList, currencyData, currency]);
}

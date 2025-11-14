import React, { useMemo } from 'react';
import { CardPool } from '../../../../../../server/db/schema/card_pool.ts';
import { useGetCardPoolCards } from '@/api/card-pools/useGetCardPoolCards.ts';
import { useCardList } from '@/api/lists/useCardList.ts';
import { selectDefaultVariant } from '../../../../../../server/lib/cards/selectDefaultVariant.ts';
import CardPoolStack, {
  CardPoolStackItem,
} from '@/components/app/limited/CardPoolDetail/CardPoolStack.tsx';
import { groupToCardPoolColumns } from '@/components/app/limited/limitedLib.ts';
import { SwuAspect } from '../../../../../../types/enums.ts';

export interface CardPoolColumnProps {
  pool?: CardPool;
}

const CardPoolColumn: React.FC<CardPoolColumnProps> = ({ pool }) => {
  const { data: mapping, isFetching, error } = useGetCardPoolCards(pool?.id);
  const { data: cardListData } = useCardList();

  const items = useMemo<CardPoolStackItem[]>(() => {
    if (!mapping || !cardListData?.cards) return [];
    return Object.entries(mapping)
      .map(([num, cardId]) => {
        const card = cardListData.cards[cardId as string];
        const variantId = card ? selectDefaultVariant(card) : undefined;
        return { card, variantId, cardPoolNumber: num } as CardPoolStackItem;
      })
      .filter((c): c is CardPoolStackItem => !!c.card && c.card.type !== 'Leader');
  }, [mapping, cardListData?.cards]);

  const columns = groupToCardPoolColumns(items);

  return (
    <div className="rounded-lg border border-border bg-card p-3 h-full">
      <h3 className="text-sm font-semibold mb-2">Card pool</h3>
      {isFetching && <div className="text-xs opacity-60">Loading pool cards...</div>}
      {error && <div className="text-xs text-red-400">Failed to load pool cards.</div>}
      {!isFetching && !error && items.length === 0 && (
        <div className="text-xs opacity-60">No cards in this pool yet.</div>
      )}
      <div className="mt-2 flex flex-wrap">
        <div className="mt-2 flex flex-col">
          <CardPoolStack items={columns[SwuAspect.VIGILANCE].base} />
          <CardPoolStack items={columns[SwuAspect.VIGILANCE][SwuAspect.HEROISM]} />
          <CardPoolStack items={columns[SwuAspect.VIGILANCE][SwuAspect.VILLAINY]} />
        </div>
        <div className="mt-2 flex flex-col">
          <CardPoolStack items={columns[SwuAspect.AGGRESSION].base} />
          <CardPoolStack items={columns[SwuAspect.AGGRESSION][SwuAspect.HEROISM]} />
          <CardPoolStack items={columns[SwuAspect.AGGRESSION][SwuAspect.VILLAINY]} />
        </div>
        <div className="mt-2 flex flex-col">
          <CardPoolStack items={columns[SwuAspect.CUNNING].base} />
          <CardPoolStack items={columns[SwuAspect.CUNNING][SwuAspect.HEROISM]} />
          <CardPoolStack items={columns[SwuAspect.CUNNING][SwuAspect.VILLAINY]} />
        </div>
        <div className="mt-2 flex flex-col">
          <CardPoolStack items={columns[SwuAspect.COMMAND].base} />
          <CardPoolStack items={columns[SwuAspect.COMMAND][SwuAspect.HEROISM]} />
          <CardPoolStack items={columns[SwuAspect.COMMAND][SwuAspect.VILLAINY]} />
        </div>
      </div>
      {pool?.description && <div className="mt-3 text-xs opacity-60">{pool.description}</div>}
    </div>
  );
};

export default CardPoolColumn;

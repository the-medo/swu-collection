import type { CardStat } from '../../../../../../server/lib/card-statistics';
import * as React from 'react';
import CardImage from '@/components/app/global/CardImage.tsx';
import {
  CardDataWithVariants,
  CardListVariants,
} from '../../../../../../lib/swu-resources/types.ts';
import { selectDefaultVariant } from '../../../../../../server/lib/cards/selectDefaultVariant.ts';

interface CardStatisticProps {
  card?: CardDataWithVariants<CardListVariants>;
  cardStat: CardStat;
}

const CardStatistic: React.FC<CardStatisticProps> = ({ cardStat, card }) => {
  if (!card) return null;

  const variant = selectDefaultVariant(card);

  return (
    <div className="space-y-2 w-[220px] p-2 border">
      <CardImage card={card} cardVariantId={variant} />

      <div className="flex flex-col gap-1 text-sm text-gray-500">
        <div className="flex justify-between">
          <span>MD (+SB): </span>
          <span className="text-md font-bold">
            {cardStat.countMd} (+{cardStat.countSb})
          </span>
        </div>
        <div className="flex justify-between">
          <span>Avg. MD (+SB): </span>
          <span className="text-md font-bold">
            {(cardStat.countMd / cardStat.deckCount).toFixed(2)} (
            {((cardStat.countMd + cardStat.countSb) / cardStat.deckCount).toFixed(2)})
          </span>
        </div>
        <div className="flex justify-between">
          <span>Deck count: </span>
          <span className="text-md font-bold">{cardStat.deckCount}</span>
        </div>
        <div className="flex justify-between">
          <span>Win rate: </span>
          <span className="text-md font-bold">
            {((cardStat.matchWin / (cardStat.matchWin + cardStat.matchLose)) * 100).toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
};

export default CardStatistic;

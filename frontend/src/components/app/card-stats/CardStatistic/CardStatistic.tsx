import type { CardStat } from '../../../../../../server/lib/card-statistics';
import * as React from 'react';
import CardImage from '@/components/app/global/CardImage.tsx';
import {
  CardDataWithVariants,
  CardListVariants,
} from '../../../../../../lib/swu-resources/types.ts';
import { selectDefaultVariant } from '../../../../../../server/lib/cards/selectDefaultVariant.ts';
import { cn } from '@/lib/utils.ts';

interface CardStatisticProps {
  card?: CardDataWithVariants<CardListVariants>;
  cardStat: CardStat;
  variant?: 'image' | 'card-horizontal';
  preTitle?: string;
}

const CardStatistic: React.FC<CardStatisticProps> = ({
  cardStat,
  card,
  variant = 'image',
  preTitle,
}) => {
  if (!card) return null;

  const cardVariantId = selectDefaultVariant(card);

  return (
    <div
      className={cn(' p-2 border', {
        'space-y-2 w-[220px]': variant === 'image',
        'flex gap-2': variant === 'card-horizontal',
      })}
    >
      <CardImage
        card={card}
        cardVariantId={cardVariantId}
        size={variant === 'image' ? 'w200' : 'w75'}
      />

      <div className="flex flex-col flex-1 gap-1 text-sm text-gray-500">
        <div className="flex flex-col flex-1">
          <span className="text-sm font-bold text-gray-900">
            {preTitle}
            {card.title}
          </span>
          <span className="text-xs text-gray-700">{card.subtitle ?? '-'}</span>
        </div>
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

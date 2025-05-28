import type { CardStat } from '../../../../../../server/lib/card-statistics';
import * as React from 'react';
import CardImage from '@/components/app/global/CardImage.tsx';
import {
  CardDataWithVariants,
  CardListVariants,
} from '../../../../../../lib/swu-resources/types.ts';
import { selectDefaultVariant } from '../../../../../../server/lib/cards/selectDefaultVariant.ts';
import { cn } from '@/lib/utils.ts';
import { CardDecksDialog } from '../CardDecks';
import Dialog from '../../global/Dialog.tsx';
import { CardStatsParams } from '@/api/card-stats';

interface CardStatisticProps {
  card?: CardDataWithVariants<CardListVariants>;
  cardStat: CardStat;
  cardStatParams: CardStatsParams;
  variant?: 'image' | 'card-horizontal';
  preTitle?: string;
}

const CardStatistic: React.FC<CardStatisticProps> = ({
  cardStat,
  cardStatParams,
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

      <div className="flex flex-col flex-1 gap-1 text-sm text-muted-foreground overflow-hidden">
        <div
          className={cn('border-b truncate ellipsis overflow-hidden whitespace-nowrap', {
            'flex flex-col gap-1': variant === 'card-horizontal',
          })}
        >
          <span className="text-sm font-bold text-muted-foreground">
            {preTitle}
            {card.title}
          </span>{' '}
          {card.subtitle ? (
            <span className="text-xs text-muted-foreground italic"> {card.subtitle}</span>
          ) : variant === 'card-horizontal' ? (
            '-'
          ) : null}
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
          <CardDecksDialog
            trigger={
              <span className="text-md font-bold cursor-pointer hover:underline">
                {cardStat.deckCount}
              </span>
            }
            cardId={card.cardId}
            {...cardStatParams}
          />
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

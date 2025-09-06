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
import { CardStatsParams } from '@/api/card-stats';
import type { SectionMostPlayedCardsItem } from '../../../../../../types/DailySnapshots';

// Type guard to detect full CardStat
function isFullCardStat(stat: CardStat | SectionMostPlayedCardsItem): stat is CardStat {
  return (
    (stat as CardStat).matchWin !== undefined && (stat as CardStat).matchLose !== undefined
  );
}

interface CardStatisticProps {
  card?: CardDataWithVariants<CardListVariants>;
  // Accept stats from full CardStat or reduced SectionMostPlayedCardsItem
  cardStat: CardStat | SectionMostPlayedCardsItem;
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

  const deckCount = cardStat.deckCount ?? 0;
  const countMd = cardStat.countMd ?? 0;
  const countSb = cardStat.countSb ?? 0;

  const winRate = isFullCardStat(cardStat)
    ? (cardStat.matchWin + cardStat.matchLose > 0
        ? ((cardStat.matchWin / (cardStat.matchWin + cardStat.matchLose)) * 100).toFixed(1)
        : null)
    : null;

  const avgMd = deckCount > 0 ? (countMd / deckCount).toFixed(2) : 'N/A';
  const avgTotal = deckCount > 0 ? ((countMd + countSb) / deckCount).toFixed(2) : 'N/A';

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
            {countMd} (+{countSb})
          </span>
        </div>
        <div className="flex justify-between">
          <span>Avg. MD (+SB): </span>
          <span className="text-md font-bold">
            {avgMd} ({avgTotal})
          </span>
        </div>
        <CardDecksDialog
          trigger={
            <div className="flex justify-between cursor-pointer underline decoration-dotted hover:decoration-solid">
              <span className="decoration-dashed">Deck count: </span>
              <span className="text-md font-bold">{deckCount}</span>
            </div>
          }
          cardId={card.cardId}
          cardName={card.name}
          {...cardStatParams}
        />

        {winRate !== null ? (
          <div className="flex justify-between">
            <span>Win rate: </span>
            <span className="text-md font-bold">{winRate}%</span>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default CardStatistic;

import React, { useMemo } from 'react';
import { CardPool } from '../../../../../../server/db/schema/card_pool.ts';
import { useCardList } from '@/api/lists/useCardList.ts';
import { selectDefaultVariant } from '../../../../../../server/lib/cards/selectDefaultVariant.ts';
import CardImage from '@/components/app/global/CardImage.tsx';
import { cn } from '@/lib/utils.ts';
import DeckCardHoverImage from '@/components/app/decks/DeckContents/DeckCards/DeckLayout/DeckCardHoverImage.tsx';

export interface LeadersSectionProps {
  pool?: CardPool;
}

const LeadersSection: React.FC<LeadersSectionProps> = ({ pool }) => {
  const { data: cardListData, isFetching } = useCardList();

  const leaderCards = useMemo(
    () =>
      (pool?.leaders ?? '')
        .split(',')
        .map((cardId, i) => {
          const card = cardListData?.cards[cardId];
          const cardVariantId = card ? selectDefaultVariant(card) : undefined;
          return { key: i, cardId, card, cardVariantId };
        })
        .filter(c => c.card),
    [pool?.leaders, cardListData?.cards],
  );

  return (
    <div className="rounded-lg border border-border bg-card p-3 h-full">
      <h3 className="text-sm font-semibold mb-2">Leaders</h3>
      {isFetching && <div className="text-xs opacity-60">Loading leaders...</div>}
      {!isFetching && leaderCards.length === 0 && (
        <div className="text-xs opacity-60">No leaders selected for this pool.</div>
      )}
      <div className="mt-2 flex flex-row gap-3 items-center">
        {leaderCards.map((lc, i) => (
          <DeckCardHoverImage
            card={lc.card}
            defaultVariantId={lc.cardVariantId}
            size="w300"
            active={true}
          >
            <div className={cn(i > 0 && '-ml-[100px]')}>
                <CardImage
                  key={`${lc.cardId}-${lc.key}`}
                  card={lc.card}
                  cardVariantId={lc.cardVariantId}
                  forceHorizontal={true}
                  size="w200"
                  backSideButton="top-left"
                />
            </div>
          </DeckCardHoverImage>
        ))}
      </div>
    </div>
  );
};

export default LeadersSection;

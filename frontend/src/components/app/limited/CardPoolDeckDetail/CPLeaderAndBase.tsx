import React, { useMemo } from 'react';
import { useGetCardPool } from '@/api/card-pools/useGetCardPool.ts';
import { useCardList } from '@/api/lists/useCardList.ts';
import { selectDefaultVariant } from '../../../../../../server/lib/cards/selectDefaultVariant.ts';
import CardImage from '@/components/app/global/CardImage.tsx';

export interface CPLeaderAndBaseProps {
  deckId?: string; // reserved for future use
  poolId?: string;
  className?: string;
}

const CPLeaderAndBase: React.FC<CPLeaderAndBaseProps> = ({
  deckId: _deckId,
  poolId,
  className,
}) => {
  const { data: poolData, isFetching: isPoolFetching } = useGetCardPool(poolId);
  const { data: cardListData, isFetching: isCardListFetching } = useCardList();

  const leaderCards = useMemo(() => {
    const leaders = poolData?.data?.leaders ?? '';
    return leaders
      .split(',')
      .map((cardId, i) => {
        const card = cardListData?.cards[cardId];
        const cardVariantId = card ? selectDefaultVariant(card) : undefined;
        return { key: i, cardId, card, cardVariantId };
      })
      .filter(c => c.card);
  }, [poolData?.data?.leaders, cardListData?.cards]);

  const loading = isPoolFetching || isCardListFetching;

  return (
    <div className={`rounded-lg border border-border bg-card p-3 ${className ?? ''}`}>
      <h3 className="text-sm font-semibold mb-2">Leader & Base</h3>
      {loading && <div className="text-xs opacity-60">Loading leaders...</div>}
      {!loading && leaderCards.length === 0 && (
        <div className="text-xs opacity-60">No leaders selected for this pool.</div>
      )}
      <div className="mt-2 flex flex-row gap-3 items-start">
        {leaderCards.map(lc => (
          <div key={`${lc.cardId}-${lc.key}`}>
            <CardImage
              card={lc.card}
              cardVariantId={lc.cardVariantId}
              forceHorizontal={true}
              size="w200"
              backSideButton="top-left"
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default CPLeaderAndBase;

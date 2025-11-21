import React, { useMemo } from 'react';
import { useGetCardPool } from '@/api/card-pools/useGetCardPool.ts';
import { useCardList } from '@/api/lists/useCardList.ts';
import { selectDefaultVariant } from '../../../../../../server/lib/cards/selectDefaultVariant.ts';
import CardImage from '@/components/app/global/CardImage.tsx';
import { useCardPoolDeckDetailStoreActions } from './useCardPoolDeckDetailStore.ts';

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
  const { setHoveredCardId } = useCardPoolDeckDetailStoreActions();

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
      {loading && <div className="text-xs opacity-60">Loading leaders...</div>}
      {!loading && leaderCards.length === 0 && (
        <div className="text-xs opacity-60">No leaders selected for this pool.</div>
      )}
      <div className="flex flex-row gap-3 items-start">
        {leaderCards.map(lc => (
          <div key={`${lc.cardId}-${lc.key}`} onMouseEnter={() => setHoveredCardId(lc.cardId)}>
            <CardImage
              card={lc.card}
              cardVariantId={lc.cardVariantId}
              forceHorizontal={true}
              size="w100"
              backSideButton="mid"
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default CPLeaderAndBase;

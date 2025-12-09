import React, { useMemo } from 'react';
import { Card } from '@/components/ui/card.tsx';
import SetIcon from '@/components/app/global/icons/SetIcon.tsx';
import { cardPoolTypeRenderer } from '@/components/app/limited/components/cardPoolTypeRenderer.tsx';
import { cardPoolCustomRenderer } from '@/components/app/limited/components/cardPoolCustomRenderer.tsx';
import { cardPoolVisibilityRenderer } from '@/components/app/limited/components/cardPoolVisibilityRenderer.tsx';
import { cardPoolStatusRenderer } from '@/components/app/limited/components/cardPoolStatusRenderer.tsx';
import { CardPool } from '../../../../../../server/db/schema/card_pool.ts';
import { useCardList } from '@/api/lists/useCardList.ts';
import { selectDefaultVariant } from '../../../../../../server/lib/cards/selectDefaultVariant.ts';
import CardImage from '@/components/app/global/CardImage.tsx';
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button.tsx';
import { CardPoolType } from '../../../../../../shared/types/cardPools.ts';

interface CardPoolBoxProps {
  cardPool: CardPool;
}

const CardPoolBox: React.FC<CardPoolBoxProps> = ({ cardPool }) => {
  const { data: cardListData } = useCardList();

  const leaderCards = useMemo(
    () =>
      (cardPool.leaders ?? '')
        .split(',')
        .map((cardId, i) => {
          const card = cardListData?.cards[cardId];
          const cardVariantId = card ? selectDefaultVariant(card) : undefined;

          return {
            key: i,
            cardId: cardId,
            card,
            cardVariantId,
          };
        })
        .filter(c => c.card),
    [cardPool.leaders],
  );

  return (
    <Card className="min-w-[250px] max-w-[250px] p-3 flex flex-col gap-2 mb-2 justify-between items-center">
      <div className={`flex flex-col gap-2 items-center`}>
        {cardPool.set ? <SetIcon set={cardPool.set} size="full" /> : null}

        <div className="text-base font-semibold leading-tight truncate">
          <Link
            to={`/limited/pool/$poolId/detail`}
            params={{ poolId: cardPool.id }}
            className="w-full"
          >
            {cardPool.name || 'Untitled pool'}
          </Link>
        </div>

        {cardPool.description ? (
          <div className="text-sm text-muted-foreground line-clamp-3">{cardPool.description}</div>
        ) : null}
      </div>
      <div className={`flex flex-col gap-2 items-center`}>
        <div className="mt-1 flex flex-row flex-wrap items-center gap-2">
          {leaderCards.map(leaderCard => (
            <div key={leaderCard.key} className="text-sm text-muted-foreground">
              <CardImage
                card={leaderCard.card}
                cardVariantId={leaderCard.cardVariantId}
                forceHorizontal={true}
                size="w100"
              />
            </div>
          ))}
        </div>

        {/* Type, Custom, Visibility, Status renderers in a row */}
        <div className="mt-1 flex flex-row flex-wrap items-center gap-2">
          {cardPool.type ? cardPoolTypeRenderer(cardPool.type as CardPoolType) : null}
          {typeof cardPool.custom === 'boolean' ? cardPoolCustomRenderer(cardPool.custom) : null}
          {cardPool.visibility ? cardPoolVisibilityRenderer(cardPool.visibility) : null}
          {cardPool.status ? cardPoolStatusRenderer(cardPool.status) : null}
        </div>
        <Link
          to={`/limited/pool/$poolId/detail`}
          params={{ poolId: cardPool.id }}
          className="w-full"
        >
          <Button variant="outline" className="mt-2 w-full gap-2 text-sm">
            {/*Open <ArrowRight />*/}
            Create / browse decks
          </Button>
        </Link>
      </div>
    </Card>
  );
};

export default CardPoolBox;

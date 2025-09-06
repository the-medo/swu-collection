import * as React from 'react';
import { useCardList } from '@/api/lists/useCardList.ts';
import { selectDefaultVariant } from '../../../../../../../server/lib/cards/selectDefaultVariant.ts';
import type { Deck } from '../../../../../../../server/db/schema/deck.ts';
import { TournamentWinningDeckContent } from './TournamentWinningDeckContent.tsx';

interface TournamentGivenDeckTooltipProps {
  deck: Deck | null | undefined;
}

export const TournamentGivenDeckTooltip: React.FC<TournamentGivenDeckTooltipProps> = ({ deck }) => {
  const { data: cardListData } = useCardList();

  if (!deck) {
    return <div className="p-2">No winning deck data available</div>;
  }

  const leaderCardId = deck.leaderCardId1;
  const baseCardId = deck.baseCardId;

  const leaderCard = leaderCardId ? cardListData?.cards?.[leaderCardId] : undefined;
  const baseCard = baseCardId ? cardListData?.cards?.[baseCardId] : undefined;

  const leaderCardVariantId = leaderCard ? selectDefaultVariant(leaderCard) : undefined;
  const baseCardVariantId = baseCard ? selectDefaultVariant(baseCard) : undefined;

  return (
    <TournamentWinningDeckContent
      title="Winning Deck"
      leaderCard={leaderCard}
      baseCard={baseCard}
      leaderCardVariantId={leaderCardVariantId}
      baseCardVariantId={baseCardVariantId}
    />
  );
};

export default TournamentGivenDeckTooltip;

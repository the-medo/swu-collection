import * as React from 'react';
import { useMemo } from 'react';
import CardImage from '@/components/app/global/CardImage.tsx';
import { useCardList } from '@/api/lists/useCardList.ts';
import { selectDefaultVariant } from '../../../../../../../server/lib/cards/selectDefaultVariant.ts';
import { useGetTournamentDecks } from '@/api/tournaments/useGetTournamentDecks.ts';

interface TournamentWinningDeckTooltipProps {
  tournamentId: string;
}

export const TournamentWinningDeckTooltip: React.FC<TournamentWinningDeckTooltipProps> = ({
  tournamentId,
}) => {
  const { data: cardListData } = useCardList();
  const { data: decksData, isLoading } = useGetTournamentDecks(tournamentId);

  // Find the winning deck (placement = 1)
  const winningDeck = useMemo(() => {
    if (!decksData?.data || decksData.data.length === 0) return null;

    return decksData.data.find(deck => deck.tournamentDeck.placement === 1);
  }, [decksData]);

  if (isLoading) {
    return <div className="p-2">Loading deck data...</div>;
  }

  if (!winningDeck || !winningDeck.deck) {
    return <div className="p-2">No winning deck data available</div>;
  }

  const leaderCardId = winningDeck.deck.leaderCardId1;
  const baseCardId = winningDeck.deck.baseCardId;

  const leaderCard = leaderCardId ? cardListData?.cards?.[leaderCardId] : undefined;
  const baseCard = baseCardId ? cardListData?.cards?.[baseCardId] : undefined;

  const leaderCardVariantId = leaderCard ? selectDefaultVariant(leaderCard) : undefined;
  const baseCardVariantId = baseCard ? selectDefaultVariant(baseCard) : undefined;

  return (
    <div className="p-2">
      <h4 className="text-sm font-medium mb-2">Winning Deck</h4>
      <div className="flex flex-row gap-2">
        {leaderCard && (
          <CardImage
            card={leaderCard}
            cardVariantId={leaderCardVariantId}
            size="w100"
            backSideButton={false}
            forceHorizontal={true}
          />
        )}
        {baseCard && (
          <CardImage
            card={baseCard}
            cardVariantId={baseCardVariantId}
            size="w100"
            backSideButton={false}
            forceHorizontal={true}
          />
        )}
        {!leaderCard && !baseCard && 'No info'}
      </div>
    </div>
  );
};

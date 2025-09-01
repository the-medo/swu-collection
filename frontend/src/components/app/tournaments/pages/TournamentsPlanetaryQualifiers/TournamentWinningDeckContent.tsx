import * as React from 'react';
import CardImage from '@/components/app/global/CardImage.tsx';

type CardImageCard = React.ComponentProps<typeof CardImage>['card'];

interface TournamentWinningDeckContentProps {
  title?: string;
  leaderCard?: CardImageCard;
  baseCard?: CardImageCard;
  leaderCardVariantId?: string;
  baseCardVariantId?: string;
}

export const TournamentWinningDeckContent: React.FC<TournamentWinningDeckContentProps> = ({
  title = 'Winning Deck',
  leaderCard,
  baseCard,
  leaderCardVariantId,
  baseCardVariantId,
}) => {
  return (
    <div className="p-2">
      <h4 className="text-sm font-medium mb-2">{title}</h4>
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

export default TournamentWinningDeckContent;

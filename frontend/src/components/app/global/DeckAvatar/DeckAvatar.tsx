import * as React from 'react';
import { useCardList } from '@/api/lists/useCardList.ts';
import { selectDefaultVariant } from '../../../../../../server/lib/cards/selectDefaultVariant.ts';
import { Deck } from '../../../../../../server/db/schema/deck.ts';
import CardAvatar, { CardAvatarProps } from '@/components/app/global/CardAvatar.tsx';

interface TournamentGivenDeckTooltipProps {
  deck?: Deck | null | undefined;
  leaderCardId?: string | null;
  baseCardId?: string | null;
  size: CardAvatarProps['size'];
}

export const DeckAvatar: React.FC<TournamentGivenDeckTooltipProps> = ({
  deck,
  leaderCardId: l,
  baseCardId: b,
  size,
}) => {
  const { data: cardListData } = useCardList();

  if (!deck && !l && !b) {
    return <div className="p-2"></div>;
  }

  const leaderCardId = l ?? deck?.leaderCardId1;
  const baseCardId = b ?? deck?.baseCardId;

  const leaderCard = leaderCardId ? cardListData?.cards?.[leaderCardId] : undefined;
  const baseCard = baseCardId ? cardListData?.cards?.[baseCardId] : undefined;

  const leaderCardVariantId = leaderCard ? selectDefaultVariant(leaderCard) : undefined;
  const baseCardVariantId = baseCard ? selectDefaultVariant(baseCard) : undefined;

  return (
    <div className="p-0">
      <div className="flex items-center">
        <div className="z-1">
          <CardAvatar card={leaderCard} cardVariantId={leaderCardVariantId} bordered size={size} />
        </div>
        <div className="z-0" style={{ marginLeft: `${35 - Number(size)}px` }}>
          <CardAvatar
            card={baseCard}
            cardVariantId={baseCardVariantId}
            bordered
            size={size}
            contentRight={true}
          />
        </div>
      </div>
    </div>
  );
};

export default DeckAvatar;

import * as React from 'react';
import type {
  CardDataWithVariants,
  CardListVariants,
} from '../../../../../../../../../lib/swu-resources/types.ts';
import { PriceBadge } from '@/components/app/card-prices';
import { selectDefaultVariant } from '../../../../../../../../../server/lib/cards/selectDefaultVariant.ts';
import { useGetUserSetting } from '@/api/user/useGetUserSetting.ts';
import { PriceBadgeProps } from '@/components/app/card-prices/PriceBadge.tsx';

type DeckCardPriceBadgeProps = {
  card: CardDataWithVariants<CardListVariants> | undefined;
} & Pick<PriceBadgeProps, 'moveTop' | 'size' | 'displayTooltip'>;

const DeckCardPriceBadge: React.FC<DeckCardPriceBadgeProps> = ({
  card,
  moveTop = false,
  size = 'default',
  displayTooltip = false,
}) => {
  const defaultVariant = card ? selectDefaultVariant(card) : undefined;
  const { data: displayDeckPrice } = useGetUserSetting('deckPrices');
  const { data: priceSourceType } = useGetUserSetting('priceSourceType');

  if (!defaultVariant || !displayDeckPrice || !priceSourceType || !card) {
    return null;
  }

  return (
    <PriceBadge
      cardId={card.cardId}
      variantId={defaultVariant}
      sourceType={priceSourceType}
      displayLogo={false}
      displayTooltip={displayTooltip}
      displayNA={false}
      moveTop={moveTop}
      size={size}
    />
  );
};

export default DeckCardPriceBadge;

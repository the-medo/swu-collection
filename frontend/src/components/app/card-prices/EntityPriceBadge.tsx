import React, { useMemo } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { PriceBadgeTooltip } from './PriceBadgeTooltip';
import { PriceBadgeDisplayProps } from './PriceBadge';
import type { EntityPrice } from '../../../../../server/db/schema/entity_price.ts';
import {
  CardPriceSourceType,
  priceFormatterBasedOnSourceType,
} from '../../../../../types/CardPrices.ts';
import { PriceBadgeRenderer } from '@/components/app/card-prices/PriceBadgeRenderer.tsx';

export interface EntityPriceBadgeProps extends PriceBadgeDisplayProps {
  entityPrice: EntityPrice;
}

export const EntityPriceBadge: React.FC<EntityPriceBadgeProps> = ({
  entityPrice,
  // display props with defaults
  displayLogo = true,
  displayTooltip = true,
  displayNA = true,
  moveTop = false,
  size = 'default',
  fixedWidth = true,
  // Note: sourceType from display props is ignored in favor of entityPrice.sourceType
}) => {
  const sourceTypeEnum: CardPriceSourceType =
    entityPrice.sourceType === 'cardmarket'
      ? CardPriceSourceType.CARDMARKET
      : CardPriceSourceType.TCGPLAYER;

  const rawPrice = entityPrice.price as unknown as string | number | null | undefined;
  const priceStr = typeof rawPrice === 'number' ? rawPrice.toFixed(2) : (rawPrice ?? undefined);
  const hasPrice = Boolean(priceStr && priceStr !== '0.00');
  const formattedPrice = hasPrice
    ? priceFormatterBasedOnSourceType(priceStr as string, sourceTypeEnum)
    : 'N/A';

  const badge = useMemo(
    () => (
      <PriceBadgeRenderer
        formattedPrice={formattedPrice}
        sourceType={sourceTypeEnum}
        inFetchlist={false}
        displayLogo={displayLogo}
        moveTop={moveTop}
        size={size}
        fixedWidth={fixedWidth}
      />
    ),
    [formattedPrice, sourceTypeEnum, displayLogo, moveTop, size, fixedWidth],
  );

  if (!displayNA && !hasPrice) {
    return null;
  }

  if (!displayTooltip) {
    return badge;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>{badge}</TooltipTrigger>
        <TooltipContent className="p-4 max-w-sm">
          {hasPrice && entityPrice.data ? (
            <PriceBadgeTooltip
              data={entityPrice.data}
              sourceType={entityPrice.sourceType}
              updatedAt={entityPrice.updatedAt ?? null}
              fetchedAt={new Date()}
            />
          ) : (
            'No price data available.'
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default EntityPriceBadge;

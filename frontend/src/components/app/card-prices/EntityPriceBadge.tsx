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
import { isEntityPriceOutdated } from '../../../../../shared/lib/card-prices/outdated-by-source-type.ts';
import EntityPriceRefresh from '@/components/app/card-prices/EntityPriceRefresh.tsx';

const customMessageBySourceType: Record<string, string[]> = {
  cardmarket: ['New cardmarket prices are fetched daily 04:00 UTC'],
  tcgplayer: ['New TCGPlayer prices are fetched daily 9PM UTC'],
};

const getCustomMessageBySourceType = (sourceType: CardPriceSourceType | undefined): string[] => {
  if (!sourceType) return [];
  return sourceType in customMessageBySourceType ? customMessageBySourceType[sourceType] : [];
};

export interface EntityPriceBadgeProps extends PriceBadgeDisplayProps {
  entityPrice: EntityPrice;
  entityUpdatedAt?: string;
  displayRefreshIfOutdated?: boolean;
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
  entityUpdatedAt,
  displayRefreshIfOutdated = true,
  // Note: sourceType from display props is ignored in favor of entityPrice.sourceType
}) => {
  const rawPrice = entityPrice.price as unknown as string | number | null | undefined;
  const priceStr = typeof rawPrice === 'number' ? rawPrice.toFixed(2) : (rawPrice ?? undefined);
  const hasPrice = Boolean(priceStr && priceStr !== '0.00');
  const formattedPrice = hasPrice
    ? priceFormatterBasedOnSourceType(priceStr as string, entityPrice.sourceType)
    : 'N/A';

  const outdatedInfo = useMemo(
    () => isEntityPriceOutdated(entityPrice.sourceType, entityUpdatedAt, entityPrice.updatedAt),
    [entityPrice.sourceType, entityUpdatedAt, entityPrice.updatedAt],
  );

  const badge = useMemo(
    () => (
      <PriceBadgeRenderer
        formattedPrice={formattedPrice}
        sourceType={entityPrice.sourceType}
        inFetchlist={false}
        displayLogo={displayLogo}
        moveTop={moveTop}
        size={size}
        fixedWidth={fixedWidth}
        displayOutdatedWarningIcon={outdatedInfo !== false}
      />
    ),
    [formattedPrice, entityPrice.sourceType, displayLogo, moveTop, size, fixedWidth, outdatedInfo],
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
        <TooltipContent className="p-4 max-w-sm text-center">
          {hasPrice && entityPrice.data ? (
            <>
              <PriceBadgeTooltip
                data={entityPrice.data}
                sourceType={entityPrice.sourceType}
                customMessages={getCustomMessageBySourceType(entityPrice.sourceType)}
                warningMessages={outdatedInfo !== false ? outdatedInfo : undefined}
              />

              {displayRefreshIfOutdated && outdatedInfo !== false && (
                <EntityPriceRefresh entityId={entityPrice.entityId} entityType={entityPrice.type} />
              )}
            </>
          ) : (
            <div>No price data available.</div>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default EntityPriceBadge;

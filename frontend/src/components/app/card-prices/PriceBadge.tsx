import React, { useMemo } from 'react';
import { useGetSingleCardPrice } from '@/api/card-prices/useGetSingleCardPrice';
import { PriceBadgeTooltip } from './PriceBadgeTooltip';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  CardPriceSourceType,
  priceFormatterBasedOnSourceType,
} from '../../../../../types/CardPrices.ts';
import { PriceBadgeRenderer } from '@/components/app/card-prices/PriceBadgeRenderer.tsx';

export interface PriceBadgeDisplayProps {
  sourceType: CardPriceSourceType;
  displayLogo?: boolean;
  displayTooltip?: boolean;
  displayNA?: boolean;
  moveTop?: boolean;
  size?: 'sm' | 'default';
  fixedWidth?: boolean;
}

export interface PriceBadgeProps extends PriceBadgeDisplayProps {
  cardId: string;
  variantId: string;
}

/**
 * PriceBadge component
 *
 * Displays a badge with the price (in EUR) and CardMarket logo for a specific card variant.
 * If price data is not available, it returns null.
 *
 * @param cardId - The ID of the card
 * @param variantId - The ID of the card variant
 * @param sourceType - The source type for the price data
 * @param displayLogo
 * @param displayTooltip
 * @param displayNA
 * @param moveTop
 * @param size
 * @param fixedWidth
 */
export const PriceBadge: React.FC<PriceBadgeProps> = ({
  cardId,
  variantId,
  sourceType,
  displayLogo = true,
  displayTooltip = true,
  displayNA = true,
  moveTop = false,
  size = 'default',
  fixedWidth = true,
}) => {
  const { data, isLoading, isError } = useGetSingleCardPrice({
    cardId,
    variantId,
    sourceType,
  });

  const price = data?.data?.price;
  const inFetchlist = data?.inFetchlist;
  const hasPrice = price && price !== '0.00';
  const formattedPrice = hasPrice ? priceFormatterBasedOnSourceType(price, sourceType) : 'N/A';

  const badge = useMemo(
    () => (
      <PriceBadgeRenderer
        formattedPrice={formattedPrice}
        sourceType={sourceType}
        inFetchlist={Boolean(inFetchlist)}
        displayLogo={displayLogo}
        displayTooltip={displayTooltip}
        displayNA={displayNA}
        moveTop={moveTop}
        size={size}
        fixedWidth={fixedWidth}
      />
    ),
    [
      formattedPrice,
      sourceType,
      inFetchlist,
      displayLogo,
      displayTooltip,
      displayNA,
      moveTop,
      size,
      fixedWidth,
    ],
  );

  // If loading or error or no data, return null
  if (isLoading || isError || !data || (!displayNA && !hasPrice && !inFetchlist)) {
    console.log({
      isLoading,
      isError,
      data,
      dataData: data?.data,
    });
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
          {hasPrice && data.data ? (
            <PriceBadgeTooltip
              data={data.data.data}
              sourceType={sourceType}
              sourceLink={data.data.sourceLink}
              updatedAt={data.data.updatedAt}
              fetchedAt={data.data.fetchedAt}
            />
          ) : (
            'No price data available.'
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

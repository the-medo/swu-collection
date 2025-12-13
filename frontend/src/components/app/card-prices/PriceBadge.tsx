import React, { useMemo } from 'react';
import { useGetSingleCardPrice } from '@/api/card-prices/useGetSingleCardPrice';
import { Badge } from '@/components/ui/badge';
import { PriceBadgeTooltip } from './PriceBadgeTooltip';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils.ts';
import {
  CardPriceSourceType,
  priceFormatterBasedOnSourceType,
} from '../../../../../types/CardPrices.ts';

export interface PriceBadgeProps {
  cardId: string;
  variantId: string;
  sourceType: CardPriceSourceType;
  displayLogo?: boolean;
  displayTooltip?: boolean;
  displayNA?: boolean;
  moveTop?: boolean;
  size?: 'sm' | 'default';
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
}) => {
  // Fetch price data using the useGetSingleCardPrice hook
  const { data, isLoading, isError } = useGetSingleCardPrice({
    cardId,
    variantId,
    sourceType,
  });

  // Extract price from data
  const price = data?.data?.price;
  const hasPrice = price && price !== '0.00';

  // Format price as EUR
  const formattedPrice = hasPrice ? priceFormatterBasedOnSourceType(price, sourceType) : 'N/A';

  const badge = useMemo(
    () => (
      <Badge
        variant="secondary"
        className={cn(
          'flex items-center gap-1 cursor-pointer  border-background',
          displayLogo ? 'w-[80px]' : 'w-[50px] justify-end pr-[4px] -mt-1',
          moveTop ? '-mt-1' : '',
          size === 'sm' ? 'text-[10px] w-[40px] py-0' : '',
        )}
      >
        {displayLogo && (
          <>
            {sourceType === CardPriceSourceType.CARDMARKET && (
              <img
                src="https://images.swubase.com/cm-logo.png"
                alt="CardMarket"
                className="size-3"
              />
            )}
            {sourceType === CardPriceSourceType.TCGPLAYER && (
              <img
                src="https://images.swubase.com/price-source-thumbnails/icon-tcgplayer.png"
                alt="CardMarket"
                className="size-3 bg-white border-1 border-white"
              />
            )}
          </>
        )}
        <span>{formattedPrice}</span>
      </Badge>
    ),
    [formattedPrice],
  );

  // If loading or error or no data, return null
  if (isLoading || isError || !data || !data.success || !data.data || (!displayNA && !hasPrice)) {
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
          {hasPrice ? (
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

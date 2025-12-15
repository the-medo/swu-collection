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
import { LoaderCircle } from 'lucide-react';

export interface PriceBadgeProps {
  cardId: string;
  variantId: string;
  sourceType: CardPriceSourceType;
  displayLogo?: boolean;
  displayTooltip?: boolean;
  displayNA?: boolean;
  moveTop?: boolean;
  size?: 'sm' | 'default';
  fixedWidth?: boolean;
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
      <Badge
        variant="secondary"
        className={cn(
          'relative flex items-center gap-1 cursor-pointer h-[20px] border-background py-0',
          fixedWidth && {
            'w-[80px]': displayLogo,
            'w-[40px]': size === 'sm' && !displayLogo,
            'w-[50px]': size === 'default' && !displayLogo,
          },
          {
            '-mt-1': moveTop,
            'text-[10px]': size === 'sm',
            'justify-end pr-[4px] -mt-1': !displayLogo,
          },
        )}
      >
        {inFetchlist && (
          <span className="absolute top-1 -left-1 animate-spin">
            <LoaderCircle className="size-3" />
          </span>
        )}
        {displayLogo && (
          <>
            {sourceType === CardPriceSourceType.CARDMARKET && (
              <img
                src="https://images.swubase.com/cm-logo.png"
                alt="CardMarket"
                className={cn('size-3', inFetchlist && 'opacity-40')}
              />
            )}
            {sourceType === CardPriceSourceType.TCGPLAYER && (
              <img
                src="https://images.swubase.com/price-source-thumbnails/icon-tcgplayer.png"
                alt="CardMarket"
                className={cn('size-3 bg-white border-1 border-white', inFetchlist && 'opacity-40')}
              />
            )}
          </>
        )}
        <span className={cn('whitespace-nowrap', inFetchlist && 'opacity-40')}>
          {formattedPrice}
        </span>
      </Badge>
    ),
    [formattedPrice, displayLogo, size, moveTop, sourceType, inFetchlist],
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

import { PriceBadgeDisplayProps } from '@/components/app/card-prices/PriceBadge.tsx';
import { Badge } from '@/components/ui/badge.tsx';
import { LoaderCircle, CircleAlert } from 'lucide-react';
import { cn } from '@/lib/utils.ts';
import { CardPriceSourceType } from '../../../../../types/CardPrices.ts';

interface PriceBadgeRendererProps extends PriceBadgeDisplayProps {
  formattedPrice: string;
  inFetchlist?: boolean;
  displayOutdatedWarningIcon?: boolean;
}

export const PriceBadgeRenderer: React.FC<PriceBadgeRendererProps> = ({
  formattedPrice,
  sourceType,
  inFetchlist = false,
  displayLogo = true,
  moveTop = false,
  size = 'default',
  fixedWidth = true,
  displayOutdatedWarningIcon = false,
}) => {
  return (
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
      {displayOutdatedWarningIcon && (
        <span className="absolute -top-1 -right-1 opacity-60">
          <CircleAlert className="size-3" />
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
      <span className={cn('whitespace-nowrap', inFetchlist && 'opacity-40')}>{formattedPrice}</span>
    </Badge>
  );
};

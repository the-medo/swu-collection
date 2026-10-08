import creditsIcon from '@/assets/currencies/credits.svg';
import beskarIcon from '@/assets/currencies/beskar.svg';
import { cn } from '@/lib/utils';
import type { CreditCurrency } from '../../../../../shared/types/credits';

export function CurrencyIcon({
  currency,
  className,
}: {
  currency: CreditCurrency;
  className?: string;
}) {
  return (
    <img
      src={currency === 'credits' ? creditsIcon : beskarIcon}
      alt=""
      aria-hidden="true"
      width={32}
      height={32}
      className={cn('size-5 shrink-0', className)}
    />
  );
}

import type { ReactNode } from 'react';
import CardImage from '@/components/app/global/CardImage.tsx';
import { cn } from '@/lib/utils.ts';
import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover.tsx';
import type {
  CardDataWithVariants,
  CardListVariants,
  CardVariant,
} from '../../../../../lib/swu-resources/types.ts';

export function CardVariantPicker({
  card,
  variants,
  selectedVariantId,
  onSelect,
  disabled = false,
  showBackSide = false,
  renderDetails,
}: {
  card: CardDataWithVariants<CardListVariants>;
  variants: CardVariant[];
  selectedVariantId?: string;
  onSelect: (variantId: string) => void;
  disabled?: boolean;
  showBackSide?: boolean;
  renderDetails?: (variant: CardVariant) => ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start gap-3" role="group" aria-label="Card versions">
      {variants.map(variant => (
        <div
          key={variant.variantId}
          className={cn(
            'relative rounded-md border-2 p-2 transition-colors',
            selectedVariantId === variant.variantId
              ? 'border-primary bg-primary/5'
              : 'border-transparent hover:border-muted-foreground hover:bg-muted/30',
          )}
        >
          <button
            type="button"
            className="flex flex-col items-center gap-2 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-wait disabled:opacity-60"
            aria-pressed={selectedVariantId === variant.variantId}
            aria-label={`${variant.variantName} · ${variant.set.toUpperCase()} #${variant.cardNo}`}
            title={`${variant.variantName} — ${variant.fullSetName} #${variant.cardNo}`}
            disabled={disabled}
            onClick={() => onSelect(variant.variantId)}
          >
            <CardImage
              size="w100"
              card={card}
              cardVariantId={variant.variantId}
              backSideButton={false}
            />
            <span className="flex max-w-28 flex-col items-center text-xs">
              <span className="max-w-full truncate font-medium">{variant.variantName}</span>
              <span className="text-muted-foreground">
                {variant.set.toUpperCase()} #{variant.cardNo}
              </span>
            </span>
          </button>
          {showBackSide && variant.image.back && (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="iconSmall"
                  className="absolute left-1/2 top-28 -translate-x-1/2"
                  aria-label={`Preview back of ${variant.variantName} · ${variant.set.toUpperCase()} #${variant.cardNo}`}
                  disabled={disabled}
                >
                  <RotateCcw aria-hidden="true" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <CardImage
                  card={card}
                  cardVariantId={variant.variantId}
                  size="w200"
                  backSide
                  backSideButton={false}
                />
              </PopoverContent>
            </Popover>
          )}
          {renderDetails && (
            <div className="mt-1 flex flex-col items-center">{renderDetails(variant)}</div>
          )}
        </div>
      ))}
    </div>
  );
}

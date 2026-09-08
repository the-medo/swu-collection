import * as React from 'react';
import type {
  CardDataWithVariants,
  CardListVariants,
} from '../../../../../../lib/swu-resources/types.ts';
import type { HomeworldBaseTrait } from '../../../../../../shared/lib/basicBases.ts';
import { selectDefaultVariant } from '../../../../../../server/lib/cards/selectDefaultVariant.ts';
import { ToggleGroupItem } from '@/components/ui/toggle-group.tsx';
import { getCardImageUrl } from '@/components/app/global/cardImageLib.ts';
import { cn } from '@/lib/utils.ts';

type BaseTraitFilterButtonProps = {
  trait: HomeworldBaseTrait;
  representativeBase?: CardDataWithVariants<CardListVariants>;
};

const BaseTraitFilterButton: React.FC<BaseTraitFilterButtonProps> = ({
  trait,
  representativeBase,
}) => {
  const defaultVariantId = representativeBase
    ? selectDefaultVariant(representativeBase)
    : undefined;
  const imageUrl = getCardImageUrl(
    defaultVariantId ? representativeBase?.variants[defaultVariantId]?.image.front : undefined,
  );

  return (
    <ToggleGroupItem
      value={trait}
      aria-label={`Filter bases by ${trait} trait`}
      className={cn(
        'relative flex h-16 min-w-24 items-end justify-center overflow-hidden border border-border bg-center bg-no-repeat p-0 text-white shadow-sm',
        'hover:text-white focus-visible:ring-offset-background data-[state=on]:text-white data-[state=on]:ring-2 data-[state=on]:ring-primary',
      )}
      style={
        imageUrl
          ? {
              backgroundImage: `url("${imageUrl}")`,
              backgroundSize: '145% auto',
            }
          : undefined
      }
    >
      <span className="relative z-10 w-full bg-black/65 px-2 py-1 text-center text-sm font-semibold drop-shadow-md">
        {trait}
      </span>
    </ToggleGroupItem>
  );
};

export default BaseTraitFilterButton;

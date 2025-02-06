import * as React from 'react';
import { CardDataWithVariants, CardListVariants } from '../../../../../lib/swu-resources/types.ts';
import { useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton.tsx';
import { cva, VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils.ts';
import { Button } from '@/components/ui/button.tsx';
import { RotateCcw } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover.tsx';

// Base aspect ratio: 300:418 (~0.7177)
const cardImageVariants = cva('', {
  variants: {
    // This axis controls the base size variant
    size: {
      original: 'h-[418px] w-[300px] min-h-[418px] min-w-[300px]',
      w200: 'h-[279px] w-[200px] min-h-[279px] min-w-[200px]',
      w100: 'h-[140px] w-[100px] min-h-[140px] min-w-[100px]',
      w75: 'h-[105px] w-[75px] min-h-[105px] min-w-[75px]',
      w50: 'h-[70px] w-[50px] min-h-[70px] min-w-[50px]',
      h350: 'h-[350px] w-[250px] min-h-[350px] min-w-[250px]',
      h250: 'h-[250px] w-[180px] min-h-[250px] min-w-[180px]',
    },
    // Orientation: horizontal or not
    horizontal: {
      false: '',
      true: '',
    },
  },
  // When horizontal is true, swap the width and height for each variant.
  compoundVariants: [
    {
      size: 'original',
      horizontal: true,
      className: 'h-[300px] w-[418px] min-h-[300px] min-w-[418px]',
    },
    {
      size: 'w200',
      horizontal: true,
      className: 'h-[144px] w-[200px] min-h-[144px] min-w-[200px]',
    },
    {
      size: 'w100',
      horizontal: true,
      className: 'h-[72px] w-[100px] min-h-[72px] min-w-[100px]',
    },
    {
      size: 'w75',
      horizontal: true,
      className: 'h-[54px] w-[75px] min-h-[54px] min-w-[75px]',
    },
    {
      size: 'w50',
      horizontal: true,
      className: 'h-[36px] w-[50px] min-h-[36px] min-w-[50px]',
    },
    {
      size: 'h350',
      horizontal: true,
      className: 'h-[250px] w-[350px] min-h-[250px] min-w-[350px]',
    },
    {
      size: 'h250',
      horizontal: true,
      className: 'h-[180px] w-[250px] min-h-[180px] min-w-[250px]',
    },
  ],
  defaultVariants: {
    size: 'original',
    horizontal: false,
  },
});
type CardImageVariantProps = Omit<VariantProps<typeof cardImageVariants>, 'horizontal'>;

type CardImageProps = {
  card?: CardDataWithVariants<CardListVariants>;
  cardVariantId?: string;
  canDisplayBackSide?: boolean;
  backSide?: boolean;
  foil?: boolean;
} & CardImageVariantProps;

const CardImage: React.FC<CardImageProps> = ({
  card,
  cardVariantId,
  size = 'w200',
  canDisplayBackSide = true,
  backSide = false,
  foil = false,
}) => {
  const img = useMemo(() => {
    if (!card || !cardVariantId) return undefined;
    const v = card.variants[cardVariantId];

    return v?.image;
  }, [card, cardVariantId]);

  const horizontalFront = card?.front.horizontal ?? false;
  const horizontalBack = card?.back?.horizontal ?? false;
  const hasBack = !!card?.back;

  const classes = cardImageVariants({
    size: size || 'original',
    horizontal: backSide ? horizontalBack : horizontalFront,
  });

  if (!img) return <Skeleton className={cn(classes, 'rounded-xl')} />;

  return (
    <div
      className={cn(
        cardImageVariants({
          size: size || 'original',
          horizontal: false,
        }),
        'relative rounded-xl bg-gray-400',
      )}
    >
      <img
        className={cn(classes, ' absolute top-0 left-0')}
        src={'https://images.swubase.com/cards/' + (backSide ? img.back : img.front)}
        alt={`card-${card?.cardId}`}
      />
      {foil && (
        <img
          className="h-full w-full absolute top-0 left-0"
          src={'https://images.swubase.com/foil-overlay.png'}
          alt={`card-${card?.cardId}`}
        />
      )}
      {canDisplayBackSide && hasBack && !backSide && (
        <Popover>
          <PopoverTrigger>
            <Button
              variant="outline"
              size="icon"
              className="absolute bottom-4 left-[50%] transform -translate-x-1/2"
            >
              <RotateCcw />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className={cn(
              cardImageVariants({
                size: size || 'original',
                horizontal: horizontalBack,
              }),
              'm-0 p-0',
            )}
          >
            <CardImage
              card={card}
              cardVariantId={cardVariantId}
              backSide={true}
              size="original"
              foil={foil}
            />
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
};

export default CardImage;

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import type {
  CardDataWithVariants,
  CardListVariants,
} from '../../../../../lib/swu-resources/types';

// Avatar sizes are circles; we render a 100x100 "crop window" and scale it to fit.
const cardAvatarVariants = cva('rounded-full overflow-hidden relative', {
  variants: {
    size: {
      '30': 'h-[30px] w-[30px] min-h-[30px] min-w-[30px]',
      '50': 'h-[50px] w-[50px] min-h-[50px] min-w-[50px]',
      '75': 'h-[75px] w-[75px] min-h-[75px] min-w-[75px]',
      '100': 'h-[100px] w-[100px] min-h-[100px] min-w-[100px]',
    },
  },
  defaultVariants: {
    size: '50',
  },
});

type CardAvatarProps = {
  card?: CardDataWithVariants<CardListVariants>;
  cardVariantId?: string;
} & VariantProps<typeof cardAvatarVariants>;

const SCALE_BY_SIZE: Record<NonNullable<CardAvatarProps['size']>, number> = {
  '30': 0.3,
  '50': 0.5,
  '75': 0.75,
  '100': 1,
};

const CROP_X = 75; // take pixels starting at x=75
const CROP_Y = 50; // take pixels starting at y=50
const CROP_SIZE = 100; // 100x100 area
const DEFAULT_SIZE = '50';

const CardAvatar: React.FC<CardAvatarProps> = ({ card, cardVariantId, size = DEFAULT_SIZE }) => {
  const variant = card?.variants[cardVariantId ?? ''];
  const img = variant?.image;

  if (!img?.front) {
    return <Skeleton className={cn(cardAvatarVariants({ size }))} />;
  }

  const scale = SCALE_BY_SIZE[size ?? DEFAULT_SIZE];

  return (
    <div className={cn(cardAvatarVariants({ size }))}>
      {/* Scale a fixed 100x100 crop window into the requested avatar size */}
      <div
        className="absolute top-0 left-0 overflow-hidden"
        style={{
          width: CROP_SIZE,
          height: CROP_SIZE,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
      >
        <img
          src={'https://images.swubase.com/cards/' + img.front}
          alt={`card-${card?.cardId}`}
          className="absolute"
          style={{
            transform: `translate(${-CROP_X}px, ${-CROP_Y}px)`,
            // ensure 1:1 pixel mapping (don’t let the browser "fit" the image)
            width: 'auto',
            height: 'auto',
            maxWidth: 'none',
            maxHeight: 'none',
          }}
        />
      </div>
    </div>
  );
};

export default CardAvatar;

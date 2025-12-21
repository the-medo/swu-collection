import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
// no need for cn here after refactor
import type {
  CardDataWithVariants,
  CardListVariants,
} from '../../../../../lib/swu-resources/types';
import BaseAvatar from './BaseAvatar.tsx';
import LeaderAvatar from './LeaderAvatar.tsx';

export const cardAvatarVariants = cva('overflow-hidden relative', {
  variants: {
    size: {
      '30': 'h-[30px] w-[30px] min-h-[30px] min-w-[30px]',
      '40': 'h-[40px] w-[40px] min-h-[40px] min-w-[40px]',
      '50': 'h-[50px] w-[50px] min-h-[50px] min-w-[50px]',
      '75': 'h-[75px] w-[75px] min-h-[75px] min-w-[75px]',
      '100': 'h-[100px] w-[100px] min-h-[100px] min-w-[100px]',
    },
    shape: {
      square: 'rounded-md',
      circle: 'rounded-full',
    },
    bordered: {
      false: '',
      true: 'p-[4px]',
    },
  },
  defaultVariants: {
    size: '30',
    shape: 'square',
    bordered: false,
  },
});

export const SCALE_BY_SIZE: Record<NonNullable<CardAvatarProps['size']>, number> = {
  '30': 0.3,
  '40': 0.4,
  '50': 0.5,
  '75': 0.75,
  '100': 1,
};

export const CARD_AVATAR_CROP = {
  X: 65,
  Y: 40,
  SIZE: 200,
};

export type CardAvatarProps = {
  card?: CardDataWithVariants<CardListVariants>;
  cardVariantId?: string;
  bordered?: boolean; // optional colored border
  contentRight?: boolean;
} & VariantProps<typeof cardAvatarVariants>;

const CardAvatar: React.FC<CardAvatarProps> = ({
  card,
  cardVariantId,
  size = '30',
  shape = 'square',
  bordered = true,
  contentRight = false,
}) => {
  const variant = card?.variants[cardVariantId ?? ''];
  const img = variant?.image;

  if (!img?.front) return null;
  if (card?.type !== 'Leader' && card?.type !== 'Base') return null;

  if (card?.type === 'Base') {
    return (
      <BaseAvatar
        card={card}
        cardVariantId={cardVariantId}
        size={size}
        shape={shape}
        bordered={bordered}
        contentRight={contentRight}
      />
    );
  }

  // Leader
  return (
    <LeaderAvatar
      card={card}
      cardVariantId={cardVariantId}
      size={size}
      shape={shape}
      bordered={bordered}
    />
  );
};

export default CardAvatar;

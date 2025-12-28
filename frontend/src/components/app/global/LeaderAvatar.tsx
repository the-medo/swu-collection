import * as React from 'react';
import { cn } from '@/lib/utils';
import { getAspectGradient } from '../../../../../shared/lib/aspectColors.ts';
import { SwuAspect } from '../../../../../types/enums.ts';
import {
  CARD_AVATAR_CROP,
  CardAvatarProps,
  cardAvatarVariants,
  SCALE_BY_SIZE,
} from '@/components/app/global/CardAvatar.tsx';
import { useCardList } from '@/api/lists/useCardList.ts';

const LeaderAvatar: React.FC<CardAvatarProps> = ({
  card,
  cardId,
  cardVariantId,
  size = '30',
  shape = 'square',
  bordered = false,
}) => {
  const { data: cardList } = useCardList();

  const c = card ?? cardList?.cards[cardId ?? ''];
  const vId = cardVariantId ?? c?.variantMap?.['Standard'] ?? '';
  const variant = c?.variants[vId];
  const img = variant?.image;

  if (!img?.front) return null;

  const gradient = bordered ? getAspectGradient(c?.aspects as SwuAspect[] | undefined) : undefined;

  const scale = size ? SCALE_BY_SIZE[size] * 0.8 : 1;

  return (
    <div
      className={cn(cardAvatarVariants({ size, shape, bordered }))}
      style={gradient ? { background: gradient } : undefined}
    >
      <div
        className={cn(
          'relative w-full h-full overflow-hidden',
          shape === 'circle' ? 'rounded-full' : 'rounded-md',
        )}
      >
        <div
          className="absolute top-0 left-0 overflow-hidden"
          style={{
            width: CARD_AVATAR_CROP.SIZE,
            height: CARD_AVATAR_CROP.SIZE,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
          }}
        >
          <img
            src={'https://images.swubase.com/cards/' + img.front}
            alt={`card-${card?.cardId}`}
            className="absolute"
            style={{
              transform: `translate(${-CARD_AVATAR_CROP.X}px, ${-CARD_AVATAR_CROP.Y}px)`,
              width: 'auto',
              height: 'auto',
              maxWidth: 'none',
              maxHeight: 'none',
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default LeaderAvatar;

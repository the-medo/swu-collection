import * as React from 'react';
import { cn } from '@/lib/utils';
import { SwuAspect } from '../../../../../types/enums.ts';
import { getAspectGradient } from '../../../../../shared/lib/aspectColors.ts';
import { processBase } from '../../../../../shared/lib/processBase.ts';
import { useCardList } from '@/api/lists/useCardList.ts';
import AspectIcon from '@/components/app/global/icons/AspectIcon.tsx';
import {
  CARD_AVATAR_CROP,
  CardAvatarProps,
  cardAvatarVariants,
  SCALE_BY_SIZE,
} from '@/components/app/global/CardAvatar.tsx';

const BaseAvatar: React.FC<CardAvatarProps> = ({
  card,
  cardVariantId,
  size = '30',
  shape = 'square',
  bordered = false,
  contentRight = false,
}) => {
  const { data: cardList } = useCardList();
  const variant = card?.variants[cardVariantId ?? ''];
  const img = variant?.image;

  if (!img?.front) return null;

  const scale = size ? SCALE_BY_SIZE[size] * 0.8 : 1;
  const gradient = bordered
    ? getAspectGradient(card?.aspects as SwuAspect[] | undefined)
    : undefined;

  const processedBase = card ? processBase(card?.cardId, cardList?.cards) : undefined;
  const isIconBase =
    processedBase?.isBasicBase ||
    processedBase?.isBasicForceBase ||
    processedBase?.isBasicAspectIgnoreBase;

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
          <div className="w-full h-full bg-black opacity-30"></div>
        </div>
      </div>
      <span
        className={cn(
          'absolute text-[16px] font-medium top-[50%]  text-[white]  transform -translate-y-1/2',
          {
            ' -translate-x-1/2 left-[50%]': !contentRight,
            ' right-[0px]': contentRight,
          },
          contentRight && {
            ' -translate-x-[8px]': isIconBase,
            ' -translate-x-2': !isIconBase && processedBase?.shortcut.length === 3,
            ' -translate-x-[10px]': !isIconBase && processedBase?.shortcut.length === 2,
            ' -translate-x-4': !isIconBase && processedBase?.shortcut.length === 1,
          },
        )}
        style={{
          textShadow: `1px 1px 0 ${gradient}, -1px -1px 0 ${gradient}, 1px -1px 0 ${gradient}, -1px 1px 0 ${gradient}`,
        }}
      >
        {processedBase?.isBasicBase && (
          <AspectIcon aspect={processedBase.aspects[0]} size="medium" />
        )}
        {processedBase?.isBasicForceBase && (
          <div className="bg-white p-[2px] rounded-full">
            <AspectIcon aspect="force" size="small" />
          </div>
        )}
        {!isIconBase && processedBase?.shortcut}
      </span>
    </div>
  );
};

export default BaseAvatar;

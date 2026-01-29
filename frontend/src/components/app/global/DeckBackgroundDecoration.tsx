import * as React from 'react';
import { cn } from '@/lib/utils.ts';
import { PropsWithChildren } from 'react';
import { CardDataWithVariants, CardListVariants } from '../../../../../lib/swu-resources/types.ts';
import { aspectColors } from '../../../../../shared/lib/aspectColors.ts';

const positionClasses = {
  'top-left': 'top-0 left-0',
  'top-right': 'top-0 -right-[17px]',
};

const positionBaseClasses = {
  'top-left': ' -top-[50px] left-[30px] rotate-25',
  'top-right': ' -top-[50px] right-[30px] -rotate-25',
};

const positionChildrenClasses = {
  'top-left': 'top-[30px] left-[48px] -rotate-25',
  'top-right': 'top-[30px] right-[48px] rotate-25',
};

const maskGradients = {
  'top-left': {
    WebkitMaskImage: 'linear-gradient(115deg, black 0%, black 5%, transparent 50%)',
    maskImage: 'linear-gradient(115deg, black 0%, black 5%, transparent 50%)',
  },
  'top-right': {
    WebkitMaskImage: 'linear-gradient(245deg, black 0%, black 5%, transparent 50%)',
    maskImage: 'linear-gradient(245deg, black 0%, black 5%, transparent 50%)',
  },
};

const baseClasses = {
  'top-left': {
    WebkitMaskImage: 'linear-gradient(90deg, transparent 0%, transparent 20%, black 90%)',
    maskImage: 'linear-gradient(90deg, transparent 0%, transparent 20%, black 90%)',
  },
  'top-right': {
    WebkitMaskImage: 'linear-gradient(270deg, transparent 0%, transparent 20%, black 90%)',
    maskImage: 'linear-gradient(270deg, transparent 0%, transparent 20%, black 90%)',
  },
};

const imageOffsetClasses = {
  'top-left': '-ml-3 -mt-12',
  'top-right': '-mr-3 -mt-12',
};

interface DeckBackgroundDecorationProps extends PropsWithChildren {
  leaderCard: CardDataWithVariants<CardListVariants>;
  baseCard: CardDataWithVariants<CardListVariants> | undefined;
  position: 'top-left' | 'top-right';
}

const DeckBackgroundDecoration: React.FC<DeckBackgroundDecorationProps> = ({
  leaderCard,
  baseCard,
  position,
  children,
}) => {
  const leaderVariant = leaderCard.variants[Object.keys(leaderCard.variants)[0]];

  if (!leaderVariant) return null;

  const isLeader = leaderCard.type === 'Leader';
  const imageName = isLeader ? leaderVariant.image.back : leaderVariant.image.front;
  if (!imageName) return null;

  const imageUrl = `https://images.swubase.com/cards/${imageName}`;

  const baseAspect = baseCard?.aspects[0];
  let baseColor = baseAspect ? aspectColors[baseAspect] : 'gray';

  return (
    <>
      <div
        className={cn(
          'absolute w-[150px] h-[300px] pointer-events-none overflow-hidden z-10',
          positionClasses[position],
        )}
        style={maskGradients[position]}
      >
        <img
          src={imageUrl}
          alt=""
          className={cn('w-full h-full object-cover', imageOffsetClasses[position])}
        />
      </div>
      <div
        className={cn(
          'absolute w-[100px] h-[300px] overflow-hidden z-10',
          positionBaseClasses[position],
          position === 'top-left' && `border-r-[10px]`,
          position === 'top-right' && `border-l-[10px]`,
        )}
        style={{
          background: `${baseColor}aa`,
          ...baseClasses[position],
          borderRightColor: position === 'top-left' ? baseColor : undefined,
          borderLeftColor: position === 'top-right' ? baseColor : undefined,
        }}
      >
        {children ? (
          <div
            className={cn(
              'absolute pointer-events-none overflow-hidden m-0 p-[2px] opacity-90',
              positionChildrenClasses[position],
            )}
          >
            {children}
          </div>
        ) : null}
      </div>
    </>
  );
};

export default DeckBackgroundDecoration;

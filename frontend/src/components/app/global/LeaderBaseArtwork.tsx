import type { CSSProperties } from 'react';
import { cva } from 'class-variance-authority';
import { CircleHelp, UserRound } from 'lucide-react';
import { useCardList } from '@/api/lists/useCardList.ts';
import CardArtCrop from '@/components/app/global/CardArtCrop.tsx';
import AspectIcon from '@/components/app/global/icons/AspectIcon.tsx';
import { cn } from '@/lib/utils.ts';
import { aspectLib } from '../../../../../shared/lib/aspectLib.ts';
import { processBase } from '../../../../../shared/lib/processBase.ts';

const artworkVariants = cva('leader-base-artwork group/leader-base-artwork relative flex-none', {
  variants: {
    size: {
      default: 'h-20 w-27',
      compact: 'h-12 w-17',
    },
  },
});

const portraitVariants = cva(
  'absolute top-0.5 overflow-hidden rounded-lg border-[3px] border-[var(--leader-base-color)] bg-muted shadow-sm',
  {
    variants: {
      size: {
        default: 'h-18.5 w-23.5',
        compact: 'h-11 w-15',
      },
      side: {
        left: 'left-0 -rotate-3',
        right: 'right-0 rotate-3',
      },
    },
  },
);

export interface LeaderBaseArtworkProps {
  leaderId?: string | null;
  baseKey?: string | null;
  side?: 'left' | 'right';
  size?: 'default' | 'compact';
  className?: string;
  portraitClassName?: string;
}

/** Art-only leader portrait with the base identity kept readable at row size. */
export function LeaderBaseArtwork({
  leaderId,
  baseKey,
  side = 'left',
  size = 'default',
  className,
  portraitClassName,
}: LeaderBaseArtworkProps) {
  const { data, isError } = useCardList();
  const leader = data?.cards[leaderId ?? ''];
  const base = baseKey ? processBase(baseKey, data?.cards) : undefined;
  const baseCard = data?.cards[baseKey ?? ''] ?? base?.baseCard;
  const label = `${leader?.name ?? 'Unknown leader'} / ${baseCard?.name ?? baseKey ?? 'Unknown base'}`;
  const aspect = base?.aspects[0];
  const accent = aspect ? aspectLib[aspect] : 'hsl(var(--muted-foreground))';
  const baseIcon = base?.isBasicForceBase
    ? 'force'
    : base?.isBasicAspectIgnoreBase
      ? 'aspect-ignore'
      : base?.isBasicBase
        ? aspect
        : undefined;

  return (
    <div
      className={cn(artworkVariants({ size }), className)}
      data-artwork-ready={!!data || isError}
      role="img"
      aria-label={label}
      title={label}
      style={{ '--leader-base-color': accent } as CSSProperties}
    >
      <div aria-hidden="true">
        <div className={cn(portraitVariants({ size, side }), portraitClassName)}>
          {leader ? (
            <CardArtCrop
              card={leader}
              alt=""
              fit="cover"
              loading="lazy"
              className="h-full w-full transition-transform duration-200 group-hover/leader-base-artwork:scale-105 motion-reduce:transition-none"
            />
          ) : (
            <div className="grid h-full place-items-center text-muted-foreground">
              <UserRound size={22} />
            </div>
          )}
        </div>
        <span
          className={cn(
            'leader-base-badge absolute bottom-0 grid place-items-center rounded-lg border-[3px] border-[var(--leader-base-color)] bg-card text-foreground shadow-sm ring-2 ring-card',
            size === 'compact' ? 'size-6' : 'size-8',
            side === 'left' ? 'right-0' : 'left-0',
          )}
        >
          {baseIcon ? (
            <span
              className={cn(
                'grid place-items-center rounded-md bg-white',
                size === 'compact' ? 'size-4.5' : 'size-5.5',
              )}
            >
              <AspectIcon aspect={baseIcon} size={size === 'compact' ? 'xSmall' : 'small'} />
            </span>
          ) : base?.shortcut ? (
            <span
              className={cn(
                'leading-none font-bold tracking-tight',
                size === 'compact' ? 'text-[8px]' : 'text-[10px]',
              )}
            >
              {base.shortcut}
            </span>
          ) : (
            <CircleHelp size={16} className="text-muted-foreground" />
          )}
        </span>
      </div>
    </div>
  );
}

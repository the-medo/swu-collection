import type { CSSProperties } from 'react';
import { Link } from '@tanstack/react-router';
import { useCardList } from '@/api/lists/useCardList.ts';
import { getCardImageUrl } from '@/components/app/global/cardImageLib.ts';
import { Button } from '@/components/ui/button.tsx';
import { Skeleton } from '@/components/ui/skeleton.tsx';
import { cn } from '@/lib/utils.ts';
import { selectDefaultVariant } from '../../../../../../server/lib/cards/selectDefaultVariant.ts';
import type { DailySealedPool } from '../../../../../../shared/types/dailySealed.ts';

const leaderPositionClassName = cn(
  'today-leader absolute top-4.5 left-1/2 z-[var(--fan-order)] block w-[clamp(100px,_36cqi,_240px)]',
  'aspect-[1.4] rounded-[8px] origin-[50%_110%]',
  '[transform:translate(_calc(-50%_+_var(--fan-position)_*_26cqi),_calc(var(--fan-drop)_*_var(--fan-curve))_)_rotate(var(--fan-angle))]',
);

export function LeaderHand({
  pool,
  date,
  cardLinks = 'home',
  layout = 'overlap',
}: {
  pool: Pick<DailySealedPool, 'leaders'> & { set: string | null };
  date?: string;
  cardLinks?: 'home' | 'detail' | 'modal';
  layout?: 'overlap' | 'inline';
}) {
  const cards = useCardList();
  if (cards.isError) {
    return (
      <div role="alert" className="today-card-error p-8 text-center text-[13px]">
        Could not load the leaders.
        <Button variant="link" onClick={() => void cards.refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'today-leader-hand [--fan-curve:30px] relative isolate',
        'max-phone:[--fan-curve:18px]',
        layout === 'overlap'
          ? 'h-[clamp(156px,_40cqi,_220px)] -mt-14 max-phone:-mt-10.5'
          : 'h-[clamp(156px,_46cqi,_260px)]',
      )}
      role="group"
      aria-label="Leaders in this pool"
    >
      {pool.leaders.map(({ cardId, copies }, index) => {
        // Keep smaller hands together; five or more leaders use the full arc.
        const position =
          (index - (pool.leaders.length - 1) / 2) / Math.max((pool.leaders.length - 1) / 2, 2);
        const style = {
          '--fan-position': position,
          '--fan-angle': `${position * 19}deg`,
          '--fan-drop': Math.abs(position),
          '--fan-order': index,
        } as CSSProperties;
        const card = cards.data?.cards[cardId];
        if (!card)
          return (
            <Skeleton
              key={cardId}
              style={style}
              className={cn(
                leaderPositionClassName,
                'today-leader-skeleton bg-[var(--today-panel-border)]',
              )}
            />
          );
        const variantId =
          Object.values(card.variants).find(
            variant => variant?.set === pool.set && variant.variantName === 'Standard',
          )?.variantId ?? selectDefaultVariant(card);
        const image = getCardImageUrl(card.variants[variantId ?? '']?.image.front);

        return (
          <Link
            key={cardId}
            {...(cardLinks === 'home'
              ? {
                  to: '/' as const,
                  search: (previous: Record<string, unknown>) => ({
                    ...previous,
                    homeMode: 'today' as const,
                    poolDate: date,
                    modalCardId: cardId,
                  }),
                }
              : cardLinks === 'modal'
                ? {
                    to: '.' as const,
                    search: (previous: Record<string, unknown>) => ({
                      ...previous,
                      modalCardId: cardId,
                    }),
                    resetScroll: false,
                  }
                : {
                    to: '/cards/detail/$cardId' as const,
                    params: { cardId },
                    target: '_blank',
                    rel: 'noopener noreferrer',
                  })}
            className={cn(
              leaderPositionClassName,
              '[&:hover]:z-20',
              'focus-visible:z-20',
              '[&:hover_.today-leader-card]:[transform:translateY(-28px)_rotate(calc(-1_*_var(--fan-angle)))]',
              '[&:hover_.today-leader-card]:shadow-[0_18px_30px_-10px_#111b1475]',
              '[&:focus-visible_.today-leader-card]:[transform:translateY(-28px)_rotate(calc(-1_*_var(--fan-angle)))]',
              '[&:focus-visible_.today-leader-card]:shadow-[0_18px_30px_-10px_#111b1475]',
              'focus-visible:outline-none',
              '[&:focus-visible_.today-leader-card]:outline-3',
              '[&:focus-visible_.today-leader-card]:outline-[var(--today-accent)]',
              '[&:focus-visible_.today-leader-card]:outline-offset-4',
              '[&:hover_.today-leader-caption]:opacity-100',
              '[&:focus-visible_.today-leader-caption]:opacity-100',
            )}
            style={style}
            aria-label={`View ${card.name}${copies > 1 ? `, ${copies} copies in this pool` : ''}`}
          >
            <span
              className={cn(
                'today-leader-card relative block w-full h-full rounded-[inherit] bg-[#111] origin-[50%_110%]',
                'shadow-[-5px_7px_12px_#111b1430,_0_16px_26px_-14px_#111b1470] transition-[transform,box-shadow]',
                'duration-180 ease-[ease]',
                'motion-reduce:transition-none',
              )}
            >
              {image ? (
                <img
                  src={image}
                  alt=""
                  className="block w-full h-full border border-[#ffffff35] rounded-[inherit] object-cover"
                />
              ) : (
                <span className="today-card-fallback grid h-full place-items-center p-3 text-white text-[12px] text-center">
                  {card.name}
                </span>
              )}
              {copies > 1 && (
                <span
                  className={cn(
                    'today-copy-badge absolute top-1.5 left-1.5 py-px px-[5px] border border-[#ffffff50] rounded-[4px]',
                    'bg-[#151f19e8] text-white text-[10px] leading-[18px]',
                  )}
                >
                  ×{copies}
                </span>
              )}
              <span
                className={cn(
                  'today-leader-caption absolute top-[calc(100%_+_7px)] left-1/2 [transform:translateX(-50%)] w-max',
                  'max-w-full py-[5px] px-[9px] rounded-[5px] bg-foreground text-background text-center text-[10px]',
                  'opacity-0 pointer-events-none',
                )}
              >
                {card.title}
              </span>
            </span>
          </Link>
        );
      })}
    </div>
  );
}

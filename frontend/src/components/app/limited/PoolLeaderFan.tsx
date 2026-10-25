import { limitedStyles } from '@/components/app/limited/limitedStyles';
import type { CSSProperties } from 'react';
import { useCardList } from '@/api/lists/useCardList.ts';
import { getCardImageUrl } from '@/components/app/global/cardImageLib.ts';
import { SealedDeckIcon } from '@/components/app/global/icons/CardLibraryIcons.tsx';
import { selectDefaultVariant } from '../../../../../server/lib/cards/selectDefaultVariant.ts';

/** A preview of the pool's actual leaders; the containing pool link owns interaction. */
export default function PoolLeaderFan({
  leaders,
  set,
}: {
  leaders: string | null;
  set: string | null;
}) {
  const { data } = useCardList();
  const counts = new Map<string, number>();
  for (const id of (leaders ?? '').split(',').filter(Boolean)) {
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  const cards = [...counts].slice(0, 8);

  return (
    <div className={limitedStyles.leaderFan} aria-hidden="true">
      {cards.length ? (
        cards.map(([id, copies], index) => {
          const card = data?.cards[id];
          const variant =
            card &&
            (Object.values(card.variants).find(
              variant => variant.set === set && variant.variantName === 'Standard',
            )?.variantId ??
              selectDefaultVariant(card));
          const src = getCardImageUrl(card?.variants[variant ?? '']?.image.front);
          const position = (index - (cards.length - 1) / 2) / Math.max((cards.length - 1) / 2, 2);
          return (
            <span
              key={id}
              className={limitedStyles.fanCard}
              style={
                {
                  '--position': position,
                  '--angle': `${position * 17}deg`,
                  '--drop': `${Math.abs(position) * 12}px`,
                  zIndex: index,
                } as CSSProperties
              }
            >
              {src ? (
                <img src={src} alt="" loading="lazy" />
              ) : (
                <span className={limitedStyles.fanPlaceholder}>
                  <SealedDeckIcon size={20} />
                </span>
              )}
              {copies > 1 && <span className={limitedStyles.fanCopies}>×{copies}</span>}
            </span>
          );
        })
      ) : (
        <div className="flex h-full items-center justify-center gap-2 text-muted-foreground">
          <SealedDeckIcon size={28} />
          <span className="text-xs">
            {leaders ? 'Leaders unavailable' : 'Your cards, your pool'}
          </span>
        </div>
      )}
    </div>
  );
}

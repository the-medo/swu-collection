import { limitedStyles } from '@/components/app/limited/limitedStyles';
import type { CardPool } from '../../../../../../server/db/schema/card_pool.ts';
import { Link } from '@tanstack/react-router';
import { ArrowRight, Globe, Link as LinkIcon, Lock } from 'lucide-react';
import { formatDate } from '@/lib/locale.ts';
import { cn } from '@/lib/utils.ts';
import PoolLeaderFan from '../PoolLeaderFan.tsx';
import { setInfo } from '../../../../../../lib/swu-resources/set-info.ts';
import type { SwuSet } from '../../../../../../types/enums.ts';

export default function CardPoolBox({
  cardPool,
  compact = false,
}: {
  cardPool: CardPool;
  compact?: boolean;
}) {
  const VisibilityIcon =
    cardPool.visibility === 'private'
      ? Lock
      : cardPool.visibility === 'unlisted'
        ? LinkIcon
        : Globe;
  const setName = setInfo[cardPool.set as SwuSet]?.name ?? cardPool.set?.toUpperCase();
  return (
    <Link
      to="/limited/pool/$poolId/detail"
      params={{ poolId: cardPool.id }}
      className={cn('group', limitedStyles.poolCard, compact && limitedStyles.poolCardCompact)}
    >
      <PoolLeaderFan leaders={cardPool.leaders} set={cardPool.set} />
      <div className={limitedStyles.poolCardCopy}>
        <div className="mb-1 flex min-w-0 items-center justify-between gap-2 text-[11px] text-muted-foreground">
          <span className="truncate">
            {setName || 'Card pool'}
            {cardPool.custom
              ? ' · Custom'
              : cardPool.type === 'prerelease'
                ? ' · Prerelease'
                : cardPool.type === 'draft'
                  ? ' · Draft'
                  : ''}
          </span>
          <span title={cardPool.visibility ?? 'Public'} className="shrink-0">
            <VisibilityIcon size={12} aria-hidden="true" />
            <span className="sr-only">{cardPool.visibility}</span>
          </span>
        </div>
        <span className={limitedStyles.poolCardName}>{cardPool.name || 'Untitled pool'}</span>
        <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
          <span>
            {cardPool.status === 'in_progress' ? (
              'In progress'
            ) : (
              <>Updated {formatDate(cardPool.updatedAt)}</>
            )}
          </span>
          <ArrowRight
            className="size-3.5 shrink-0 text-[var(--limited-accent)]"
            aria-hidden="true"
          />
        </div>
      </div>
    </Link>
  );
}

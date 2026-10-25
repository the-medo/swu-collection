import type { ReactNode } from 'react';
import type { CrossfireGameArtwork } from '../../../../../shared/types/crossfire-activity.ts';
import { LeaderBaseArtwork } from '@/components/app/global/LeaderBaseArtwork.tsx';
import { cn } from '@/lib/utils.ts';

/** Public matchup identities, using the same artwork as the deck library. */
export function ActivityRow({
  leaders,
  bases,
  children,
  className,
}: CrossfireGameArtwork & {
  children: ReactNode;
  className?: string;
}) {
  return (
    <article className={cn('min-w-0 rounded-xl border bg-card p-3', className)}>
      {(leaders?.some(Boolean) || bases?.some(Boolean)) && (
        <div className="mb-3 flex items-center gap-2" aria-label="Matchup">
          <LeaderBaseArtwork leaderId={leaders?.[0]} baseKey={bases?.[0]} size="compact" />
          <span className="text-[10px] font-medium text-muted-foreground">vs</span>
          <LeaderBaseArtwork
            leaderId={leaders?.[1]}
            baseKey={bases?.[1]}
            size="compact"
            side="right"
          />
        </div>
      )}
      <div className="flex min-w-0 flex-wrap items-center gap-3 text-xs [&>div]:min-w-0 [&>div]:max-w-full [&>div]:flex-wrap [&_p]:wrap-anywhere">
        {children}
      </div>
    </article>
  );
}

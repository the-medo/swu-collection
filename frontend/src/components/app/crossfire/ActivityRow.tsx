import type { ReactNode } from 'react';
import type { CrossfireGameArtwork } from '../../../../../shared/types/crossfire-activity.ts';
import { MatchupCard } from '@/components/app/global/MatchupCard.tsx';
import { cn } from '@/lib/utils.ts';

/** Use the same leader-art card as match results, without exposing deck contents. */
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
    <article className={cn('min-w-0', className)}>
      <MatchupCard
        leaderCardId={leaders?.[0]}
        baseCardKey={bases?.[0]}
        opponentLeaderCardId={leaders?.[1]}
        opponentBaseCardKey={bases?.[1]}
        contentClassName="gap-3 text-sm [&>div]:min-w-0 [&>div]:max-w-full [&>div]:flex-wrap [&>div]:justify-center"
      >
        {children}
      </MatchupCard>
    </article>
  );
}

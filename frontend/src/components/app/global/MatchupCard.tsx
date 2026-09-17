import type { ReactNode } from 'react';
import { Card } from '@/components/ui/card.tsx';
import { useCardList } from '@/api/lists/useCardList.ts';
import DeckBackgroundDecoration from './DeckBackgroundDecoration.tsx';
import BaseAvatar from './BaseAvatar.tsx';
import { basicBaseForAspect } from '../../../../../shared/lib/basicBases.ts';
import { cn } from '@/lib/utils.ts';

export interface MatchupArtworkProps {
  leaderCardId?: string | null;
  baseCardKey?: string | null;
  opponentLeaderCardId?: string | null;
  opponentBaseCardKey?: string | null;
}

/** Shared, non-interactive leader/base decoration for results and Crossfire choices. */
export function MatchupArtwork(props: MatchupArtworkProps) {
  const { data: catalog } = useCardList();
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 max-h-32 overflow-hidden [mask-image:linear-gradient(to_bottom,black_65%,transparent)]"
    >
      {(
        [
          [props.leaderCardId, props.baseCardKey, 'top-left'],
          [props.opponentLeaderCardId, props.opponentBaseCardKey, 'top-right'],
        ] as const
      ).map(([leaderId, baseKey, position]) => {
        const baseId = baseKey && (catalog?.cards[baseKey] ? baseKey : basicBaseForAspect[baseKey]);
        const base = baseId ? catalog?.cards[baseId] : undefined;
        const leader = leaderId ? catalog?.cards[leaderId] : undefined;
        return leader || base ? (
          <div
            key={position}
            data-matchup-side={position === 'top-left' ? 'left' : 'right'}
            className={cn(
              'absolute top-0 h-32 w-40',
              position === 'top-left' ? 'left-0 origin-top-left' : 'right-0 origin-top-right',
            )}
          >
            <DeckBackgroundDecoration
              leaderCard={leader ?? base}
              baseCard={base}
              position={position}
              showBaseDecoration={!!base}
            >
              {baseKey && (
                <span data-base-card={baseKey}>
                  <BaseAvatar cardId={baseKey} bordered={false} size="40" shape="circle" />
                </span>
              )}
            </DeckBackgroundDecoration>
          </div>
        ) : null;
      })}
    </div>
  );
}

/** Presentation only: Crossfire game history must not invent statistics/match results. */
export function MatchupCard({
  children,
  className,
  contentClassName,
  ...artwork
}: MatchupArtworkProps & {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <Card className={cn('@container relative isolate min-w-0 overflow-hidden', className)}>
      <MatchupArtwork {...artwork} />
      <div
        className={cn(
          'relative z-10 flex min-h-24 flex-col items-center gap-1 px-3 pb-3 pt-12 text-center @min-[440px]:px-32 @min-[440px]:pt-3',
          contentClassName,
        )}
      >
        {children}
      </div>
    </Card>
  );
}

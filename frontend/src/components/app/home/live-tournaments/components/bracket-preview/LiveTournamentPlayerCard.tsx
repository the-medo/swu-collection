import { LeaderBaseArtwork } from '@/components/app/global/LeaderBaseArtwork.tsx';
import { cn } from '@/lib/utils.ts';
import type {
  LiveTournamentBracketDeckSummary,
  LiveTournamentMatchEntry,
} from '../../liveTournamentTypes.ts';

type MatchTournamentPlayer =
  | LiveTournamentMatchEntry['tournamentPlayer1']
  | LiveTournamentMatchEntry['tournamentPlayer2'];

type LiveTournamentPlayerCardProps = {
  playerDisplayName: string | null | undefined;
  tournamentPlayer: MatchTournamentPlayer;
  deck?: LiveTournamentBracketDeckSummary | null;
  gameWins?: number | null;
  isWinner?: boolean;
  isLoser?: boolean;
  isHighlighted?: boolean;
  isSelected?: boolean;
  variant?: 'bracket' | 'standing';
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
};

export function LiveTournamentPlayerCard({
  playerDisplayName,
  tournamentPlayer,
  deck,
  gameWins,
  isWinner = false,
  isLoser = false,
  isHighlighted = false,
  isSelected = false,
  variant = 'bracket',
  onClick,
  onMouseEnter,
  onMouseLeave,
}: LiveTournamentPlayerCardProps) {
  const leaderCardId = deck?.leaderCardId1 ?? tournamentPlayer?.leaderCardId ?? undefined;
  const baseKey = deck?.baseCardId ?? tournamentPlayer?.baseCardKey;
  const isClickable = !!onClick;
  const isStanding = variant === 'standing';
  const Component = isClickable ? 'button' : 'div';

  if (!playerDisplayName) {
    return (
      <div
        className={cn(
          'flex items-center rounded-md border border-dashed border-muted-foreground/20 bg-muted/20 px-2 text-[11px] text-muted-foreground',
          isStanding ? 'h-14' : 'h-16',
        )}
      >
        TBD
      </div>
    );
  }

  return (
    <Component
      type={isClickable ? 'button' : undefined}
      className={cn(
        'relative w-full overflow-hidden rounded-md border bg-background/95 text-left shadow-xs transition-all duration-150',
        isStanding ? 'h-14' : 'h-16',
        isWinner && 'border-primary/60 bg-primary/5',
        isLoser && 'opacity-50',
        isHighlighted && 'border-amber-500 bg-amber-500/10 opacity-100',
        isSelected && 'border-amber-500 bg-amber-500/15 ring-1 ring-amber-500/40',
        isClickable && 'cursor-pointer hover:border-primary/50 hover:bg-muted/30',
      )}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="flex h-full items-center gap-2 pl-2 pr-1">
        {(leaderCardId || baseKey) && (
          <LeaderBaseArtwork leaderId={leaderCardId} baseKey={baseKey} size="compact" />
        )}
        <div className="min-w-0 flex-1 text-left">
          <h6
            className={cn(
              'mb-0! truncate text-xs leading-tight',
              isHighlighted && 'text-amber-700 dark:text-amber-300',
            )}
          >
            {playerDisplayName}
          </h6>
        </div>
        {gameWins !== undefined && (
          <div
            className={cn(
              'flex h-full min-w-8 shrink-0 items-center justify-center rounded-sm px-2 text-[11px] font-bold',
              isWinner
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                : 'bg-muted/70 text-muted-foreground',
            )}
          >
            <h4 className="mb-0!">{gameWins ?? '-'}</h4>
          </div>
        )}
      </div>
    </Component>
  );
}

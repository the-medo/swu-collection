import { Trophy } from 'lucide-react';
import { cn } from '@/lib/utils.ts';
import { CompactDeckRow } from '../../CompactDeckRow.tsx';
import type { LiveTournamentWeekendTournamentEntry } from '../liveTournamentTypes.ts';
import type { TournamentLayout } from '../useTournamentLayout.ts';

export function TournamentWinner({
  entry,
  layout,
}: {
  entry: LiveTournamentWeekendTournamentEntry;
  layout: TournamentLayout;
}) {
  if (entry.weekendTournament.status !== 'finished') return null;
  const champion =
    entry.winningDeck?.tournamentDeck.meleePlayerUsername?.trim() ||
    (entry.championStanding?.playerDisplayName ?? null);
  const winningDeck = entry.winningDeck?.deck;
  const compact = layout === 'rows';

  return winningDeck ? (
    <CompactDeckRow
      className="live-event-winner"
      variant={compact ? 'winnerCompact' : 'winner'}
      deckId={winningDeck.id}
      name={champion ?? 'Winning deck'}
      leaderId={winningDeck.leaderCardId1}
      baseId={winningDeck.baseCardId}
      headingLevel="h5"
      linkLabel={champion ? `View ${champion}’s deck` : 'View winning deck'}
      metadata={
        <>
          <Trophy
            size={12}
            strokeWidth={1.5}
            aria-hidden="true"
            className="shrink-0 text-[color:var(--live-gold)]"
          />
          Champion
        </>
      }
    />
  ) : (
    <div
      className={cn(
        'live-event-champion flex items-center rounded-[9px]',
        compact
          ? 'gap-1.5 p-0 bg-transparent @max-[560.01px]:flex-col @max-[560.01px]:gap-0.5 @max-[560.01px]:text-center'
          : 'gap-2.5 py-2.5 px-3 bg-muted/60',
      )}
    >
      <Trophy
        size={20}
        strokeWidth={1.5}
        aria-hidden="true"
        className={cn('shrink-0 text-[color:var(--live-gold)]', compact && 'w-4')}
      />
      <div className="grid gap-[3px] min-w-0 flex-1">
        <span
          className={cn('text-[9px] text-muted-foreground', compact && '@max-[560.01px]:hidden')}
        >
          {champion ? 'Champion' : 'Final standings'}
        </span>
        <strong
          className={cn(
            'overflow-hidden text-ellipsis whitespace-nowrap font-medium',
            compact
              ? 'text-[11px] @max-[560.01px]:text-[10px] @max-[560.01px]:whitespace-normal @max-[560.01px]:wrap-anywhere'
              : 'text-[12px]',
          )}
        >
          {champion ?? 'Awaiting results'}
        </strong>
      </div>
    </div>
  );
}

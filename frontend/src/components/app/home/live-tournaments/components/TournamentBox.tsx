import { cn } from '@/lib/utils.ts';
import TournamentDetailDialogButton from '@/components/app/tournaments/TournamentDetailDialog/TournamentDetailDialogButton.tsx';
import { formatDateTime, getMeleeUrl } from '../liveTournamentUtils.ts';
import type { TournamentCardContentProps } from './TournamentCard.tsx';
import { BracketPreview } from './BracketPreview.tsx';
import { LiveStatusBadge } from './LiveStatusBadge.tsx';
import { TournamentInfoRow } from './TournamentInfoRow.tsx';
import { TournamentProgress } from './TournamentProgress.tsx';
import { TournamentWinner } from './TournamentWinner.tsx';
import type { LiveTournamentWeekendTournamentEntry } from '../liveTournamentTypes.ts';
import { getUndefeatedPlayers } from '../liveTournamentUtils.ts';

function TournamentDetailActions({
  entry,
  weekendId,
}: {
  entry: LiveTournamentWeekendTournamentEntry;
  weekendId: string;
}) {
  return (
    <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
      <BracketPreview
        weekendId={weekendId}
        tournamentId={entry.tournament.id}
        hasBracketMatches={entry.hasBracketMatches}
      />
      {entry.tournament.imported && (
        <TournamentDetailDialogButton tournamentId={entry.tournament.id} />
      )}
    </div>
  );
}

export function TournamentBox({
  entry,
  weekendId,
  title,
  actionsMenu,
}: TournamentCardContentProps) {
  const status = entry.weekendTournament.status;
  const meleeUrl = getMeleeUrl(entry.tournament.meleeId);
  const startTime = formatDateTime(entry.weekendTournament.exactStart);
  const undefeatedPlayers = getUndefeatedPlayers(entry);
  return (
    <>
      <div
        className={cn(
          'live-event-summary grid content-start gap-3 min-w-0',
          '[&_>_.text-xs]:text-[10px] [&_>_.text-xs]:leading-[1.5]',
        )}
      >
        <div
          className={cn(
            'live-event-topline flex items-start justify-between gap-3',
            '[&_>_button]:shrink-0',
          )}
        >
          {title}
          {actionsMenu}
        </div>
        <TournamentInfoRow entry={entry} meleeUrl={meleeUrl} showProgress={false} />
      </div>
      <div className={cn('live-event-details grid content-start gap-3 min-w-0', 'empty:hidden')}>
        {status === 'upcoming' && startTime && (
          <p className="live-event-start m-0 text-[11px] text-muted-foreground">
            Starts {startTime}
          </p>
        )}
        <TournamentProgress entry={entry} layout="boxes" />
        <TournamentWinner entry={entry} layout="boxes" />
        {status !== 'finished' && undefeatedPlayers.length > 0 && (
          <div
            className={cn(
              'live-event-undefeated grid gap-[7px]',
              '[&_>_span]:text-[9px] [&_>_span]:text-muted-foreground',
              '[&_>_div]:flex [&_>_div]:flex-wrap [&_>_div]:gap-1.5',
              '[&_>_div_>_span]:py-1 [&_>_div_>_span]:px-1.5 [&_>_div_>_span]:border [&_>_div_>_span]:border-solid',
              '[&_>_div_>_span]:border-border [&_>_div_>_span]:rounded-[5px] [&_>_div_>_span]:text-[9px]',
              '[&_strong]:font-medium [&_strong]:text-[color:var(--live-accent)]',
            )}
          >
            <span>Undefeated</span>
            <div>
              {undefeatedPlayers.slice(0, 3).map(row => (
                <span key={row.playerDisplayName}>
                  {row.playerDisplayName} <strong>{row.matchRecord}</strong>
                </span>
              ))}
              {undefeatedPlayers.length > 3 && <span>+{undefeatedPlayers.length - 3}</span>}
            </div>
          </div>
        )}
      </div>
      <footer
        className={cn(
          'live-event-actions flex flex-wrap items-end justify-between gap-2 mt-auto pt-2.5 border-t',
          'border-t-border',
          '[&_>_div]:shrink [&_>_div]:justify-start',
          '[&_>_.live-event-status]:shrink-0 [&_>_.live-event-status]:ml-auto',
          '[&_>_.live-event-status]:text-[9px] [&_>_.live-event-status]:font-medium',
          '[&_>_.live-event-status]:py-[3px] [&_>_.live-event-status]:px-[7px]',
          '[&_button]:text-[9px] [&_button]:normal-case [&_button]:rounded-[6px]',
        )}
      >
        {(entry.hasBracketMatches || entry.tournament.imported) && (
          <TournamentDetailActions entry={entry} weekendId={weekendId} />
        )}
        <LiveStatusBadge status={status} className="live-event-status" />
      </footer>
    </>
  );
}

import { cn } from '@/lib/utils.ts';
import TournamentDetailDialogButton from '@/components/app/tournaments/TournamentDetailDialog/TournamentDetailDialogButton.tsx';
import { formatDateTime, getMeleeUrl } from '../liveTournamentUtils.ts';
import type { TournamentCardContentProps } from './TournamentCard.tsx';
import { BracketPreview } from './BracketPreview.tsx';
import { LiveStatusBadge } from './LiveStatusBadge.tsx';
import { TournamentInfoRow } from './TournamentInfoRow.tsx';
import { TournamentProgress } from './TournamentProgress.tsx';
import { TournamentWinner } from './TournamentWinner.tsx';

export function TournamentRow({
  entry,
  weekendId,
  title,
  actionsMenu,
}: TournamentCardContentProps) {
  const status = entry.weekendTournament.status;
  const meleeUrl = getMeleeUrl(entry.tournament.meleeId);
  const startTime = formatDateTime(entry.weekendTournament.exactStart);
  return (
    <>
      <div
        className={cn(
          'live-row-title [grid-area:title] flex items-center gap-2 min-w-0',
          '[&_.live-event-title]:flex-[0_1_auto] [&_.live-event-title]:m-0! [&_.live-event-title]:text-[13px]!',
          '[&_.live-event-title_a]:block [&_.live-event-title_a]:overflow-hidden',
          '[&_.live-event-title_a]:text-ellipsis [&_.live-event-title_a]:whitespace-nowrap',
          '[&_>_button]:shrink-0 [&_>_button]:h-5.5 [&_>_button]:py-0 [&_>_button]:px-1.5 [&_>_button]:gap-1',
          '[&_>_button]:rounded-[5px] [&_>_button]:text-[9px] [&_>_button]:normal-case',
          '[&_>_button]:bg-transparent [&_>_button:hover]:bg-transparent',
          '[&_>_button_svg]:w-3 [&_>_button_svg]:h-3',
          '@max-[560.01px]:contents',
          '@max-[560.01px]:[&_.live-event-title]:[grid-area:title]',
          '@max-[560.01px]:[&_>_button]:[grid-area:bracket] @max-[560.01px]:[&_>_button]:justify-self-start',
          '@max-[400.01px]:[&_.live-event-title]:text-[12px]!',
        )}
      >
        {title}
        <BracketPreview
          weekendId={weekendId}
          tournamentId={entry.tournament.id}
          hasBracketMatches={entry.hasBracketMatches}
        />
      </div>
      <div
        className={cn(
          'live-row-info [grid-area:info] flex flex-nowrap items-center gap-y-[3px] gap-x-2 min-w-0',
          '[&_>_.live-event-info]:min-w-0 [&_>_.live-event-info]:gap-y-[3px] [&_>_.live-event-info]:gap-x-2',
          '[&_>_.live-event-info]:text-[10px] [&_>_.live-event-info]:leading-[1.5]',
          '[&_.live-event-start]:text-[10px]',
          '[&_>_button]:shrink-0 [&_>_button]:h-5.5 [&_>_button]:py-0 [&_>_button]:px-1.5 [&_>_button]:gap-1',
          '[&_>_button]:rounded-[5px] [&_>_button]:text-[9px] [&_>_button]:normal-case',
          '[&_>_button]:bg-transparent [&_>_button:hover]:bg-transparent',
          '[&_>_button_svg]:w-3 [&_>_button_svg]:h-3',
          '[&_>_button]:ml-auto',
          '@max-[400.01px]:[&_>_.live-event-info]:gap-x-1.5',
        )}
      >
        <TournamentInfoRow entry={entry} meleeUrl={meleeUrl} showProgress={false} />
        {status === 'upcoming' && startTime && (
          <span className="live-event-start m-0 text-[11px] text-muted-foreground">
            Starts {startTime}
          </span>
        )}
        {entry.tournament.imported && (
          <TournamentDetailDialogButton tournamentId={entry.tournament.id} />
        )}
      </div>
      {status === 'finished' && (
        <div className="live-row-result [grid-area:result] min-w-0">
          <TournamentWinner entry={entry} layout="rows" />
        </div>
      )}
      <TournamentProgress entry={entry} layout="rows" />
      <div
        className={cn(
          'live-row-controls [grid-area:controls] flex items-center justify-end gap-[3px]',
          '[&_.live-event-status]:py-0.5 [&_.live-event-status]:px-[5px] [&_.live-event-status]:text-[9px]',
          '[&_.live-event-status]:font-medium',
          '[&_>_button]:w-6.5 [&_>_button]:h-6.5',
        )}
      >
        <LiveStatusBadge status={status} className="live-event-status" />
        {actionsMenu}
      </div>
    </>
  );
}

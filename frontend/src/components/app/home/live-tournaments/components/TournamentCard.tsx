import type { ReactNode } from 'react';
import { cva } from 'class-variance-authority';
import { Link } from '@tanstack/react-router';
import { ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils.ts';
import type { LiveTournamentWeekendTournamentEntry } from '../liveTournamentTypes.ts';
import { getMeleeUrl } from '../liveTournamentUtils.ts';
import type { TournamentLayout } from '../useTournamentLayout.ts';
import { TournamentCardActionsMenu } from './TournamentCardActionsMenu.tsx';
import { TournamentRow } from './TournamentRow.tsx';
import { TournamentBox } from './TournamentBox.tsx';

const tournamentCardVariants = cva(
  'live-event-card min-w-0 border border-border bg-card shadow-[0_4px_14px_-14px_#161c20a0]',
  {
    variants: {
      layout: {
        boxes: cn(
          'flex flex-col gap-3 rounded-[14px] p-4',
          'data-[status=running]:border-t-2 data-[status=running]:border-t-[var(--live-accent)] data-[status=running]:pt-[15px]',
          '[&_.live-event-details:has(.live-event-champion)]:mt-auto',
        ),
        rows: cn(
          'grid min-h-15.5 grid-cols-[minmax(0,1fr)_auto] items-center content-center gap-x-2.5 gap-y-0.5 rounded-[9px] px-2.5 py-[7px]',
          "[grid-template-areas:'title_controls'_'info_controls'_'progress_controls']",
          'data-[result=true]:grid-cols-[184px_minmax(0,1fr)_auto]',
          "data-[result=true]:[grid-template-areas:'result_title_controls'_'result_info_controls'_'result_progress_controls']",
          'data-[status=running]:border-l-3 data-[status=running]:border-l-[var(--live-accent)] data-[status=running]:pl-2',
          '@max-[700.01px]:data-[result=true]:grid-cols-[152px_minmax(0,1fr)_auto]',
          "@max-[560.01px]:[grid-template-areas:'title_title'_'info_info'_'bracket_controls'_'progress_progress']",
          '@max-[560.01px]:data-[result=true]:grid-cols-[66px_minmax(0,1fr)_auto] @max-[560.01px]:data-[result=true]:gap-x-2',
          "@max-[560.01px]:data-[result=true]:[grid-template-areas:'result_title_title'_'result_info_info'_'result_bracket_controls'_'result_progress_progress']",
        ),
      },
    },
  },
);

export type TournamentCardContentProps = {
  entry: LiveTournamentWeekendTournamentEntry;
  weekendId: string;
  title: ReactNode;
  actionsMenu: ReactNode;
};

export function TournamentCard({
  entry,
  weekendId,
  weekendTournaments,
  layout = 'boxes',
}: {
  entry: LiveTournamentWeekendTournamentEntry;
  weekendId: string;
  weekendTournaments: LiveTournamentWeekendTournamentEntry[];
  layout?: TournamentLayout;
}) {
  const meleeUrl = getMeleeUrl(entry.tournament.meleeId);
  const status = entry.weekendTournament.status;
  const title = (
    <h4
      className={cn(
        'live-event-title flex-1 min-w-0 mx-0! mt-[3px]! mb-0! text-[14px]! font-semibold! leading-[1.45]!',
        '[&_a]:wrap-anywhere',
        '[&_a:hover]:underline [&_a:hover]:underline-offset-3',
        '[&_svg]:inline [&_svg]:ml-[7px] [&_svg]:text-muted-foreground',
      )}
    >
      <Link
        to="/tournaments/$tournamentId"
        params={{ tournamentId: entry.tournament.id }}
        target="_blank"
        rel="noreferrer"
        title={entry.tournament.name}
      >
        {entry.tournament.name}
        <ExternalLink size={12} aria-hidden="true" />
      </Link>
    </h4>
  );
  const actionsMenu = (
    <TournamentCardActionsMenu
      meleeUrl={meleeUrl}
      isLiveCheckEnabled={entry.weekendTournament.isLiveCheckEnabled}
      tournamentId={entry.tournament.id}
      tournamentName={entry.tournament.name}
      weekendId={weekendId}
      weekendTournaments={weekendTournaments}
    />
  );
  const Content = layout === 'rows' ? TournamentRow : TournamentBox;
  return (
    <article
      className={tournamentCardVariants({ layout })}
      data-status={status}
      data-layout={layout}
      data-result={layout === 'rows' ? status === 'finished' : undefined}
    >
      <Content entry={entry} weekendId={weekendId} title={title} actionsMenu={actionsMenu} />
    </article>
  );
}

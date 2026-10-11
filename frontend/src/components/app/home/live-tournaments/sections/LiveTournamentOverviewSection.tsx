import { cn } from '@/lib/utils.ts';
import { useMemo, useState } from 'react';
import { CalendarClock, LayoutGrid, Radio, RefreshCw, Rows3, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group.tsx';
import { TournamentCard } from '../components';
import type { LiveTournamentWeekendTournamentEntry } from '../liveTournamentTypes.ts';
import { useTournamentLayout, type TournamentLayout } from '../useTournamentLayout.ts';

const TOURNAMENT_COLUMN_DEFAULT_LIMIT = 10;
type StatusGroup = 'running' | 'finished' | 'upcoming';
const statusDetails = {
  running: {
    title: 'At the tables',
    label: 'Live now',
    icon: Radio,
    empty: 'No tournaments are running right now.',
  },
  finished: {
    title: 'The results are in',
    label: 'Finished',
    icon: Trophy,
    empty: 'The first results are still to come.',
  },
  upcoming: {
    title: 'Up next',
    label: 'Upcoming',
    icon: CalendarClock,
    empty: 'No more tournaments are scheduled for this weekend.',
  },
};

export function LiveTournamentStatusTilesSection({
  runningCount,
  finishedCount,
  upcomingCount,
}: {
  runningCount: number;
  finishedCount: number;
  upcomingCount: number;
}) {
  return (
    <div
      className={cn(
        'live-weekend-stats grid grid-cols-3 gap-7',
        'max-mobile:w-full max-mobile:gap-2 max-mobile:pt-2.5 max-mobile:border-t max-mobile:border-solid',
        'max-mobile:border-t-[var(--live-line)]',
      )}
    >
      {(
        [
          ['running', runningCount],
          ['finished', finishedCount],
          ['upcoming', upcomingCount],
        ] as const
      ).map(([status, value]) => {
        const { label, icon: Icon } = statusDetails[status];
        return (
          <div
            key={status}
            className={cn(
              'live-weekend-stat flex flex-col gap-[9px] min-w-[65px]',
              '[&_>_span]:flex [&_>_span]:items-center [&_>_span]:gap-1.5 [&_>_span]:text-muted-foreground',
              '[&_>_span]:text-[11px]',
              '[&_>_strong]:text-[36px] [&_>_strong]:leading-none [&_>_strong]:font-medium [&_>_strong]:tabular-nums',
              '[&_>_strong]:tracking-[-0.04em]',
              '[&[data-status=running]_strong]:text-[color:var(--live-accent)]',
              '[&[data-status=finished]_strong]:text-[color:var(--live-gold)]',
              'max-mobile:flex-row max-mobile:items-center max-mobile:justify-between max-mobile:min-w-0',
              'max-mobile:gap-1',
              'max-mobile:[&_strong]:text-[18px]',
              'max-mobile:[&_>_span]:text-[10px] max-mobile:[&_>_span]:gap-1',
              'max-mobile:[&_>_span_svg]:hidden',
            )}
            data-status={status}
          >
            <span>
              <Icon size={14} />
              {label}
            </span>
            <strong>{value}</strong>
          </div>
        );
      })}
    </div>
  );
}

function TournamentGroup({
  status,
  tournaments,
  weekendId,
  weekendTournaments,
  layout,
}: {
  status: StatusGroup;
  tournaments: LiveTournamentWeekendTournamentEntry[];
  weekendId: string;
  weekendTournaments: LiveTournamentWeekendTournamentEntry[];
  layout: TournamentLayout;
}) {
  const [showAll, setShowAll] = useState(false);
  const shouldLimit = tournaments.length > TOURNAMENT_COLUMN_DEFAULT_LIMIT;
  const visible =
    shouldLimit && !showAll ? tournaments.slice(0, TOURNAMENT_COLUMN_DEFAULT_LIMIT) : tournaments;
  const { title, icon: Icon, empty } = statusDetails[status];
  return (
    <section
      className={cn(
        'live-tournament-group',
        '[&[data-status=running]_.live-tournament-group-heading]:text-[color:var(--live-accent)]',
        '[&[data-status=finished]_.live-tournament-group-heading]:text-[color:var(--live-gold)]',
      )}
      data-status={status}
      aria-label={title}
    >
      <header
        className={cn(
          'live-tournament-group-heading flex items-center gap-2 mb-3 text-muted-foreground',
          '[&_>_span]:ml-auto [&_>_span]:text-[10px]',
        )}
      >
        <Icon size={15} />
        <h3 className="m-0! text-[12px]! font-medium!">{title}</h3>
        <span>{tournaments.length}</span>
      </header>
      {tournaments.length === 0 ? (
        <p
          className={cn(
            'live-quiet-state m-0 py-5.5 px-4 border border-dashed border-border rounded-[12px]',
            'text-muted-foreground text-[12px] leading-[1.8]!',
          )}
        >
          {empty}
        </p>
      ) : (
        <>
          <div
            className={cn(
              'live-tournament-cards grid grid-cols-1 gap-3',
              '@min-[640px]:grid-cols-2',
              'data-[layout=rows]:grid-cols-1 data-[layout=rows]:gap-1.5',
            )}
            data-layout={layout}
          >
            {visible.map(entry => (
              <TournamentCard
                key={entry.tournament.id}
                entry={entry}
                weekendId={weekendId}
                weekendTournaments={weekendTournaments}
                layout={layout}
              />
            ))}
          </div>
          {shouldLimit && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="live-show-events mt-2.5 text-[11px]"
              onClick={() => setShowAll(value => !value)}
            >
              {showAll ? 'Show fewer events' : `Show all ${tournaments.length} events`}
            </Button>
          )}
        </>
      )}
    </section>
  );
}

export function LiveTournamentOverviewSection({
  running,
  finished,
  upcoming,
  weekendId,
  refreshing = false,
}: {
  running: LiveTournamentWeekendTournamentEntry[];
  finished: LiveTournamentWeekendTournamentEntry[];
  upcoming: LiveTournamentWeekendTournamentEntry[];
  weekendId: string;
  refreshing?: boolean;
}) {
  const [filter, setFilter] = useState<'all' | StatusGroup>('all');
  const [layout, setLayout] = useTournamentLayout();
  const tournaments = useMemo(
    () => [...running, ...finished, ...upcoming],
    [running, finished, upcoming],
  );
  const groups = { running, finished, upcoming };
  return (
    <section className="live-events @container min-w-0" aria-label="Weekend tournaments">
      <header
        className={cn(
          'live-events-heading flex items-baseline justify-between flex-wrap gap-2.5 mb-4',
          'max-mobile:gap-y-1 max-mobile:gap-x-2 max-mobile:mb-2.5',
        )}
      >
        <h2
          className={cn(
            'm-0! p-0! border-0! text-[21px]! font-semibold! tracking-[-0.035em]!',
            'max-mobile:text-[19px]!',
          )}
        >
          Tournament centre
        </h2>
        <span className="live-refresh-status inline-flex items-center gap-[5px] text-muted-foreground text-[10px]">
          {refreshing ? (
            <>
              <RefreshCw size={12} className="animate-spin" /> Updating
            </>
          ) : (
            `${tournaments.length} events this weekend`
          )}
        </span>
      </header>
      <div
        className={cn(
          'live-event-toolbar flex items-center flex-wrap gap-2.5 pb-5',
          'max-mobile:gap-1.5 max-mobile:pb-3',
        )}
      >
        <ToggleGroup
          type="single"
          value={filter}
          onValueChange={value => {
            if (
              value === 'all' ||
              value === 'running' ||
              value === 'finished' ||
              value === 'upcoming'
            )
              setFilter(value);
          }}
          className={cn(
            'live-event-filters flex justify-start flex-wrap gap-[5px]',
            '[&_button]:h-8.5 [&_button]:gap-[7px] [&_button]:py-0 [&_button]:px-[11px] [&_button]:border',
            '[&_button]:border-solid [&_button]:border-border [&_button]:rounded-[8px] [&_button]:text-[11px]',
            '[&_button]:text-muted-foreground [&_button]:bg-card [&_button[data-state=off]:hover]:bg-card',
            '[&_button[data-state=on]]:text-[color:var(--live-accent)]',
            '[&_button[data-state=on]]:border-[color:var(--live-line)]',
            '[&_button[data-state=on]]:bg-[var(--live-tint)]',
            '[&_button_span]:text-[10px] [&_button_span]:opacity-75 [&_button_span]:tabular-nums',
            'max-mobile:gap-[5px]',
            'max-mobile:[&_button]:py-0 max-mobile:[&_button]:px-2 max-mobile:[&_button]:text-[10px]',
            'max-mobile:[&_button_span]:text-[9px]',
          )}
          aria-label="Filter tournaments"
        >
          <ToggleGroupItem value="all">
            All events <span>{tournaments.length}</span>
          </ToggleGroupItem>
          {(['running', 'finished', 'upcoming'] as const).map(status => (
            <ToggleGroupItem key={status} value={status}>
              {statusDetails[status].label} <span>{groups[status].length}</span>
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <ToggleGroup
          type="single"
          value={layout}
          onValueChange={value => {
            if (value === 'boxes' || value === 'rows') setLayout(value);
          }}
          className={cn(
            'live-event-layout-switch ml-auto gap-0.5 p-[3px] border border-border rounded-[8px] bg-muted/40',
            '[&_button]:h-7 [&_button]:gap-1.5 [&_button]:py-0 [&_button]:px-[9px] [&_button]:rounded-[5px]',
            '[&_button]:text-[11px] [&_button]:text-muted-foreground',
            '[&_button[data-state=on]]:text-[color:var(--live-accent)] [&_button[data-state=on]]:bg-card',
            '[&_button[data-state=on]]:shadow-[0_1px_3px_#00000015]',
            '@max-[700.01px]:[&_button_span]:hidden',
          )}
          aria-label="Tournament layout"
        >
          <ToggleGroupItem value="boxes" aria-label="Boxes" title="Boxes">
            <LayoutGrid size={14} aria-hidden="true" />
            <span>Boxes</span>
          </ToggleGroupItem>
          <ToggleGroupItem value="rows" aria-label="Rows" title="Rows">
            <Rows3 size={14} aria-hidden="true" />
            <span>Rows</span>
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
      <div className="live-tournament-groups grid gap-6.5">
        {tournaments.length === 0 && filter === 'all' ? (
          <p
            className={cn(
              'live-quiet-state m-0 py-5.5 px-4 border border-dashed border-border rounded-[12px]',
              'text-muted-foreground text-[12px] leading-[1.8]!',
            )}
          >
            Tournaments will appear here as the weekend takes shape.
          </p>
        ) : (
          (['running', 'finished', 'upcoming'] as const)
            .filter(status => filter === status || (filter === 'all' && groups[status].length > 0))
            .map(status => (
              <TournamentGroup
                key={status}
                status={status}
                tournaments={groups[status]}
                weekendId={weekendId}
                weekendTournaments={tournaments}
                layout={layout}
              />
            ))
        )}
      </div>
    </section>
  );
}

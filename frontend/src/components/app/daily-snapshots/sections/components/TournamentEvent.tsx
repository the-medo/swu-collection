import type { ReactNode } from 'react';
import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import { Users } from 'lucide-react';
import Flag from '@/components/app/global/Flag.tsx';
import { cn } from '@/lib/utils.ts';
import type { CountryCode } from '../../../../../../../server/db/lists.ts';
import type { TournamentStringDate } from '../../../../../../../types/Tournament.ts';
import { formatDataById } from '../../../../../../../types/Format.ts';

/** Recent results open inline on wide screens; normal link gestures still work. */
export function TournamentEventLink({
  tournament,
  children,
  className,
  inlineDetails = false,
}: {
  tournament: TournamentStringDate;
  children: ReactNode;
  className?: string;
  inlineDetails?: boolean;
}) {
  const navigate = useNavigate();
  const { maTournamentId } = useSearch({ strict: false });
  const selected = inlineDetails && maTournamentId === tournament.id;

  return (
    <Link
      to="/tournaments/$tournamentId"
      params={{ tournamentId: tournament.id }}
      target={inlineDetails ? '_blank' : undefined}
      rel={inlineDetails ? 'noopener' : undefined}
      className={cn(
        'meta-event-card block min-w-0 border border-solid border-border rounded-[12px] bg-background/45',
        'text-foreground no-underline transition-[border-color,background-color] duration-150 ease-[ease]',
        'hover:border-[color:var(--meta-line)] hover:bg-[var(--meta-tint)]',
        '[&[aria-current=true]]:border-[color:var(--meta-line)] [&[aria-current=true]]:bg-[var(--meta-tint)]',
        'focus-visible:outline-2 focus-visible:outline-[var(--meta-accent)] focus-visible:-outline-offset-2',
        'motion-reduce:transition-none',
        className,
      )}
      aria-current={selected ? 'true' : undefined}
      onClick={event => {
        if (
          !inlineDetails ||
          event.button !== 0 ||
          event.ctrlKey ||
          event.metaKey ||
          event.shiftKey ||
          event.altKey
        )
          return;
        const width =
          document.getElementById('section-container')?.getBoundingClientRect().width ??
          window.innerWidth;
        if (width < 1000) return;
        event.preventDefault();
        void navigate({
          to: '.',
          search: previous => ({ ...previous, maDeckId: undefined, maTournamentId: tournament.id }),
        });
      }}
    >
      {children}
    </Link>
  );
}

export function TournamentEventDetails({
  tournament,
  upcoming = false,
  showDate = false,
}: {
  tournament: TournamentStringDate;
  upcoming?: boolean;
  showDate?: boolean;
}) {
  return (
    <div
      className={cn(
        'meta-event-details flex items-center flex-wrap gap-y-[5px] gap-x-2 text-[10px] leading-[1.4]',
        'text-muted-foreground',
      )}
    >
      {tournament.location && (
        <span
          className={cn(
            'meta-event-location inline-flex items-center gap-1',
            '[&_img]:w-[15px] [&_img]:h-2.5 [&_img]:object-cover',
          )}
        >
          <Flag countryCode={tournament.location as CountryCode} />
          {tournament.location}
        </span>
      )}
      {upcoming && <span>{formatDataById[tournament.format]?.name}</span>}
      {showDate && (
        <time dateTime={tournament.date.slice(0, 10)}>
          {new Date(`${tournament.date.slice(0, 10)}T12:00:00Z`).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            timeZone: 'UTC',
          })}
        </time>
      )}
      {upcoming ? (
        tournament.continent && (
          <span className="meta-event-continent ml-auto">
            {tournament.continent === 'North America' ? 'NA' : tournament.continent}
          </span>
        )
      ) : tournament.attendance > 0 ? (
        <span className="meta-event-attendance inline-flex items-center gap-1 relative ml-auto tabular-nums">
          <Users size={12} aria-hidden="true" />
          {tournament.attendance}
          <span className="sr-only"> players</span>
        </span>
      ) : null}
    </div>
  );
}

export function TournamentDateTile({ date }: { date: string }) {
  const day = date.slice(0, 10);
  const parsed = new Date(`${day}T12:00:00Z`);
  return (
    <time
      className={cn(
        'meta-event-date-tile flex flex-col items-center justify-center flex-[0_0_38px] gap-0.5 min-h-[47px]',
        'border border-[color:var(--meta-line)] rounded-[9px] bg-card text-[color:var(--meta-accent)]',
        'leading-none',
        '[&_>_span]:text-[9px] [&_>_span]:uppercase [&_>_span]:tracking-[0.035em]',
        '[&_>_strong]:text-[21px] [&_>_strong]:font-semibold [&_>_strong]:tracking-[-0.04em]',
      )}
      dateTime={day}
      aria-label={parsed.toLocaleDateString(undefined, { dateStyle: 'long', timeZone: 'UTC' })}
    >
      <span>{parsed.toLocaleDateString(undefined, { month: 'short', timeZone: 'UTC' })}</span>
      <strong>{parsed.getUTCDate()}</strong>
    </time>
  );
}

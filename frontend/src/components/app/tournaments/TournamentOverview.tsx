import { CalendarDays, ExternalLink } from 'lucide-react';
import { addDays, parseISO, startOfDay } from 'date-fns';
import type { TournamentData } from '../../../../../types/Tournament.ts';
import { formatDataById } from '../../../../../types/Format.ts';
import { formatDate, userLocale } from '@/lib/locale.ts';
import { useCountryList } from '@/api/lists/useCountryList.ts';
import Flag from '@/components/app/global/Flag.tsx';
import type { CountryCode } from '../../../../../server/db/lists.ts';
import { cn } from '@/lib/utils.ts';
import { workspaceStyles } from '@/components/app/global/WorkspacePage/workspaceStyles.ts';
import { TournamentSaveControls } from './TournamentSaveControls.tsx';
import { TournamentTravelLinks } from './TournamentTravelLinks.tsx';
import { tournamentLinks } from './pages/TournamentsMap/mapData.ts';
import NoTournamentData from './components/NoTournamentData.tsx';

export function TournamentOverview({ data }: { data: TournamentData }) {
  const { tournament, tournamentType, meta } = data;
  const { data: countryData } = useCountryList();
  const date = parseISO(tournament.date.slice(0, 10));
  // Keep attendance in the present tense through the event's final calendar day.
  const hasEnded =
    addDays(date, Math.max(1, tournament.days)).getTime() <= startOfDay(new Date()).getTime();
  const event = {
    ...tournament,
    coordinates: tournament.coordinates ?? null,
    additionalInfo: tournament.additionalInfo ?? {},
  };
  const countryCode = tournament.location.trim().toUpperCase() as CountryCode;
  const city =
    typeof event.additionalInfo.city === 'string' ? event.additionalInfo.city.trim() : '';
  const country =
    countryData?.countries[countryCode]?.name ||
    (typeof event.additionalInfo.country === 'string' ? event.additionalInfo.country.trim() : '') ||
    tournament.location.trim();
  const location = [city, country].filter(Boolean).join(', ');
  // Melee is already available in the page header; keep any other event resources here.
  const headerMeleeUrl = tournament.meleeId
    ? `https://melee.gg/Tournament/View/${tournament.meleeId}`
    : undefined;
  const links = tournamentLinks(event).filter(link => link.url !== headerMeleeUrl);
  const facts = [
    { label: 'Meta', value: meta?.name ?? '—' },
    { label: 'Season', value: meta ? `${meta.set.toUpperCase()} · Season ${meta.season}` : '—' },
    {
      label: 'Type',
      value: (
        <span className="inline-flex flex-wrap items-center gap-1.5">
          {tournamentType?.name ?? tournament.type}
          {tournamentType?.major === 1 && (
            <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">
              Major
            </span>
          )}
        </span>
      ),
    },
    {
      label: 'Format',
      value: (
        <span className="inline-flex rounded-full border border-primary/15 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
          {formatDataById[tournament.format]?.name ?? '—'}
        </span>
      ),
    },
    {
      label: 'Location',
      value: (
        <span className="flex items-start gap-2">
          <span aria-hidden="true" className="mt-1 shrink-0">
            <Flag countryCode={countryCode} className="w-5 rounded-xs" />
          </span>
          <span className="min-w-0">{location || 'To be confirmed'}</span>
        </span>
      ),
    },
    {
      label: 'Players',
      value:
        tournament.attendance > 0 ? (
          <>
            {tournament.attendance}
            {tournament.days > 1 && tournament.dayTwoPlayerCount != null && (
              <span className="ml-1 text-muted-foreground">
                · {tournament.dayTwoPlayerCount} day two
              </span>
            )}
          </>
        ) : (
          <span className="text-muted-foreground">Not available yet</span>
        ),
    },
  ];
  return (
    <section
      aria-label="Tournament overview"
      className={cn(workspaceStyles.panel, '@container/overview flex flex-col overflow-hidden')}
    >
      <header className="flex items-start justify-between gap-4 px-4 pb-3 pt-4">
        <div className="flex items-center gap-2">
          <CalendarDays className="size-4 shrink-0 text-primary" aria-hidden="true" />
          <h2 className={workspaceStyles.heading}>Overview</h2>
        </div>
        <div className="shrink-0 space-y-1.5 text-xs">
          <time
            dateTime={tournament.date.slice(0, 10)}
            className="flex items-center justify-end gap-2.5"
          >
            <span className="sr-only">Date: {formatDate(date)}</span>
            <span
              aria-hidden="true"
              className="flex size-10 shrink-0 flex-col items-center justify-center rounded-lg border border-primary/15 bg-primary/10 text-primary"
            >
              <span className="text-[8px] font-bold uppercase leading-3 tracking-wider">
                {new Intl.DateTimeFormat(userLocale, { month: 'short' }).format(date)}
              </span>
              <span className="text-lg font-bold leading-5 tabular-nums">{date.getDate()}</span>
            </span>
            <span aria-hidden="true" className="flex flex-col">
              <span className="font-semibold">{date.getFullYear()}</span>
              <span className="text-[11px] text-muted-foreground">
                {new Intl.DateTimeFormat(userLocale, { weekday: 'short' }).format(date)}
              </span>
            </span>
          </time>
          {tournament.days > 1 && (
            <span className="block text-right text-[11px] text-muted-foreground">
              {tournament.days}-day event
            </span>
          )}
        </div>
      </header>
      <dl className="grid grid-cols-1 border-t border-border/60 @min-[28rem]/overview:grid-cols-2">
        {facts.map(({ label, value }) => (
          <div
            key={label}
            className="grid min-w-0 grid-cols-[4.25rem_minmax(0,1fr)] items-start gap-2 border-b border-border/60 px-4 py-2.5 text-xs last:border-b-0 @min-[28rem]/overview:[&:nth-last-child(2)]:border-b-0"
          >
            <dt className="pt-0.5 text-muted-foreground">{label}</dt>
            <dd className="min-w-0 font-medium leading-relaxed [overflow-wrap:anywhere]">
              {value}
            </dd>
          </div>
        ))}
      </dl>
      {!!links.length && (
        <div
          role="group"
          aria-label="Event links"
          className="flex flex-wrap gap-x-3 gap-y-1 px-4 pb-3 text-xs font-medium"
        >
          {links.map(link => (
            <a
              key={link.url}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-sm text-primary hover:underline focus-visible:outline-2 focus-visible:outline-ring"
            >
              {link.label} <ExternalLink className="size-3" aria-hidden="true" />
            </a>
          ))}
        </div>
      )}
      <div className="mx-4 mb-3 empty:hidden">
        <NoTournamentData tournamentId={tournament.id} compact />
      </div>
      <div className="mt-auto flex items-start justify-between gap-3 border-t border-primary/15 bg-primary/[0.07] px-4 py-3">
        <div className="min-w-0 flex-1 pt-1">
          <TournamentTravelLinks tournament={event} />
        </div>
        <TournamentSaveControls
          tournamentId={tournament.id}
          variant="menu"
          hasEnded={hasEnded}
          className="mt-0 max-w-40"
        />
      </div>
    </section>
  );
}

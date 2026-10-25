import { Link } from '@tanstack/react-router';
import { format, parseISO } from 'date-fns';
import { CalendarDays, ExternalLink, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils.ts';
import { Badge } from '@/components/ui/badge.tsx';
import type { TournamentStringDate } from '../../../../../types/Tournament.ts';
import { formatDataById } from '../../../../../types/Format.ts';
import { locationText, mapPinColor, tournamentLinks } from './pages/TournamentsMap/mapData.ts';
import { TournamentSaveControls } from './TournamentSaveControls.tsx';
import { TournamentTravelLinks } from './TournamentTravelLinks.tsx';
import {
  workspaceStyles,
  workspaceTheme,
} from '@/components/app/global/WorkspacePage/workspaceStyles.ts';
import { PortalThemeProvider } from '@/components/ui/portal-theme';

export function TournamentEventInfo({
  tournament,
  linkTitle = true,
  showSaveControls = true,
  simpleRemoval = false,
  onRemovalConfirmationChange,
}: {
  tournament: Pick<
    TournamentStringDate,
    | 'id'
    | 'name'
    | 'format'
    | 'date'
    | 'days'
    | 'location'
    | 'coordinates'
    | 'additionalInfo'
    | 'meleeId'
  >;
  linkTitle?: boolean;
  showSaveControls?: boolean;
  simpleRemoval?: boolean;
  onRemovalConfirmationChange?: (open: boolean) => void;
}) {
  const info = {
    ...tournament,
    coordinates: tournament.coordinates ?? null,
    additionalInfo: tournament.additionalInfo ?? {},
  };
  return (
    <PortalThemeProvider value={workspaceTheme}>
      <div className={cn(workspaceStyles.theme, 'space-y-2.5 text-foreground')}>
        <div className="space-y-1.5">
          <Badge
            variant="outline"
            className="gap-1.5 border-border bg-muted/40 px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
          >
            <span
              className="size-2 rounded-full"
              style={{ backgroundColor: mapPinColor(tournament.format, 0, 12) }}
              aria-hidden="true"
            />
            {formatDataById[tournament.format]?.name ?? 'Tournament'}
          </Badge>
          {linkTitle ? (
            <Link
              to="/tournaments/$tournamentId"
              params={{ tournamentId: tournament.id }}
              className="block rounded-sm text-base font-semibold leading-snug tracking-tight text-foreground [overflow-wrap:anywhere] hover:text-primary focus-visible:outline-2 focus-visible:outline-ring"
            >
              {tournament.name}
            </Link>
          ) : (
            <div className="text-base font-semibold leading-snug tracking-tight [overflow-wrap:anywhere]">
              {tournament.name}
            </div>
          )}
        </div>
        <div className="space-y-1.5 text-xs">
          <div className="flex items-start gap-2">
            <CalendarDays className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden="true" />
            <span className="leading-5">
              <time dateTime={tournament.date.slice(0, 10)}>
                {format(parseISO(tournament.date.slice(0, 10)), 'EEE, MMM d, yyyy')}
              </time>
              {tournament.days > 1 && (
                <span className="ml-1.5 text-muted-foreground">· {tournament.days} days</span>
              )}
            </span>
          </div>
          <div className="flex items-start gap-2">
            <MapPin className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden="true" />
            <div className="min-w-0 space-y-1">
              <p className="m-0 leading-5! text-muted-foreground [overflow-wrap:anywhere]">
                {locationText(info)}
              </p>
              {info.additionalInfo.locationPrecision === 'city' && (
                <p className="m-0 text-[11px] leading-snug! text-muted-foreground">
                  Approximate city location — check the event website for the venue.
                </p>
              )}
              {info.additionalInfo.locationPrecision === 'street' && (
                <p className="m-0 text-[11px] leading-snug! text-muted-foreground">
                  Approximate street location.
                </p>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1 empty:hidden">
          {tournamentLinks(info).map(link => (
            <a
              key={link.url}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-6 items-center gap-1 rounded-sm text-xs font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-ring"
            >
              {link.label}
              <ExternalLink className="size-3 shrink-0" aria-hidden="true" />
            </a>
          ))}
        </div>
        {showSaveControls && (
          <div className="border-t border-border pt-2.5">
            <TournamentSaveControls
              tournamentId={tournament.id}
              simpleRemoval={simpleRemoval}
              onRemovalConfirmationChange={onRemovalConfirmationChange}
              className="mt-0"
            />
          </div>
        )}
        <TournamentTravelLinks tournament={info} />
      </div>
    </PortalThemeProvider>
  );
}

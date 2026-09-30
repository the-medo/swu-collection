import { Link } from '@tanstack/react-router';
import { format, parseISO } from 'date-fns';
import { Check, CircleHelp, MapPin, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover.tsx';
import type { SavedTournament } from '../../../../../../types/UserTournamentSave.ts';
import { formatDataById } from '../../../../../../types/Format.ts';
import { locationText } from '../pages/TournamentsMap/mapData.ts';
import { savedTournamentMarkers } from '../pages/TournamentsMap/savedTournamentMarkers.ts';
import { TournamentPinDetails } from '../pages/TournamentsMap/TournamentPinDetails.tsx';
import { calendarEventEnd } from './calendarData.ts';

const statusIcons = { going: Check, maybe: CircleHelp, saved: Star };

export function TournamentAgenda({ events }: { events: SavedTournament[] }) {
  if (!events.length) return null;
  return (
    <ul aria-label="Tournament agenda" className="divide-y rounded-lg border bg-card">
      {events.map(event => {
        const { tournament, status } = event;
        const end = calendarEventEnd(event);
        const Icon = statusIcons[status];
        return (
          <li
            key={event.tournamentId}
            className="grid min-w-0 gap-3 p-4 sm:grid-cols-[9rem_minmax(0,1fr)_auto]"
          >
            <div className="text-sm font-medium">
              <time dateTime={tournament.date}>
                {format(parseISO(tournament.date), 'EEE, MMM d, yyyy')}
              </time>
              {end !== tournament.date && (
                <div className="text-muted-foreground">
                  – <time dateTime={end}>{format(parseISO(end), 'EEE, MMM d, yyyy')}</time>
                </div>
              )}
            </div>
            <div className="min-w-0 space-y-1.5">
              <Link
                to="/tournaments/$tournamentId"
                params={{ tournamentId: tournament.id }}
                className="block break-words font-semibold leading-snug text-primary hover:underline"
              >
                {tournament.name}
              </Link>
              <p className="m-0 flex items-start gap-1.5 text-sm leading-snug! text-muted-foreground">
                <MapPin className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                <span className="min-w-0 break-words">
                  {locationText(tournament) || 'Location to be announced'}
                </span>
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="gap-1">
                  <Icon className="size-3" aria-hidden="true" />
                  {savedTournamentMarkers[status].label}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {formatDataById[tournament.format]?.name ?? 'Tournament'}
                </span>
              </div>
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="justify-self-start"
                  aria-label={`Details for ${tournament.name}`}
                >
                  Details
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-80 max-w-[calc(100vw-2rem)] p-3"
                aria-label={tournament.name}
              >
                <TournamentPinDetails tournaments={[tournament]} />
              </PopoverContent>
            </Popover>
          </li>
        );
      })}
    </ul>
  );
}

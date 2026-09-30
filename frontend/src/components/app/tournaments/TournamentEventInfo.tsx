import { Link } from '@tanstack/react-router';
import { format, parseISO } from 'date-fns';
import { ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils.ts';
import { Badge } from '@/components/ui/badge.tsx';
import type { TournamentStringDate } from '../../../../../types/Tournament.ts';
import { formatDataById } from '../../../../../types/Format.ts';
import { locationText, mapPinColor, tournamentLinks } from './pages/TournamentsMap/mapData.ts';
import { TournamentSaveControls } from './TournamentSaveControls.tsx';
import { TournamentTravelLinks } from './TournamentTravelLinks.tsx';

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
    <div className="flex min-w-0 flex-col items-start gap-1">
      <Badge
        variant="outline"
        className={cn(
          'border-transparent leading-tight',
          tournament.format === 3 ? 'text-white' : 'text-neutral-900',
        )}
        style={{ backgroundColor: mapPinColor(tournament.format, 0, 12) }}
      >
        {formatDataById[tournament.format]?.name ?? 'Tournament'}
      </Badge>
      {linkTitle ? (
        <Link
          to="/tournaments/$tournamentId"
          params={{ tournamentId: tournament.id }}
          className="block text-lg font-semibold leading-tight text-primary hover:underline"
        >
          {tournament.name}
        </Link>
      ) : (
        <div className="text-lg font-semibold leading-tight">{tournament.name}</div>
      )}
      <p className="m-0 text-sm leading-snug!">
        {format(parseISO(tournament.date.slice(0, 10)), 'EEE, MMM d, yyyy')}
      </p>
      <p className="m-0 break-words text-sm leading-snug! text-muted-foreground">
        {locationText(info)}
      </p>
      {info.additionalInfo.locationPrecision === 'city' && (
        <p className="m-0 text-xs leading-snug! text-muted-foreground">
          Approximate city location — check the event website for the venue.
        </p>
      )}
      {info.additionalInfo.locationPrecision === 'street' && (
        <p className="m-0 text-xs leading-snug! text-muted-foreground">
          Approximate street location.
        </p>
      )}
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {tournamentLinks(info).map(link => (
          <a
            key={link.url}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm leading-snug text-primary hover:underline"
          >
            {link.label}
            <ExternalLink className="h-3 w-3" />
          </a>
        ))}
      </div>
      {showSaveControls && (
        <TournamentSaveControls
          tournamentId={tournament.id}
          simpleRemoval={simpleRemoval}
          onRemovalConfirmationChange={onRemovalConfirmationChange}
        />
      )}
      <TournamentTravelLinks tournament={info} />
    </div>
  );
}

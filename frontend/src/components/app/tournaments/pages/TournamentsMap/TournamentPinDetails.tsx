import { Link } from '@tanstack/react-router';
import { format, parseISO } from 'date-fns';
import { ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils.ts';
import { Badge } from '@/components/ui/badge.tsx';
import type { MapTournament } from '../../../../../../../types/TournamentMap.ts';
import { formatDataById } from '../../../../../../../types/Format.ts';
import { locationText, mapPinColor, tournamentLinks } from './mapData.ts';
import { TournamentSaveControls } from '../../TournamentSaveControls.tsx';

export function TournamentPinDetails({ tournaments }: { tournaments: MapTournament[] }) {
  return (
    <div className="max-h-72 space-y-3 overflow-y-auto pr-3" aria-label="Tournament details">
      {tournaments.map(t => (
        <article
          key={t.id}
          className="flex flex-col items-start gap-1 border-b pb-2 last:border-0 last:pb-0"
        >
          <Badge
            variant="outline"
            className={cn(
              'border-transparent leading-tight',
              t.format === 3 ? 'text-white' : 'text-neutral-900',
            )}
            style={{ backgroundColor: mapPinColor(t.format, 0, 12) }}
          >
            {formatDataById[t.format]?.name ?? 'Tournament'}
          </Badge>
          <Link
            to="/tournaments/$tournamentId"
            params={{ tournamentId: t.id }}
            className="block text-lg font-semibold leading-tight text-primary hover:underline"
          >
            {t.name}
          </Link>
          <p className="m-0 text-sm leading-snug!">
            {format(parseISO(t.date), 'EEE, MMM d, yyyy')}
          </p>
          <p className="m-0 text-sm leading-snug! text-muted-foreground">{locationText(t)}</p>
          {t.additionalInfo.locationPrecision === 'city' && (
            <p className="m-0 text-xs leading-snug! text-muted-foreground">
              Approximate city location — check the event website for the venue.
            </p>
          )}
          {t.additionalInfo.locationPrecision === 'street' && (
            <p className="m-0 text-xs leading-snug! text-muted-foreground">
              Approximate street location.
            </p>
          )}
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {tournamentLinks(t).map(link => (
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
          <TournamentSaveControls tournamentId={t.id} />
        </article>
      ))}
    </div>
  );
}

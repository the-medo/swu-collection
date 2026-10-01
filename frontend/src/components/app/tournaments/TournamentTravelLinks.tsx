import { House, Map } from 'lucide-react';
import { useHomeLocation } from '@/api/user/useHomeLocation.ts';
import { Button } from '@/components/ui/button.tsx';
import type { MapTournament } from '../../../../../types/TournamentMap.ts';
import { accommodationLinks, googleMapsUrl } from './travelLinks.ts';

export function TournamentTravelLinks({
  tournament,
}: {
  tournament: Pick<MapTournament, 'location' | 'coordinates' | 'additionalInfo' | 'date' | 'days'>;
}) {
  // Reuse the map/page's private cache without a GET for every newly opened tooltip.
  const home = useHomeLocation({ refetchOnMount: false });
  const stays = accommodationLinks(tournament);
  if (!googleMapsUrl(tournament)) return null;
  return (
    <div
      className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm"
      role="group"
      aria-label="Travel and accommodation"
    >
      <Button
        type="button"
        variant="link"
        className="h-auto justify-start gap-1.5 p-0 text-sm leading-snug"
        onClick={() => {
          // Build the private origin only on click; keep it out of DOM/link analytics.
          const url = googleMapsUrl(tournament, home.data?.coordinates);
          if (url) window.open(url, '_blank', 'noopener,noreferrer');
        }}
      >
        <Map className="size-3.5 shrink-0" aria-hidden="true" />
        Google Maps
      </Button>
      {stays && (
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
          <House className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <a
            href={stays.airbnb}
            target="_blank"
            rel="noopener noreferrer"
            title={`Find stays: ${stays.checkin} to ${stays.checkout}`}
            className="text-primary hover:underline"
          >
            Airbnb
          </a>
          <span aria-hidden="true" className="text-muted-foreground">
            ·
          </span>
          <a
            href={stays.booking}
            target="_blank"
            rel="noopener noreferrer"
            title={`Find stays: ${stays.checkin} to ${stays.checkout}`}
            className="text-primary hover:underline"
          >
            Booking.com
          </a>
        </div>
      )}
    </div>
  );
}

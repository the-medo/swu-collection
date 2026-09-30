import { addDays, format, parseISO } from 'date-fns';
import type { MapTournament } from '../../../../../types/TournamentMap.ts';
import type { TournamentCoordinates } from '../../../../../types/TournamentLocation.ts';
import { locationText } from './pages/TournamentsMap/mapData.ts';

type TravelTournament = Pick<
  MapTournament,
  'location' | 'coordinates' | 'additionalInfo' | 'date' | 'days'
>;

function coordinates(point: TournamentCoordinates | null | undefined) {
  return point &&
    Number.isFinite(point.x) &&
    Number.isFinite(point.y) &&
    Math.abs(point.x) <= 180 &&
    Math.abs(point.y) <= 90
    ? `${point.y},${point.x}`
    : null;
}

export function googleMapsUrl(tournament: TravelTournament, home?: TournamentCoordinates | null) {
  const location = locationText(tournament).trim();
  const approximate = ['city', 'street'].includes(
    String(tournament.additionalInfo.locationPrecision),
  );
  const destination =
    approximate && location ? location : coordinates(tournament.coordinates) || location;
  if (!destination) return null;
  const origin = coordinates(home);
  const url = new URL(`https://www.google.com/maps/${origin ? 'dir' : 'search'}/`);
  url.searchParams.set('api', '1');
  if (origin) {
    url.searchParams.set('origin', origin);
    url.searchParams.set('destination', destination);
  } else url.searchParams.set('query', destination);
  return url.href;
}

export function accommodationLinks(
  tournament: TravelTournament,
  today = format(new Date(), 'yyyy-MM-dd'),
) {
  const location =
    ['city', 'state', 'country']
      .map(key => tournament.additionalInfo[key])
      .filter((value): value is string => typeof value === 'string' && !!value.trim())
      .join(', ') || tournament.location.trim();
  const point = coordinates(tournament.coordinates) ? tournament.coordinates : null;
  if (!location && !point) return null;
  // Detail responses serialize the PostgreSQL DATE as midnight UTC; the map uses YYYY-MM-DD.
  // Both represent a calendar date, independent of the viewer's timezone.
  const start = tournament.date.slice(0, 10);
  const checkout = format(addDays(parseISO(start), Math.max(1, tournament.days)), 'yyyy-MM-dd');
  if (checkout <= today) return null;
  const checkin = start < today ? today : start;
  const airbnb = new URL('https://www.airbnb.com/s/homes');
  const booking = new URL('https://www.booking.com/searchresults.html');
  // Plain search links. Affiliate tracking requires an approved partner account.
  airbnb.searchParams.set('query', location || coordinates(point)!);
  if (!point) booking.searchParams.set('ss', location);
  for (const url of [airbnb, booking]) {
    url.searchParams.set('checkin', checkin);
    url.searchParams.set('checkout', checkout);
  }
  airbnb.searchParams.set('adults', '1');
  booking.searchParams.set('group_adults', '1');
  booking.searchParams.set('group_children', '0');
  booking.searchParams.set('no_rooms', '1');
  if (point) {
    airbnb.searchParams.set('lat', String(point.y));
    airbnb.searchParams.set('lng', String(point.x));
    booking.searchParams.set('dest_type', 'latlong');
    booking.searchParams.set('latitude', String(point.y));
    booking.searchParams.set('longitude', String(point.x));
  }
  return { airbnb: airbnb.href, booking: booking.href, checkin, checkout };
}

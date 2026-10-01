import { z } from 'zod';
import type { TournamentAdditionalInfo } from '../../../types/TournamentLocation.ts';
import { zTournamentCoordinates } from '../../../types/TournamentLocation.ts';

export class TournamentLocationError extends Error {
  constructor(
    message: string,
    public readonly status: 400 | 404 | 409 | 429 | 502 | 503,
  ) {
    super(message);
  }
}

const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

export function locationInput(info: TournamentAdditionalInfo, country: string) {
  return {
    address: text(info.address),
    city: text(info.city),
    state: text(info.state),
    postalCode: text(info.postalCode),
    country: country.trim().toLowerCase(),
  };
}

export function clearGeocoding(info: TournamentAdditionalInfo): TournamentAdditionalInfo {
  const copy = { ...info };
  delete copy.geocoding;
  delete copy.locationPrecision;
  return copy;
}

const zResult = z.object({
  lat: z.number(),
  lon: z.number(),
  country_code: z.string(),
  formatted: z.string(),
  result_type: z.string(),
  rank: z.object({ confidence: z.number() }),
  datasource: z
    .object({ attribution: z.string().optional(), sourcename: z.string().optional() })
    .optional(),
});

// Bound the wait as well as the request duration when multiple admins use this process.
let nextRequestAt = 0;
async function reserveRequest() {
  const delay = Math.max(0, nextRequestAt - Date.now());
  if (delay > 2000)
    throw new TournamentLocationError('Geocoding is busy. Please retry shortly.', 429);
  nextRequestAt = Date.now() + delay + 300;
  if (delay) await new Promise(resolve => setTimeout(resolve, delay));
}

export async function geocodeTournament(
  info: TournamentAdditionalInfo,
  country: string,
  options: { apiKey?: string; fetcher?: typeof fetch; reserve?: () => Promise<void> } = {},
) {
  const input = locationInput(info, country);
  if (!input.address && !input.city)
    throw new TournamentLocationError('Add an address or city to additional info first.', 400);
  if (!/^[a-z]{2}$/.test(input.country))
    throw new TournamentLocationError(
      'Set the tournament country to a two-letter country code.',
      400,
    );
  const apiKey = options.apiKey ?? process.env.GEOAPIFY_API_KEY;
  if (!apiKey)
    throw new TournamentLocationError('Configure GEOAPIFY_API_KEY on the server first.', 503);
  const query = [input.address, input.city, input.state, input.postalCode]
    .filter(Boolean)
    .join(', ');
  const url = new URL('https://api.geoapify.com/v1/geocode/search');
  url.search = new URLSearchParams({
    text: query,
    filter: `countrycode:${input.country}`,
    format: 'json',
    limit: '2',
    apiKey,
  }).toString();
  if (!input.address) url.searchParams.set('type', 'city');
  await (options.reserve ?? reserveRequest)();
  let response: Response;
  try {
    response = await (options.fetcher ?? fetch)(url, { signal: AbortSignal.timeout(10_000) });
  } catch {
    throw new TournamentLocationError(
      'The geocoding service could not be reached. Please retry.',
      502,
    );
  }
  if (response.status === 429)
    throw new TournamentLocationError('Geocoding request limit reached. Please retry later.', 429);
  if (response.status === 401 || response.status === 403)
    throw new TournamentLocationError('The geocoding service rejected the server API key.', 503);
  if (!response.ok)
    throw new TournamentLocationError('The geocoding service failed. Please retry.', 502);
  const payload = await response.json().catch(() => null);
  const parsed = z.object({ results: z.array(zResult) }).safeParse(payload);
  if (!parsed.success)
    throw new TournamentLocationError('Invalid response from the geocoding service.', 502);
  const [match, second] = parsed.data.results;
  if (!match)
    throw new TournamentLocationError('No location found. Check the address or city.', 400);
  const point = zTournamentCoordinates.safeParse({ x: match.lon, y: match.lat });
  const precision = ['building', 'amenity'].includes(match.result_type)
    ? 'address'
    : match.result_type === 'street'
      ? 'street'
      : ['city', 'district', 'suburb', 'postcode'].includes(match.result_type)
        ? 'city'
        : null;
  if (
    !point.success ||
    match.country_code.toLowerCase() !== input.country ||
    !precision ||
    match.rank.confidence < 0.7 ||
    (!input.address && precision !== 'city') ||
    (input.address && precision === 'city')
  )
    throw new TournamentLocationError(
      'No reliable location found. Add a more complete address or city.',
      400,
    );
  // City searches are ranked by popularity. Equal confidence in two matching
  // place names does not mean the top city center is unusable as an approximation.
  // Keep the stricter ambiguity check for street-address lookups.
  if (
    input.address &&
    second &&
    second.rank.confidence >= match.rank.confidence - 0.05 &&
    (Math.abs(second.lat - match.lat) > 0.01 || Math.abs(second.lon - match.lon) > 0.01)
  )
    throw new TournamentLocationError(
      'The location is ambiguous. Add a state, postal code, or full address.',
      400,
    );
  return {
    coordinates: point.data,
    additionalInfo: {
      ...info,
      locationPrecision: input.address ? precision : 'city',
      geocoding: {
        provider: 'geoapify',
        query,
        formattedAddress: match.formatted,
        resultType: match.result_type,
        confidence: match.rank.confidence,
        computedAt: new Date().toISOString(),
        attribution:
          match.datasource?.attribution || 'Powered by Geoapify | © OpenStreetMap contributors',
      },
    } satisfies TournamentAdditionalInfo,
  };
}

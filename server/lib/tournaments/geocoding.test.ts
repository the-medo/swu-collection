import { expect, test } from 'bun:test';
import { clearGeocoding, geocodeTournament, locationInput } from './geocoding.ts';

const match = {
  lat: 48.8566,
  lon: 2.3522,
  country_code: 'fr',
  formatted: '10 Rue Test, Paris, France',
  result_type: 'building',
  rank: { confidence: 1 },
  datasource: { attribution: '© OpenStreetMap contributors' },
};
const options = (results: unknown[] = [match], status = 200) => ({
  apiKey: 'test-only',
  reserve: async () => {},
  fetcher: (async () => Response.json({ results }, { status })) as typeof fetch,
});

test('geocodes country-filtered address and saves longitude first, precision, links and attribution', async () => {
  let request: URL | undefined;
  const opts = options();
  opts.fetcher = (async input => {
    request = new URL(String(input));
    return Response.json({ results: [match] });
  }) as typeof fetch;
  const result = await geocodeTournament(
    {
      address: ' 10 Rue Test ',
      city: 'Paris',
      links: [{ url: 'https://melee.gg/Tournament/View/1' }],
    },
    'FR',
    opts,
  );
  expect(request?.searchParams.get('text')).toBe('10 Rue Test, Paris');
  expect(request?.searchParams.get('filter')).toBe('countrycode:fr');
  expect(result.coordinates).toEqual({ x: 2.3522, y: 48.8566 });
  expect(result.additionalInfo.locationPrecision).toBe('address');
  expect(result.additionalInfo.links).toHaveLength(1);
  expect(result.additionalInfo.geocoding).toMatchObject({
    provider: 'geoapify',
    attribution: '© OpenStreetMap contributors',
  });
  expect(JSON.stringify(result)).not.toContain('test-only');
});

test('city-only input is marked approximate; an address cannot silently fall back to a city', async () => {
  const result = await geocodeTournament(
    { city: 'Paris' },
    'FR',
    options([{ ...match, result_type: 'city' }]),
  );
  expect(result.additionalInfo.locationPrecision).toBe('city');
  await expect(
    geocodeTournament(
      { address: '10 Missing Street', city: 'Paris' },
      'FR',
      options([{ ...match, result_type: 'city' }]),
    ),
  ).rejects.toMatchObject({ status: 400 });
});

test('uses the highest-ranked city center when another place has the same name and confidence', async () => {
  const saoPaulo = {
    ...match,
    lat: -23.5506507,
    lon: -46.6333824,
    country_code: 'br',
    formatted: 'São Paulo, SP, Brazil',
    result_type: 'city',
  };
  let request: URL | undefined;
  const opts = options();
  opts.fetcher = (async input => {
    request = new URL(String(input));
    return Response.json({
      results: [
        saoPaulo,
        {
          ...saoPaulo,
          lat: -1.2043218,
          lon: -47.1583944,
          formatted: 'São Paulo, Capanema, PA, Brazil',
          result_type: 'suburb',
        },
      ],
    });
  }) as typeof fetch;
  const result = await geocodeTournament({ city: 'São Paulo', country: 'Brazil' }, 'BR', opts);
  expect(request?.searchParams.get('type')).toBe('city');
  expect(request?.searchParams.get('filter')).toBe('countrycode:br');
  expect(result.coordinates).toEqual({ x: saoPaulo.lon, y: saoPaulo.lat });
  expect(result.additionalInfo.locationPrecision).toBe('city');
  expect(result.additionalInfo.geocoding).toMatchObject({ formattedAddress: saoPaulo.formatted });
});

test('still rejects similarly ranked street addresses in different locations', async () => {
  await expect(
    geocodeTournament(
      { address: '10 Rue Test', city: 'Paris' },
      'FR',
      options([match, { ...match, lat: 46 }]),
    ),
  ).rejects.toMatchObject({
    status: 400,
    message: 'The location is ambiguous. Add a state, postal code, or full address.',
  });
});

test('rejects no match, uncertain, wrong-country, out-of-range and non-city results', async () => {
  const city = { ...match, result_type: 'city' };
  for (const results of [
    [],
    [{ ...city, rank: { confidence: 0.5 } }],
    [{ ...city, country_code: 'de' }],
    [{ ...city, lat: 91 }],
    [{ ...city, result_type: 'country' }],
    [match],
  ]) {
    await expect(
      geocodeTournament({ city: 'Paris' }, 'FR', options(results)),
    ).rejects.toMatchObject({ status: 400 });
  }
});

test('rejects missing input/key before making any external request', async () => {
  const opts = options();
  opts.fetcher = (async () => {
    throw new Error('Should never fetch');
  }) as typeof fetch;
  await expect(
    geocodeTournament({ storeUrl: 'https://example.com' }, 'FR', opts),
  ).rejects.toMatchObject({ status: 400 });
  await expect(geocodeTournament({ city: 'Paris' }, 'France', opts)).rejects.toMatchObject({
    status: 400,
  });
  await expect(
    geocodeTournament({ city: 'Paris' }, 'FR', { ...opts, apiKey: '' }),
  ).rejects.toMatchObject({ status: 503 });
});

test('provider and network failures produce safe actionable errors', async () => {
  for (const [upstream, expected] of [
    [429, 429],
    [401, 503],
    [403, 503],
    [500, 502],
  ]) {
    await expect(
      geocodeTournament({ city: 'Paris' }, 'FR', options([], upstream)),
    ).rejects.toMatchObject({ status: expected });
  }
  const opts = options();
  opts.fetcher = (async () => {
    throw new Error('secret API URL');
  }) as typeof fetch;
  await expect(geocodeTournament({ city: 'Paris' }, 'FR', opts)).rejects.toMatchObject({
    status: 502,
    message: 'The geocoding service could not be reached. Please retry.',
  });
  await expect(geocodeTournament({ city: 'Paris' }, 'FR', options([{}]))).rejects.toMatchObject({
    status: 502,
  });
});

test('address comparison ignores unrelated fields and clearing preserves links', () => {
  expect(locationInput({ address: ' Test ', city: 'Paris', storeUrl: 'changed' }, 'FR')).toEqual(
    locationInput({ address: 'Test', city: 'Paris' }, 'fr'),
  );
  expect(
    clearGeocoding({ city: 'Paris', links: [], locationPrecision: 'city', geocoding: {} }),
  ).toEqual({ city: 'Paris', links: [] });
});

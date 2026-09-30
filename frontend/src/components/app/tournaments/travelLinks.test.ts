import { expect, test } from 'bun:test';
import { accommodationLinks, googleMapsUrl } from './travelLinks.ts';

const tournament = {
  location: 'Paris, France',
  coordinates: { x: 2.35, y: 48.85 },
  additionalInfo: {},
  date: '2026-10-31',
  days: 3,
};

test('Google Maps uses latitude/longitude and only includes an origin when home exists', () => {
  const search = new URL(googleMapsUrl(tournament)!);
  expect(search.pathname).toBe('/maps/search/');
  expect(search.searchParams.get('api')).toBe('1');
  expect(search.searchParams.get('query')).toBe('48.85,2.35');
  expect(search.searchParams.has('origin')).toBe(false);
  const route = new URL(googleMapsUrl(tournament, { x: 0, y: 0 })!);
  expect(route.pathname).toBe('/maps/dir/');
  expect(route.searchParams.get('origin')).toBe('0,0');
  expect(route.searchParams.get('destination')).toBe('48.85,2.35');
});

test('travel links encode address fallbacks and omit unusable locations', () => {
  const fallback = {
    ...tournament,
    coordinates: null,
    additionalInfo: { address: 'Rue A & B', city: 'São Paulo', country: 'Brazil' },
  };
  expect(new URL(googleMapsUrl(fallback)!).searchParams.get('query')).toBe(
    'Rue A & B, São Paulo, Brazil',
  );
  expect(new URL(accommodationLinks(fallback, '2026-10-01')!.booking).searchParams.get('ss')).toBe(
    'São Paulo, Brazil',
  );
  const unknown = { ...tournament, location: '', coordinates: { x: 200, y: 30 } };
  expect(googleMapsUrl(unknown)).toBeNull();
  expect(accommodationLinks(unknown)).toBeNull();
  expect(new URL(googleMapsUrl(tournament, { x: NaN, y: 3 })!).pathname).toBe('/maps/search/');
});

test('Google Maps searches venue details instead of routing to an approximate city center', () => {
  const approximate = {
    ...tournament,
    additionalInfo: {
      locationPrecision: 'city',
      venueName: 'Game Store',
      address: '10 Rue Example',
      city: 'Paris',
    },
  };
  for (const home of [null, { x: 2, y: 49 }]) {
    const url = new URL(googleMapsUrl(approximate, home)!);
    expect(url.searchParams.get(home ? 'destination' : 'query')).toBe(
      'Game Store, 10 Rue Example, Paris',
    );
  }
  expect(
    new URL(
      googleMapsUrl({
        ...approximate,
        location: '',
        additionalInfo: { locationPrecision: 'city' },
      })!,
    ).searchParams.get('query'),
  ).toBe('48.85,2.35');
});

test('stays span the tournament with an exclusive checkout across month/year and leap-day boundaries', () => {
  for (const [date, days, checkout] of [
    ['2026-10-31', 3, '2026-11-03'],
    ['2026-12-31', 2, '2027-01-02'],
    ['2028-02-28', 2, '2028-03-01'],
    ['2026-10-25', 1, '2026-10-26'],
    ['2026-10-31T00:00:00.000Z', 3, '2026-11-03'],
  ] as const) {
    const links = accommodationLinks({ ...tournament, date, days }, '2026-10-01')!;
    for (const link of [links.airbnb, links.booking]) {
      const url = new URL(link);
      expect(url.searchParams.get('checkin')).toBe(date.slice(0, 10));
      expect(url.searchParams.get('checkout')).toBe(checkout);
      expect(url.searchParams.has('origin')).toBe(false);
      expect(url.searchParams.has('aid')).toBe(false);
    }
  }
  const links = accommodationLinks(tournament, '2026-10-01')!;
  expect(new URL(links.airbnb).searchParams.get('lat')).toBe('48.85');
  expect(new URL(links.booking).searchParams.get('dest_type')).toBe('latlong');
  expect(new URL(links.booking).searchParams.has('ss')).toBe(false);
  expect(new URL(links.booking).searchParams.get('longitude')).toBe('2.35');
});

test('past stays are hidden and ongoing tournaments search only the remaining nights', () => {
  expect(accommodationLinks(tournament, '2026-11-03')).toBeNull();
  expect(accommodationLinks(tournament, '2027-01-01')).toBeNull();
  const ongoing = accommodationLinks(tournament, '2026-11-01')!;
  expect(ongoing.checkin).toBe('2026-11-01');
  expect(ongoing.checkout).toBe('2026-11-03');
  expect(googleMapsUrl(tournament)).not.toBeNull();
});

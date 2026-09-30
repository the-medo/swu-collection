import { expect, test } from 'bun:test';
import { Hono } from 'hono';
import type { AuthExtension } from '../auth/auth.ts';
import { createHomeLocationRoute } from '../routes/user-settings/home-location.ts';
import {
  homeLocationInputSchema,
  parseHomeLocation,
  type HomeLocation,
} from '../../shared/lib/userHomeLocation.ts';
import { TournamentLocationError } from './tournaments/geocoding.ts';

const saved: HomeLocation = {
  input: { address: '', city: 'Paris', state: '', postalCode: '', country: 'FR' },
  coordinates: { x: 2.35, y: 48.85 },
  formattedAddress: 'Paris, France',
  precision: 'city',
  updatedAt: '2026-09-30T00:00:00Z',
};

test('home settings normalize input and validate private JSON and coordinates', () => {
  expect(homeLocationInputSchema.parse({ city: ' Paris ', country: 'fr' })).toEqual(saved.input);
  expect(homeLocationInputSchema.safeParse({ city: '', country: 'FR' }).success).toBe(false);
  expect(parseHomeLocation(JSON.stringify(saved))).toEqual(saved);
  expect(parseHomeLocation('{')).toBeNull();
  expect(parseHomeLocation(undefined)).toBeNull();
  expect(
    parseHomeLocation(JSON.stringify({ ...saved, coordinates: { x: 200, y: 95 } })),
  ).toBeNull();
});

test('home API requires a session, owns writes, rejects coordinates, and preserves safe geocoding errors', async () => {
  const calls: string[] = [];
  let fail = false;
  const service = {
    get: async (id: string) => {
      calls.push(id);
      return saved;
    },
    save: async (id: string, input: HomeLocation['input'] | null) => {
      calls.push(id);
      if (fail) throw new TournamentLocationError('Location not found.', 400);
      return input ? saved : null;
    },
  };
  const route = createHomeLocationRoute(service);
  const anonymous = new Hono<AuthExtension>().route('/home', route);
  expect((await anonymous.request('/home')).status).toBe(401);
  expect((await anonymous.request('/home', { method: 'POST', body: '{}' })).status).toBe(401);
  expect(calls).toEqual([]);
  const app = new Hono<AuthExtension>()
    .use('*', async (c, next) => {
      c.set('user', { id: 'account-a' } as NonNullable<AuthExtension['Variables']['user']>);
      await next();
    })
    .route('/home', route);
  const post = (body: unknown) =>
    app.request('/home', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  const get = await app.request('/home');
  expect(get.headers.get('Cache-Control')).toBe('private, no-store');
  expect(await get.json()).toEqual({ data: saved });
  expect((await post({ location: saved.input, userId: 'account-b' })).status).toBe(400);
  expect(
    (await post({ location: { ...saved.input, coordinates: saved.coordinates } })).status,
  ).toBe(400);
  expect((await post({ location: { city: '', country: 'FR' } })).status).toBe(400);
  expect((await post({ location: saved.input })).status).toBe(200);
  expect(await (await post({ location: null })).json()).toEqual({ data: null });
  expect(calls).toEqual(['account-a', 'account-a', 'account-a']);
  fail = true;
  expect(await (await post({ location: saved.input })).json()).toEqual({
    error: 'Location not found.',
  });
});

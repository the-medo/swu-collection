import { describe, expect, test } from 'bun:test';
import { Hono } from 'hono';
import type { AuthExtension } from '../auth/auth.ts';
import { createBattlefieldPresetsRoute } from './battlefield-presets.ts';
import { BattlefieldError } from '../lib/battlefield/service.ts';
import {
  defaultBattlefieldScene,
  type BattlefieldPresetInput,
  type BattlefieldPresetSaveInput,
  type BattlefieldShowcaseFilters,
} from '../../shared/types/battlefield.ts';

const id = crypto.randomUUID();
const input = { name: 'Fleet', scene: defaultBattlefieldScene() };
function fixture(viewer: 'admin' | 'user' | null, failure?: BattlefieldError) {
  const calls: unknown[][] = [];
  const service = {
    async list(page: number, filters: BattlefieldShowcaseFilters, userId?: string) {
      calls.push(['list', page, filters, userId]);
      return { presets: [], total: 0, page, pageSize: 3 };
    },
    async get(id: string) {
      calls.push(['get', id]);
      if (failure) throw failure;
      return { ...input, id, cost: 0, factions: [], revision: 0 };
    },
    async create(value: BattlefieldPresetInput) {
      calls.push(['create', value]);
      if (failure) throw failure;
      return { ...value, factions: value.factions ?? [], id, cost: 0, revision: 0 };
    },
    async save(id: string, value: BattlefieldPresetSaveInput) {
      calls.push(['save', id, value]);
      if (failure) throw failure;
      return { ...value, id, cost: 0, revision: value.revision + 1 };
    },
    async remove(id: string) {
      calls.push(['remove', id]);
      if (failure) throw failure;
      return { id };
    },
  };
  const app = new Hono<AuthExtension>()
    .use('*', async (c, next) => {
      c.set(
        'user',
        viewer ? ({ id: viewer } as NonNullable<AuthExtension['Variables']['user']>) : null,
      );
      await next();
    })
    .route(
      '/',
      createBattlefieldPresetsRoute(service, async c => {
        const user = c.get('user');
        if (!user)
          return { user: null, response: c.json({ message: 'Unauthorized' }, 401) } as const;
        if (user.id !== 'admin')
          return { user: null, response: c.json({ message: 'Forbidden' }, 403) } as const;
        return { user, response: null } as const;
      }),
    );
  const send = (
    body: unknown,
    headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Requested-With': 'swubase',
    },
  ) => app.request('/', { method: 'POST', body: JSON.stringify(body), headers });
  return { app, send, calls };
}
describe('Battlefield preset HTTP boundaries', () => {
  test('showcase and individual presets are public, paginated, validated and never cached', async () => {
    const { app, calls } = fixture(null);
    const response = await app.request('/?page=2');
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect((await response.json()).data).toEqual({ presets: [], total: 0, page: 2, pageSize: 3 });
    expect((await app.request('/')).status).toBe(200);
    expect((await app.request('/' + id)).status).toBe(200);
    expect(calls).toEqual([
      ['list', 2, { search: '', faction: 'all', withinCredits: false, sort: 'newest' }, undefined],
      ['list', 1, { search: '', faction: 'all', withinCredits: false, sort: 'newest' }, undefined],
      ['get', id],
    ]);
    for (const page of ['0', '-1', '1.5', 'abc', '1000001'])
      expect((await app.request('/?page=' + page)).status).toBe(400);
    expect((await app.request('/not-a-uuid')).status).toBe(400);
    expect(calls).toHaveLength(3);
    expect(
      (await fixture(null, new BattlefieldError('Preset not found.', 404)).app.request('/' + id))
        .status,
    ).toBe(404);
  });
  test('administrator permission and origin checks precede input validation', async () => {
    for (const [viewer, status] of [
      [null, 401],
      ['user', 403],
    ] as const) {
      const { send, calls } = fixture(viewer);
      expect((await send({ bad: true })).status).toBe(status);
      expect(calls).toHaveLength(0);
    }
    const { send, calls } = fixture('admin');
    expect((await send(input, { 'Content-Type': 'application/json' })).status).toBe(403);
    for (const value of [
      { ...input, name: ' ' },
      { ...input, cost: 0 },
      { ...input, userId: 'victim' },
      { ...input, scene: { ...input.scene, width: 3200 } },
    ])
      expect((await send(value)).status).toBe(400);
    expect(
      (
        await send(
          { name: 'x'.repeat(500001) },
          {
            'Content-Type': 'application/json',
            'X-Requested-With': 'swubase',
            'Content-Length': '500012',
          },
        )
      ).status,
    ).toBe(413);
    expect(calls).toHaveLength(0);
    const response = await send({ ...input, name: ' Fleet ' });
    expect(response.status).toBe(201);
    expect(calls).toEqual([['create', { ...input, factions: [] }]]);
  });
  test('known business failures retain their safe status and message', async () => {
    for (const status of [400, 404, 409] as const) {
      const response = await fixture('admin', new BattlefieldError('Safe failure.', status)).send(
        input,
      );
      expect(response.status).toBe(status);
      expect(await response.json()).toEqual({ message: 'Safe failure.' });
    }
  });
  test('only administrators can delete presets, with origin, UUID and safe not-found handling', async () => {
    for (const [viewer, status] of [
      [null, 401],
      ['user', 403],
    ] as const) {
      const { app, calls } = fixture(viewer);
      expect(
        (
          await app.request('/bad-id', {
            method: 'DELETE',
            headers: { 'X-Requested-With': 'swubase' },
          })
        ).status,
      ).toBe(status);
      expect(calls).toHaveLength(0);
    }
    const { app, calls } = fixture('admin');
    expect((await app.request('/' + id, { method: 'DELETE' })).status).toBe(403);
    expect(
      (
        await app.request('/bad-id', {
          method: 'DELETE',
          headers: { 'X-Requested-With': 'swubase' },
        })
      ).status,
    ).toBe(400);
    expect(calls).toHaveLength(0);
    const response = await app.request('/' + id, {
      method: 'DELETE',
      headers: { 'X-Requested-With': 'swubase' },
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: { id } });
    expect(calls).toEqual([['remove', id]]);
    const missing = await fixture(
      'admin',
      new BattlefieldError('Preset not found.', 404),
    ).app.request('/' + id, { method: 'DELETE', headers: { 'X-Requested-With': 'swubase' } });
    expect(missing.status).toBe(404);
    expect(await missing.json()).toEqual({ message: 'Preset not found.' });
  });
  test('filters validate every input and credit filtering uses the authenticated account with private caching', async () => {
    const anonymous = fixture(null);
    expect((await anonymous.app.request('/?withinCredits=true')).status).toBe(401);
    expect(anonymous.calls).toHaveLength(0);
    for (const query of [
      'faction=invalid',
      'sort=scene',
      'withinCredits=1',
      'search=' + 'a'.repeat(81),
    ])
      expect((await anonymous.app.request('/?' + query)).status).toBe(400);
    const ordinary = fixture('user');
    const response = await ordinary.app.request(
      '/?page=3&search=%20Fleet%20&faction=rebel&sort=price-asc&withinCredits=true&userId=victim',
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(ordinary.calls).toEqual([
      [
        'list',
        3,
        { search: 'Fleet', faction: 'rebel', sort: 'price-asc', withinCredits: true },
        'user',
      ],
    ]);
  });
  test('preset edits require administrator and origin gates, strict metadata, IDs and expected revisions', async () => {
    const value = { ...input, factions: ['rebel', 'imperial'], revision: 0 };
    const headers = { 'Content-Type': 'application/json', 'X-Requested-With': 'swubase' };
    for (const [viewer, status] of [
      [null, 401],
      ['user', 403],
    ] as const) {
      const { app, calls } = fixture(viewer);
      expect((await app.request('/bad', { method: 'PATCH', headers, body: '{}' })).status).toBe(
        status,
      );
      expect(calls).toHaveLength(0);
    }
    const { app, send, calls } = fixture('admin');
    const patch = (body: unknown, path = id, requestHeaders = headers) =>
      app.request('/' + path, {
        method: 'PATCH',
        headers: requestHeaders,
        body: JSON.stringify(body),
      });
    expect(
      (await patch(value, id, { 'Content-Type': 'application/json' } as typeof headers)).status,
    ).toBe(403);
    expect((await patch(value, 'bad')).status).toBe(400);
    for (const invalid of [
      { ...value, revision: -1 },
      { ...value, revision: 0.5 },
      { ...value, cost: 0 },
      { ...value, factions: ['rebel', 'rebel'] },
      { ...value, factions: ['unknown'] },
    ])
      expect((await patch(invalid)).status).toBe(400);
    expect(calls).toHaveLength(0);
    expect((await send({ ...input, factions: ['unknown'] })).status).toBe(400);
    expect((await patch(value)).status).toBe(200);
    expect(calls).toEqual([['save', id, value]]);
    for (const status of [404, 409] as const) {
      const rejected = await fixture(
        'admin',
        new BattlefieldError('Safe conflict.', status),
      ).app.request('/' + id, { method: 'PATCH', headers, body: JSON.stringify(value) });
      expect(rejected.status).toBe(status);
      expect(await rejected.json()).toEqual({ message: 'Safe conflict.' });
    }
  });
});

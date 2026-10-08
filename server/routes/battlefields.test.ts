import { describe, expect, test } from 'bun:test';
import { Hono } from 'hono';
import type { AuthExtension } from '../auth/auth.ts';
import { createBattlefieldsRoute, createPublicBattlefieldRoute } from './battlefields.ts';
import { battlefieldService, BattlefieldError } from '../lib/battlefield/service.ts';
import { defaultBattlefieldScene } from '../../shared/types/battlefield.ts';
const id = crypto.randomUUID();
const headers = { 'Content-Type': 'application/json', 'X-Requested-With': 'swubase' };
function fixture(viewer: string | null = 'owner', failure?: BattlefieldError) {
  const calls: unknown[][] = [];
  const record = async (...args: unknown[]) => {
    calls.push(args);
    if (failure) throw failure;
    return null;
  };
  const service = {
    editor: record,
    create: record,
    createFromDraft: record,
    duplicate: record,
    save: record,
    activate: record,
  } as unknown as typeof battlefieldService;
  const app = new Hono<AuthExtension>()
    .use('*', async (c, next) => {
      c.set(
        'user',
        viewer ? ({ id: viewer } as NonNullable<AuthExtension['Variables']['user']>) : null,
      );
      await next();
    })
    .route('/', createBattlefieldsRoute(service));
  const request = (path: string, method = 'GET', body?: unknown, extraHeaders = headers) =>
    app.request(path, {
      method,
      headers: extraHeaders,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  return { app, calls, request };
}
describe('Battlefield HTTP boundaries', () => {
  test('saving into an unused slot validates the draft and uses the authenticated owner', async () => {
    const input = { name: '  Preset remix  ', scene: defaultBattlefieldScene() };
    const { request, calls } = fixture();
    expect((await request('/from-draft', 'POST', input)).status).toBe(201);
    expect(calls).toEqual([['owner', { ...input, name: 'Preset remix' }]]);
    for (const body of [
      { ...input, userId: 'victim' },
      { ...input, active: true },
      { ...input, cost: 0 },
      { ...input, scene: { ...input.scene, width: 3200 } },
    ])
      expect((await request('/from-draft', 'POST', body)).status).toBe(400);
    expect(calls).toHaveLength(1);
    expect((await fixture(null).request('/from-draft', 'POST', input)).status).toBe(401);
    expect((await request('/from-draft', 'POST', input, {} as typeof headers)).status).toBe(403);
  });
  test('duplication uses the authenticated owner and validates IDs and request origin', async () => {
    const { request, calls } = fixture();
    const response = await request('/' + id + '/duplicate', 'POST');
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ data: null });
    expect(calls).toEqual([['owner', id]]);
    expect((await request('/invalid/duplicate', 'POST')).status).toBe(400);
    expect(
      (await request('/' + id + '/duplicate', 'POST', undefined, {} as typeof headers)).status,
    ).toBe(403);
    expect(calls).toHaveLength(1);
    const anonymous = fixture(null);
    expect((await anonymous.request('/' + id + '/duplicate', 'POST')).status).toBe(401);
    expect(anonymous.calls).toHaveLength(0);
    for (const status of [400, 404, 409] as const) {
      const rejected = fixture('owner', new BattlefieldError('Cannot duplicate.', status));
      const result = await rejected.request('/' + id + '/duplicate', 'POST');
      expect(result.status).toBe(status);
      expect(await result.json()).toEqual({ message: 'Cannot duplicate.' });
    }
  });
  test('Death Star saves accept 300% through the shared contract and reject larger sizes', async () => {
    const { request, calls } = fixture();
    const base = defaultBattlefieldScene();
    const scene = {
      ...base,
      placements: [
        {
          id: crypto.randomUUID(),
          itemId: 'station-death-star',
          x: 800,
          y: 200,
          rotation: 0,
          scale: 3,
          colorId: 'color-default',
          layerId: base.layers[0].id,
          visible: true,
          order: 0,
        },
      ],
    };
    const input = { name: 'Death Star', revision: 0, scene };
    expect((await request('/' + id, 'PATCH', input)).status).toBe(200);
    expect(calls).toEqual([['owner', id, input]]);
    for (const scale of [0.1, 3.01, 5, 10])
      expect(
        (
          await request('/' + id, 'PATCH', {
            ...input,
            scene: { ...scene, placements: [{ ...scene.placements[0], scale }] },
          })
        ).status,
      ).toBe(400);
    expect(calls).toHaveLength(1);
  });
  test('anonymous requests cannot read private layouts, credits or mutate', async () => {
    const { request, calls } = fixture(null);
    for (const [path, method] of [
      ['/', 'GET'],
      ['/', 'POST'],
      ['/purchase', 'POST'],
      ['/' + id, 'PATCH'],
      ['/' + id + '/activate', 'POST'],
    ])
      expect((await request(path, method, method === 'GET' ? undefined : {})).status).toBe(401);
    expect(calls).toHaveLength(0);
  });
  test('all service calls use the authenticated user, and responses are private', async () => {
    const { request, calls } = fixture();
    const response = await request('/');
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect((await request('/', 'POST', { name: '  Orbit  ' })).status).toBe(201);
    expect(calls[1]).toEqual(['owner', 'Orbit']);
    expect(
      (
        await request('/' + id, 'PATCH', {
          name: 'Orbit',
          revision: 0,
          scene: defaultBattlefieldScene(),
        })
      ).status,
    ).toBe(200);
    expect(calls[2][0]).toBe('owner');
    expect(calls[2][1]).toBe(id);
    expect((await request('/' + id + '/activate', 'POST')).status).toBe(200);
  });
  test('rejects tampered protected fields, malformed IDs/scenes, huge bodies and form writes', async () => {
    const { request, calls } = fixture();
    expect(
      (
        await request('/' + id, 'PATCH', {
          name: 'Orbit',
          revision: 0,
          scene: defaultBattlefieldScene(),
          cost: 0,
          userId: 'victim',
        })
      ).status,
    ).toBe(400);
    expect((await request('/', 'POST', { name: 'Orbit', battlefieldLimit: 100 })).status).toBe(400);
    expect(
      (
        await request('/invalid', 'PATCH', {
          name: 'Orbit',
          revision: 0,
          scene: defaultBattlefieldScene(),
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await request('/' + id, 'PATCH', {
          name: 'Orbit',
          revision: 0,
          scene: { ...defaultBattlefieldScene(), width: 3200 },
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await request('/', 'POST', {}, {
          'Content-Type': 'application/json',
        } as typeof headers)
      ).status,
    ).toBe(403);
    expect(
      (
        await request('/', 'POST', { name: 'x'.repeat(500001) }, {
          ...headers,
          'Content-Length': '500012',
        } as typeof headers)
      ).status,
    ).toBe(413);
    expect(calls).toHaveLength(0);
  });
  test('the purchase endpoint no longer exists', async () => {
    const { request, calls } = fixture();
    expect(
      (await request('/purchase', 'POST', { itemId: 'ship-tie', requestId: crypto.randomUUID() }))
        .status,
    ).toBe(404);
    expect(calls).toHaveLength(0);
  });
  test('light coordinates are validated and older clients receive a default source', async () => {
    const { request, calls } = fixture();
    for (const light of [
      { x: -1, y: 60 },
      { x: 1601, y: 60 },
      { x: 200, y: 401 },
      { x: 200, y: 60, visible: true },
      null,
    ]) {
      expect(
        (
          await request('/' + id, 'PATCH', {
            name: 'Orbit',
            revision: 0,
            scene: { ...defaultBattlefieldScene(), light },
          })
        ).status,
      ).toBe(400);
    }
    expect(calls).toHaveLength(0);
    const { light: _light, ...oldScene } = defaultBattlefieldScene();
    expect(
      (
        await request('/' + id, 'PATCH', {
          name: 'Orbit',
          revision: 0,
          scene: oldScene,
        })
      ).status,
    ).toBe(200);
    expect(calls[0]).toEqual([
      'owner',
      id,
      { name: 'Orbit', revision: 0, scene: defaultBattlefieldScene() },
    ]);
    const scene = { ...defaultBattlefieldScene(), light: { x: 1600, y: 400 } };
    expect((await request('/' + id, 'PATCH', { name: 'Orbit', revision: 0, scene })).status).toBe(
      200,
    );
    expect(calls[1]).toEqual(['owner', id, { name: 'Orbit', revision: 0, scene }]);
  });
  test('business errors keep safe status and message when mounted', async () => {
    for (const status of [400, 404, 409] as const) {
      const { request } = fixture('owner', new BattlefieldError('Safe error', status));
      const response = await request('/', 'POST', { name: 'Orbit' });
      expect(response.status).toBe(status);
      expect(await response.json()).toEqual({ message: 'Safe error' });
    }
  });
  test('planet surfaces survive the save contract and unknown surfaces are rejected', async () => {
    const { request, calls } = fixture();
    const scene = defaultBattlefieldScene(crypto.randomUUID());
    scene.placements[0].textureId = 'ocean';
    expect((await request('/' + id, 'PATCH', { name: 'Ocean', revision: 0, scene })).status).toBe(
      200,
    );
    expect(calls[0]).toEqual(['owner', id, { name: 'Ocean', revision: 0, scene }]);
    expect(
      (
        await request('/' + id, 'PATCH', {
          name: 'Invalid',
          revision: 0,
          scene: { ...scene, placements: [{ ...scene.placements[0], textureId: 'invalid' }] },
        })
      ).status,
    ).toBe(400);
    expect(calls).toHaveLength(1);
  });
});

describe('Public Battlefield HTTP boundaries', () => {
  test('anonymous reads expose only the scene with no-store, including empty profiles', async () => {
    for (const data of [null, { scene: defaultBattlefieldScene(crypto.randomUUID()) }]) {
      const calls: string[] = [];
      const service = {
        ...battlefieldService,
        publicProfile: async (userId: string) => {
          calls.push(userId);
          return data;
        },
      };
      const response = await createPublicBattlefieldRoute(service).request('/owner/battlefield');
      expect(response.status).toBe(200);
      expect(response.headers.get('Cache-Control')).toBe('no-store');
      expect(await response.json()).toEqual({ data });
      expect(calls).toEqual(['owner']);
    }
  });
  test('missing users return a safe 404 and invalid user IDs never reach the service', async () => {
    let calls = 0;
    const service = {
      ...battlefieldService,
      publicProfile: async () => {
        calls++;
        throw new BattlefieldError('User not found.', 404);
      },
    };
    const route = createPublicBattlefieldRoute(service);
    const response = await route.request('/missing/battlefield');
    expect(response.status).toBe(404);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(await response.json()).toEqual({ message: 'User not found.' });
    expect((await route.request('/' + 'x'.repeat(201) + '/battlefield')).status).toBe(400);
    expect(calls).toBe(1);
  });
});

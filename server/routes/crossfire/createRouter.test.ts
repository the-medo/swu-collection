import { expect, test } from 'bun:test';
import { Hono } from 'hono';
import { randomUUID } from 'node:crypto';
import type { AuthExtension } from '../../auth/auth.ts';
import { AdmissionError } from '../../lib/crossfire/lobbies.ts';
import { ConnectionError } from '../../lib/crossfire/connections.ts';
import type { CrossfireLobby } from '../../../shared/types/crossfire.ts';
import { createCrossfireRouter } from './createRouter.ts';

const origin = 'http://localhost:5174',
  lobbyId = randomUUID(),
  deckId = randomUUID();
const policy = { allowSpectators: true, handsToPlayers: false, handsToSpectators: false };
const lobby: CrossfireLobby = {
  id: lobbyId,
  status: 'waiting',
  gameId: null,
  seats: 1,
  mySeat: 'p1',
  policy,
};
function fixture(
  options: {
    enabled?: boolean;
    role?: string | null;
    signedIn?: boolean;
    fail?: Error;
    missing?: boolean;
    reviewer?: boolean;
  } = {},
) {
  const calls: unknown[][] = [];
  const invoke = (...args: unknown[]) => {
    calls.push(args);
    if (options.fail) throw options.fail;
  };
  const services = {
    exits: {
      leave: async (...args: unknown[]) => {
        invoke('leave', ...args);
        return null;
      },
    },
    decks: {
      list: async (...args: unknown[]) => {
        invoke('decks', ...args);
        return { data: [], nextCursor: null };
      },
      get: async (...args: unknown[]) => {
        invoke('deck', ...args);
        throw new AdmissionError('deck-unavailable');
      },
    },
    matches: {
      get: async (...args: unknown[]) => {
        invoke('match-get', ...args);
        return null;
      },
      ready: async (...args: unknown[]) => {
        invoke('match-ready', ...args);
        throw new AdmissionError('conflict');
      },
    },
    practice: { request: async () => {}, list: async () => [], decline: async () => {} },
    bookmarks: {
      report: async (...args: unknown[]) => {
        invoke('report', ...args);
        throw new AdmissionError('unavailable');
      },
      reports: async (...args: unknown[]) => {
        invoke('reports', ...args);
        return [];
      },
      resolveReport: async (...args: unknown[]) => {
        invoke('resolveReport', ...args);
      },
      list: async () => [],
      rename: async () => {},
      remove: async () => {},
    },
    history: {
      list: async (...args: unknown[]) => {
        invoke('history', ...args);
        return { data: [], nextCursor: null };
      },
    },
    lobbies: {
      invitations: async (...args: unknown[]) => {
        invoke('invitations', ...args);
        return [];
      },
      teammates: async (...args: unknown[]) => {
        invoke('teammates', ...args);
        return [];
      },
      decline: async (...args: unknown[]) => {
        invoke('decline', ...args);
      },
      inspectDeck: async (...args: unknown[]) => {
        invoke('inspectDeck', ...args);
        return { ready: true, issues: [] };
      },
      create: async (...args: unknown[]) => {
        invoke('create', ...args);
        return lobby;
      },
      get: async (...args: unknown[]) => {
        invoke('get', ...args);
        return options.missing ? null : lobby;
      },
      join: async (...args: unknown[]) => {
        invoke('join', ...args);
        return {
          ...lobby,
          status: 'started' as const,
          seats: 2,
          gameId: 'game-fixture',
          mySeat: 'p2' as const,
        };
      },
      cancel: async (...args: unknown[]) => {
        invoke('cancel', ...args);
      },
    },
    connections: {
      issue: async (...args: unknown[]) => {
        invoke('issue', ...args);
        return {
          ticket: 'synthetic-ticket',
          gameId: 'game-fixture',
          expiresAt: '2026-09-09T12:00:30.000Z',
        };
      },
    },
  };
  const app = new Hono<AuthExtension>()
    .onError((_, c) => c.json({ error: 'internal-server-error' }, 500))
    .use('*', async (c, next) => {
      // Test-owned parent auth context; the production router has no such hook.
      c.set(
        'user',
        options.signedIn === false
          ? null
          : ({
              id: 'authenticated-user',
              role: options.role === undefined ? 'crossfire' : options.role,
            } as NonNullable<AuthExtension['Variables']['user']>),
      );
      c.set(
        'session',
        options.signedIn === false
          ? null
          : ({ id: 'authenticated-session' } as NonNullable<AuthExtension['Variables']['session']>),
      );
      await next();
    })
    .route(
      '/api/crossfire',
      createCrossfireRouter({
        enabled: options.enabled ?? true,
        origin,
        services: () => services,
        canReviewReports: async () => options.reviewer ?? false,
      }),
    );
  function request(
    path: string,
    method = 'GET',
    body?: unknown,
    requestOrigin: string | null = origin,
  ) {
    return app.request(`/api/crossfire${path}`, {
      method,
      headers: {
        ...(requestOrigin ? { Origin: requestOrigin } : {}),
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  }
  return { request, calls };
}

test('disabled and anonymous requests cannot invoke any service', async () => {
  for (const [options, status] of [
    [{ enabled: false }, 503],
    [{ signedIn: false }, 401],
  ] as const) {
    const f = fixture(options);
    const response = await f.request('/lobbies', 'POST', { deckId, policy });
    expect(response.status).toBe(status);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(f.calls).toHaveLength(0);
  }
});
test('mutations reject missing, foreign and lookalike origins before touching data', async () => {
  const f = fixture();
  for (const source of [null, 'null', 'http://localhost:5173', origin + '.invalid', origin + '/']) {
    expect((await f.request('/lobbies', 'POST', { deckId, policy }, source)).status).toBe(403);
    expect((await f.request(`/lobbies/${lobbyId}`, 'DELETE', undefined, source)).status).toBe(403);
  }
  expect(f.calls).toHaveLength(0);
});
test('validation rejects identity injection, invalid params/roles/policy and oversized input', async () => {
  const f = fixture();
  expect((await f.request('/lobbies', 'POST', { deckId, policy, userId: 'spoofed' })).status).toBe(
    400,
  );
  expect((await f.request('/lobbies/invalid')).status).toBe(400);
  expect((await f.request(`/lobbies/${lobbyId}/tickets`, 'POST', { role: 'admin' })).status).toBe(
    400,
  );
  expect(
    (
      await f.request('/lobbies', 'POST', {
        deckId,
        policy: { ...policy, allowSpectators: false, handsToSpectators: true },
      })
    ).status,
  ).toBe(400);
  expect((await f.request('/lobbies', 'POST', { padding: 'a'.repeat(9000) })).status).toBe(413);
  expect(f.calls).toHaveLength(0);
});
test('create, get, join and cancel use the authenticated context and typed lobby bodies', async () => {
  const f = fixture();
  const identity = { userId: 'authenticated-user', sessionId: 'authenticated-session' };
  const created = await f.request('/lobbies', 'POST', { deckId, policy });
  expect(created.status).toBe(201);
  expect(await created.json()).toEqual({ data: lobby });
  expect(f.calls[0]).toEqual(['create', identity, deckId, policy, 1, true, undefined]);
  expect((await f.request(`/lobbies/${lobbyId}`, 'GET', undefined, null)).status).toBe(200);
  expect(f.calls[1]).toEqual(['get', identity, lobbyId]);
  const joined = await f.request(`/lobbies/${lobbyId}/join`, 'POST', {
    deckId,
    acceptedPolicy: policy,
  });
  expect(joined.status).toBe(200);
  expect(await joined.json()).toMatchObject({ data: { mySeat: 'p2' } });
  expect(f.calls[2]).toEqual(['join', identity, lobbyId, deckId, policy, 1]);
  expect((await f.request(`/lobbies/${lobbyId}`, 'DELETE')).status).toBe(204);
  expect(f.calls[3]).toEqual(['cancel', identity, lobbyId]);
});
test('ticket responses are uncached and pass only server identity plus requested role to admission', async () => {
  const f = fixture();
  const response = await f.request(`/lobbies/${lobbyId}/tickets`, 'POST', { role: 'spectator' });
  expect(response.status).toBe(201);
  expect(response.headers.get('Cache-Control')).toBe('no-store');
  expect(await response.json()).toMatchObject({ data: { ticket: 'synthetic-ticket' } });
  expect(f.calls[0]).toEqual([
    'issue',
    { userId: 'authenticated-user', sessionId: 'authenticated-session' },
    lobbyId,
    'spectator',
    origin,
    'live',
  ]);
});
test('admission errors map to safe statuses and unexpected errors reach the parent handler', async () => {
  for (const [error, status] of [
    [new AdmissionError('unauthenticated'), 401],
    [new AdmissionError('forbidden'), 403],
    [new AdmissionError('deck-unavailable'), 404],
    [new AdmissionError('unsupported-deck'), 422],
    [new AdmissionError('policy-mismatch'), 409],
    [new ConnectionError('denied'), 403],
    [new Error('private database details'), 500],
  ] as const) {
    const response = await fixture({ fail: error }).request('/lobbies', 'POST', { deckId, policy });
    expect(response.status).toBe(status);
    expect(await response.text()).not.toContain('private database details');
  }
  expect((await fixture({ missing: true }).request(`/lobbies/${lobbyId}`)).status).toBe(404);
});
test('write bursts are bounded per user while ordinary lobby reads remain available', async () => {
  const f = fixture();
  for (let n = 0; n < 60; n++)
    expect((await f.request('/lobbies', 'POST', { deckId, policy })).status).toBe(201);
  const limited = await f.request(`/lobbies/${lobbyId}/tickets`, 'POST', { role: 'player' });
  expect(limited.status).toBe(429);
  expect(Number(limited.headers.get('Retry-After'))).toBeGreaterThan(0);
  expect((await f.request(`/lobbies/${lobbyId}`)).status).toBe(200);
  expect(f.calls).toHaveLength(61);
});

test('readiness is authenticated, validated and uncached', async () => {
  const f = fixture();
  const response = await f.request(`/decks/${deckId}/readiness`);
  expect(response.status).toBe(200);
  expect(response.headers.get('Cache-Control')).toBe('no-store');
  expect(await response.json()).toEqual({ data: { ready: true, issues: [] } });
  expect(f.calls).toEqual([
    ['inspectDeck', { userId: 'authenticated-user', sessionId: 'authenticated-session' }, deckId],
  ]);
  expect((await f.request('/decks/invalid/readiness')).status).toBe(400);
  expect((await fixture({ signedIn: false }).request(`/decks/${deckId}/readiness`)).status).toBe(
    401,
  );
  expect(
    (
      await fixture({ fail: new AdmissionError('deck-unavailable') }).request(
        `/decks/${deckId}/readiness`,
      )
    ).status,
  ).toBe(404);
});

test('history is account-scoped, validates its cursor and never caches summaries', async () => {
  const f = fixture();
  const response = await f.request('/history?cursor=YWJj');
  expect(response.status).toBe(200);
  expect(response.headers.get('Cache-Control')).toBe('no-store');
  expect(f.calls).toEqual([
    [
      'history',
      { userId: 'authenticated-user', sessionId: 'authenticated-session' },
      'YWJj',
      undefined,
    ],
  ]);
  expect((await f.request('/history?cursor=invalid!')).status).toBe(400);
  expect((await fixture({ signedIn: false }).request('/history')).status).toBe(401);
});

test('problem report endpoints bind ownership to the session and validate report identities', async () => {
  const f = fixture();
  expect((await f.request('/reports')).status).toBe(200);
  expect(f.calls[0]).toEqual([
    'reports',
    { userId: 'authenticated-user', sessionId: 'authenticated-session' },
  ]);
  expect((await f.request('/reports/not-an-id', 'PATCH')).status).toBe(400);
  expect((await fixture({ signedIn: false }).request('/reports')).status).toBe(401);
  const id = randomUUID();
  expect((await f.request(`/reports/${id}?reviewer=true`)).status).toBe(404);
  expect(f.calls.at(-1)).toEqual([
    'report',
    { userId: 'authenticated-user', sessionId: 'authenticated-session' },
    id,
    false,
  ]);
  const admin = fixture({ reviewer: true });
  await admin.request(`/reports/${id}`);
  expect(admin.calls.at(-1)?.at(-1)).toBe(true);
  expect((await fixture({ signedIn: false }).request(`/reports/${id}`)).status).toBe(401);
  expect((await f.request('/reports/not-an-id')).status).toBe(400);
});

test('match endpoints use account identity and reject participant injection or unknown operations', async () => {
  const f = fixture();
  const read = await f.request(`/lobbies/${lobbyId}/match`, 'GET', undefined, null);
  expect(read.status).toBe(200);
  expect(read.headers.get('Cache-Control')).toBe('no-store');
  expect(f.calls[0]).toEqual([
    'match-get',
    { userId: 'authenticated-user', sessionId: 'authenticated-session' },
    lobbyId,
  ]);
  expect(
    (
      await f.request(`/lobbies/${lobbyId}/match`, 'POST', {
        kind: 'rematch',
        ready: true,
        seat: 'p2',
      })
    ).status,
  ).toBe(400);
  expect(
    (await f.request(`/lobbies/${lobbyId}/match`, 'POST', { kind: 'force-next', ready: true }))
      .status,
  ).toBe(400);
  expect(
    (await f.request(`/lobbies/${lobbyId}/match`, 'POST', { kind: 'rematch', ready: true })).status,
  ).toBe(409);
  expect(f.calls[1]).toEqual([
    'match-ready',
    { userId: 'authenticated-user', sessionId: 'authenticated-session' },
    lobbyId,
    { kind: 'rematch', ready: true },
  ]);
});

test('match submissions allow the full supported deck size while retaining a bounded streamed body', async () => {
  const f = fixture();
  const mainboard = Array.from({ length: 120 }, (_, n) => ({
    cardId: `card-${n}-${'a'.repeat(108)}`,
    quantity: 1,
  }));
  const accepted = await f.request(`/lobbies/${lobbyId}/match`, 'POST', {
    kind: 'next',
    ready: true,
    mainboard,
  });
  // The fixture service rejects the operation, proving the full body reached it.
  expect(accepted.status).toBe(409);
  expect(f.calls[0]?.[0]).toBe('match-ready');
  expect(
    (await f.request(`/lobbies/${lobbyId}/match`, 'POST', { padding: 'a'.repeat(33000) })).status,
  ).toBe(413);
});

test('deck discovery validates bounded queries and keeps identity server-owned', async () => {
  const f = fixture();
  const response = await f.request('/decks?source=public&search=Sabine');
  expect(response.status).toBe(200);
  expect(response.headers.get('Cache-Control')).toBe('no-store');
  expect(f.calls).toEqual([
    [
      'decks',
      { userId: 'authenticated-user', sessionId: 'authenticated-session' },
      { source: 'public', search: 'Sabine' },
    ],
  ]);
  for (const query of [
    'source=all',
    'source=mine&userId=other',
    'source=mine&search=' + 'a'.repeat(121),
    'source=mine&cursor=!!',
  ])
    expect((await f.request('/decks?' + query)).status).toBe(400);
  expect((await fixture({ signedIn: false }).request('/decks?source=mine')).status).toBe(401);
  expect((await fixture({ enabled: false }).request('/decks?source=mine')).status).toBe(503);
  expect((await f.request('/decks/not-a-uuid')).status).toBe(400);
  expect((await f.request('/decks/' + deckId)).status).toBe(404);
  expect((await f.request('/history?status=running')).status).toBe(200);
  expect(f.calls.at(-1)).toEqual([
    'history',
    { userId: 'authenticated-user', sessionId: 'authenticated-session' },
    undefined,
    'running',
  ]);
  expect((await f.request('/history?status=anything')).status).toBe(400);
});

test('invitation endpoints derive identity, validate recipient and require same-origin writes', async () => {
  const f = fixture();
  expect((await f.request('/invitations', 'GET')).status).toBe(200);
  expect((await f.request('/teammates', 'GET')).status).toBe(200);
  expect(
    (
      await f.request('/lobbies', 'POST', {
        deckId,
        policy,
        showLeader: false,
        recipientId: 'team-user',
      })
    ).status,
  ).toBe(201);
  expect(f.calls.at(-1)).toEqual([
    'create',
    { userId: 'authenticated-user', sessionId: 'authenticated-session' },
    deckId,
    policy,
    1,
    false,
    'team-user',
  ]);
  expect((await f.request('/lobbies', 'POST', { deckId, policy, recipientId: '' })).status).toBe(
    400,
  );
});

test('leaving uses the HTTP session and rejects foreign origins or unknown membership', async () => {
  const f = fixture();
  const path = `/lobbies/${lobbyId}/leave`;
  expect((await f.request(path, 'POST', undefined, null)).status).toBe(403);
  expect((await f.request(path, 'POST')).status).toBe(200);
  expect(f.calls.at(-1)).toEqual([
    'leave',
    { userId: 'authenticated-user', sessionId: 'authenticated-session' },
    lobbyId,
  ]);
  expect(
    (await fixture({ fail: new AdmissionError('unavailable') }).request(path, 'POST')).status,
  ).toBe(404);
});

test('every Crossfire API requires the explicit role, including administrators', async () => {
  for (const role of [
    null,
    '',
    'user',
    'admin',
    'moderator',
    'organizer',
    'admin,moderator',
    'crossfire-admin',
  ]) {
    const f = fixture({ role });
    for (const path of [
      '/history',
      '/invitations',
      '/teammates',
      '/reports',
      `/lobbies/${lobbyId}`,
      `/decks/${deckId}/readiness`,
    ])
      expect((await f.request(path)).status).toBe(403);
    expect((await f.request('/lobbies', 'POST', { deckId, policy })).status).toBe(403);
    expect(
      (
        await f.request(`/lobbies/${lobbyId}/tickets`, 'POST', {
          role: 'spectator',
          purpose: 'replay',
        })
      ).status,
    ).toBe(403);
    expect(f.calls).toHaveLength(0);
  }
  for (const role of ['crossfire', 'user,crossfire', 'admin,crossfire', 'moderator,crossfire'])
    expect((await fixture({ role }).request('/history')).status).toBe(200);
});

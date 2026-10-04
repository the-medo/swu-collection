import { describe, expect, test } from 'bun:test';
import { Hono } from 'hono';
import type { AuthExtension } from '../../auth/auth.ts';
import { createUserProfileRoute } from './profile.ts';
import { UserProfileError } from '../../lib/user-profile/service.ts';
import { SwuAspect } from '../../../types/enums.ts';

const headers = { 'Content-Type': 'application/json', 'X-Requested-With': 'swubase' };
const favorites = {
  userId: 'owner',
  favoriteLeaderCardId: null,
  favoriteCardId: null,
  favoriteAspects: [],
};

function fixture(viewer: string | null = 'owner', failure?: UserProfileError) {
  const calls: unknown[][] = [];
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
      createUserProfileRoute(
        async id => {
          if (failure) throw failure;
          return { ...favorites, userId: id };
        },
        async (id, input) => {
          calls.push([id, input]);
          if (failure) throw failure;
          return { ...favorites, ...input, userId: id };
        },
      ),
    );
  const patch = (body: unknown, id = 'owner', requestHeaders = headers) =>
    app.request(`/${id}/profile`, {
      method: 'PATCH',
      headers: requestHeaders,
      body: JSON.stringify(body),
    });
  return { app, calls, patch };
}

describe('user profile favorites routes', () => {
  test('public reads return empty defaults without requiring authentication', async () => {
    const { app, calls } = fixture(null);
    const response = await app.request('/owner/profile');
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: favorites });
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(calls).toHaveLength(0);
  });

  test('saves repeated aspects in order and supports clearing favorites', async () => {
    const { patch, calls } = fixture();
    const input = { favoriteAspects: [SwuAspect.COMMAND, SwuAspect.COMMAND, SwuAspect.HEROISM] };
    expect((await patch(input)).status).toBe(200);
    expect(calls[0]).toEqual(['owner', input]);
    expect(
      (await patch({ favoriteLeaderCardId: null, favoriteCardId: null, favoriteAspects: [] }))
        .status,
    ).toBe(200);
  });

  test('only the owner can write, including when another viewer is an authenticated user', async () => {
    const anonymous = fixture(null);
    expect((await anonymous.patch({ favoriteAspects: [] })).status).toBe(401);
    expect(anonymous.calls).toHaveLength(0);
    const other = fixture('other');
    expect((await other.patch({ favoriteAspects: [] })).status).toBe(403);
    expect(other.calls).toHaveLength(0);
  });

  test('rejects unsupported aspects, too many slots, empty edits and protected fields', async () => {
    const { patch, calls } = fixture();
    for (const body of [
      {},
      { favoriteAspects: ['Neutral'] },
      { favoriteAspects: [null] },
      { favoriteAspects: Array(4).fill(SwuAspect.CUNNING) },
      { favoriteCardId: '' },
      { favoriteLeaderCardId: 'x'.repeat(201) },
      { favoriteAspects: [], totalSupport: '1000.00' },
      { favoriteAspects: [], activeSupporter: true },
      { favoriteAspects: [], userId: 'victim' },
    ])
      expect((await patch(body)).status).toBe(400);
    expect(calls).toHaveLength(0);
  });

  test('rejects malformed, oversized and cross-origin-form writes', async () => {
    const { app, patch, calls } = fixture();
    expect(
      (
        await patch({ favoriteAspects: [] }, 'owner', {
          'Content-Type': 'application/json',
        } as typeof headers)
      ).status,
    ).toBe(403);
    expect(
      (await app.request('/owner/profile', { method: 'PATCH', headers, body: '{' })).status,
    ).toBe(400);
    expect(
      (
        await patch({ favoriteCardId: 'x'.repeat(3000) }, 'owner', {
          ...headers,
          'Content-Length': '3021',
        } as typeof headers)
      ).status,
    ).toBe(413);
    expect(calls).toHaveLength(0);
  });

  test('returns safe validation and not-found errors', async () => {
    for (const status of [400, 404] as const) {
      const { patch } = fixture('owner', new UserProfileError('Choose a valid leader.', status));
      const response = await patch({ favoriteLeaderCardId: 'invalid' });
      expect(response.status).toBe(status);
      expect(await response.json()).toEqual({ message: 'Choose a valid leader.' });
    }
    const { app } = fixture(null, new UserProfileError('User not found.', 404));
    expect((await app.request('/missing/profile')).status).toBe(404);
  });
});

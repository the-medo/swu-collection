import { expect, test } from 'bun:test';
import { Hono } from 'hono';
import type { AuthExtension } from '../../../auth/auth.ts';
import type { CardGroupService } from '../../../lib/card-groups/service.ts';
import { CardGroupValidationError } from '../../../lib/card-groups/errors.ts';
import { createCardGroupsAdminRouter } from './router.ts';
import { createCardGroupsRouter } from '../../card-groups/router.ts';

const id = '10000000-0000-4000-8000-000000000001';
const input = {
  title: 'Special printings',
  description: 'Two versions of one card',
  variantIds: ['standard', 'showcase'],
  published: false,
  sortOrder: 1,
};
const row = { ...input, id, updatedAt: new Date().toISOString() };
function fixture(status = 200, missing = false, invalid = false) {
  const calls: unknown[] = [];
  const service: CardGroupService = {
    async feed(cursor) {
      calls.push(['feed', cursor]);
      return { data: [], nextCursor: null };
    },
    async list(publishedOnly) {
      calls.push(['list', publishedOnly]);
      return publishedOnly ? [] : [row];
    },
    async getPublished(groupId) {
      calls.push(['getPublished', groupId]);
      return undefined;
    },
    async create(data) {
      calls.push(['create', data]);
      if (invalid) throw new CardGroupValidationError('Unknown card versions.');
      return { ...row, ...data };
    },
    async update(groupId, data) {
      calls.push(['update', groupId, data]);
      return missing ? undefined : { ...row, ...data };
    },
    async remove(groupId) {
      calls.push(['remove', groupId]);
      return !missing;
    },
  };
  const app = new Hono<AuthExtension>()
    .route(
      '/admin',
      createCardGroupsAdminRouter(service, async c =>
        status === 200
          ? { user: {} as NonNullable<AuthExtension['Variables']['user']>, response: null }
          : { user: null, response: c.json({ message: 'Denied' }, status === 401 ? 401 : 403) },
      ),
    )
    .route('/public', createCardGroupsRouter(service));
  return {
    calls,
    request: (path: string, method = 'GET', body?: unknown) =>
      app.request(path, {
        method,
        ...(body
          ? { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }
          : {}),
      }),
  };
}

test('all admin card group routes authorize before reading, validating, or writing', async () => {
  for (const status of [401, 403]) {
    const f = fixture(status);
    for (const [path, method, body] of [
      ['/admin', 'GET'],
      ['/admin', 'POST', {}],
      [`/admin/${id}`, 'PUT', {}],
      [`/admin/${id}`, 'DELETE'],
    ] as const) {
      expect((await f.request(path, method, body)).status).toBe(status);
    }
    expect(f.calls).toHaveLength(0);
  }
});

test('card groups reject empty, duplicate, excessive, and malformed inputs before writes', async () => {
  const f = fixture();
  for (const body of [
    { ...input, title: '  ' },
    { ...input, description: 'x'.repeat(501) },
    { ...input, variantIds: [] },
    { ...input, variantIds: ['same', 'same'] },
    { ...input, variantIds: Array.from({ length: 501 }, (_, i) => `v${i}`) },
    { ...input, sortOrder: -1 },
    { ...input, sortOrder: 1.5 },
    { ...input, sortOrder: 2_147_483_648 },
    { ...input, sortOrder: '100' },
    { ...input, published: 'true' },
    { ...input, admin: true },
  ])
    expect((await f.request('/admin', 'POST', body)).status).toBe(400);
  expect((await f.request('/admin/bad-id', 'PUT', input)).status).toBe(400);
  expect((await f.request('/admin/bad-id', 'DELETE')).status).toBe(400);
  expect(f.calls).toHaveLength(0);
  expect((await fixture(200, false, true).request('/admin', 'POST', input)).status).toBe(400);
});

test('admin CRUD preserves printing order and publication controls; missing groups return 404', async () => {
  const f = fixture();
  const created = await f.request('/admin', 'POST', input);
  expect(created.status).toBe(201);
  expect((await created.json()).data.variantIds).toEqual(['standard', 'showcase']);
  const updated = await f.request(`/admin/${id}`, 'PUT', {
    ...input,
    sortOrder: 20_100,
    variantIds: ['showcase', 'standard'],
    published: true,
  });
  expect(updated.status).toBe(200);
  expect((await updated.json()).data).toMatchObject({
    variantIds: ['showcase', 'standard'],
    published: true,
    sortOrder: 20_100,
  });
  expect((await f.request(`/admin/${id}`, 'DELETE')).status).toBe(200);
  expect((await fixture(200, true).request(`/admin/${id}`, 'PUT', input)).status).toBe(404);
  expect((await fixture(200, true).request(`/admin/${id}`, 'DELETE')).status).toBe(404);
});

test('public endpoints use published-only reads and never expose drafts via a direct URL', async () => {
  const f = fixture();
  const response = await f.request('/public');
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ data: [] });
  expect(response.headers.get('cache-control')).toBe('no-store');
  expect((await f.request(`/public/${id}`)).status).toBe(404);
  expect((await f.request('/public/bad-id')).status).toBe(400);
  expect(f.calls).toEqual([
    ['list', true],
    ['getPublished', id],
  ]);
});

test('public group feed validates cursors before reading and preserves timestamp precision', async () => {
  const f = fixture();
  const cursor = { id, sortOrder: 20_100, updatedAt: '2026-10-14T12:00:00.123456Z' };
  for (const invalid of [
    'not-json',
    JSON.stringify({ id, updatedAt: cursor.updatedAt }),
    JSON.stringify({ ...cursor, sortOrder: -1 }),
    JSON.stringify({ ...cursor, sortOrder: 1.5 }),
    JSON.stringify({ ...cursor, sortOrder: 2_147_483_648 }),
    JSON.stringify({ ...cursor, id: 'not-a-uuid' }),
    JSON.stringify({ ...cursor, updatedAt: '2026-02-30T12:00:00Z' }),
    JSON.stringify({ ...cursor, updatedAt: '0000-01-01T12:00:00Z' }),
    JSON.stringify({ ...cursor, published: false }),
  ]) {
    expect((await f.request(`/public/feed?cursor=${encodeURIComponent(invalid)}`)).status).toBe(
      400,
    );
  }
  expect(f.calls).toHaveLength(0);
  const first = await f.request('/public/feed');
  expect(first.status).toBe(200);
  expect(first.headers.get('cache-control')).toBe('no-store');
  expect(await first.json()).toEqual({ data: [], nextCursor: null });
  expect(
    (await f.request(`/public/feed?cursor=${encodeURIComponent(JSON.stringify(cursor))}`)).status,
  ).toBe(200);
  expect(f.calls).toEqual([
    ['feed', undefined],
    ['feed', cursor],
  ]);
});

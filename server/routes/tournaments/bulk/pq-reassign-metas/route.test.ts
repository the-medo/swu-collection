import { expect, test } from 'bun:test';
import { createPQMetaReassignmentRoute } from './route.ts';
import type { AuthExtension } from '../../../../auth/auth.ts';
import { PQMetaReassignmentError } from '../../../../lib/tournaments/pqMetaReassignmentPlan.ts';
import type { pqMetaReassignmentService } from '../../../../lib/tournaments/pqMetaReassignment.ts';

const body = { fromDate: '2026-11-28', targets: [{ formatId: 1, metaId: 22 }] };
function fixture(status = 200, failure?: PQMetaReassignmentError) {
  const calls: unknown[] = [];
  const call = async (request: unknown) => {
    calls.push(request);
    if (failure) throw failure;
    return {};
  };
  const app = createPQMetaReassignmentRoute(
    { preview: call, apply: call } as unknown as typeof pqMetaReassignmentService,
    async c => {
      if (status === 401) return { user: null, response: c.json({ message: 'Denied' }, 401) };
      if (status === 403) return { user: null, response: c.json({ message: 'Denied' }, 403) };
      return {
        user: { id: 'admin' } as NonNullable<AuthExtension['Variables']['user']>,
        response: null,
      };
    },
  );
  return {
    calls,
    request: (path: string, data: unknown = body) =>
      app.request(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
  };
}

test('preview and apply require admin access before validation or service calls', async () => {
  for (const status of [401, 403]) {
    const f = fixture(status);
    for (const path of ['/preview', '/apply'])
      expect((await f.request(path, {})).status).toBe(status);
    expect(f.calls).toHaveLength(0);
  }
});

test('validates format, date, target and required preview token', async () => {
  const f = fixture();
  expect((await f.request('/preview', { ...body, fromDate: 'bad' })).status).toBe(400);
  expect(
    (await f.request('/preview', { ...body, targets: [{ formatId: 3, metaId: 22 }] })).status,
  ).toBe(400);
  expect((await f.request('/apply')).status).toBe(400);
  expect(f.calls).toHaveLength(0);
  const response = await f.request('/preview');
  expect(response.status).toBe(200);
  expect(response.headers.get('Cache-Control')).toBe('no-store');
  expect((await f.request('/apply', { ...body, previewToken: 'a'.repeat(64) })).status).toBe(200);
  expect(f.calls).toHaveLength(2);
});

test('returns actionable validation and stale-preview errors', async () => {
  for (const status of [400, 409] as const) {
    const response = await fixture(
      200,
      new PQMetaReassignmentError('Preview again.', status),
    ).request('/preview');
    expect(response.status).toBe(status);
    expect(await response.json()).toEqual({ message: 'Preview again.' });
  }
});

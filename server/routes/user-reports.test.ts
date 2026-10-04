import { describe, expect, test } from 'bun:test';
import { Hono } from 'hono';
import type { AuthExtension } from '../auth/auth.ts';
import { createUserReportsRoute } from './user-reports.ts';
import { UserReportError } from '../lib/user-reports/service.ts';

const input = {
  reportedUserId: 'reported',
  description: 'Repeated harassment in conversation.',
  source: 'conversation',
  clientReportId: crypto.randomUUID(),
};
const headers = { 'Content-Type': 'application/json', 'X-Requested-With': 'swubase' };
function fixture(authenticated = true, error?: UserReportError) {
  const calls: unknown[] = [];
  const app = new Hono<AuthExtension>()
    .use('*', async (c, next) => {
      c.set(
        'user',
        authenticated
          ? ({ id: 'reporter' } as NonNullable<AuthExtension['Variables']['user']>)
          : null,
      );
      await next();
    })
    .route(
      '/reports',
      createUserReportsRoute(async (owner, data) => {
        calls.push({ owner, data });
        if (error) throw error;
        return { id: 'saved-id', createdAt: new Date().toISOString() };
      }),
    );
  const request = (body: unknown = input, requestHeaders = headers) =>
    app.request('/reports', {
      method: 'POST',
      headers: requestHeaders,
      body: JSON.stringify(body),
    });
  return { app, calls, request };
}
describe('user reports', () => {
  test('requires a session and same-origin JSON submission', async () => {
    const anonymous = fixture(false);
    expect((await anonymous.request()).status).toBe(401);
    expect(anonymous.calls).toHaveLength(0);
    const f = fixture();
    expect((await f.request(input, { ...headers, 'X-Requested-With': '' })).status).toBe(403);
    expect(f.calls).toHaveLength(0);
  });
  test('uses the authenticated reporter, trims the reason and returns only a receipt', async () => {
    const f = fixture();
    const response = await f.request({ ...input, description: '  Harassment.  ' });
    expect(response.status).toBe(201);
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(await response.json()).toEqual({
      data: { id: 'saved-id', createdAt: expect.any(String) },
    });
    expect(f.calls).toEqual([
      { owner: 'reporter', data: { ...input, description: 'Harassment.' } },
    ]);
    expect((await f.app.request('/reports')).status).toBe(404);
  });
  test('rejects empty, oversized, malformed and forged reports', async () => {
    const f = fixture();
    for (const body of [
      { ...input, description: ' \n ' },
      { ...input, description: 'x'.repeat(2001) },
      { ...input, reporterUserId: 'victim' },
      { ...input, source: 'admin' },
      { ...input, clientReportId: 'invalid' },
      { ...input, description: 'contains\0null' },
    ])
      expect((await f.request(body)).status).toBe(400);
    const oversized = { ...input, description: 'x'.repeat(17000) };
    expect(
      (
        await f.request(oversized, {
          ...headers,
          'Content-Length': String(Buffer.byteLength(JSON.stringify(oversized))),
        })
      ).status,
    ).toBe(413);
    expect(f.calls).toHaveLength(0);
  });
  test('preserves expected errors and retry timing', async () => {
    for (const status of [400, 403, 404, 409, 429] as const) {
      const response = await fixture(
        true,
        new UserReportError('Safe error.', status, status === 429 ? 600 : undefined),
      ).request();
      expect(response.status).toBe(status);
      expect(await response.json()).toEqual({ message: 'Safe error.' });
      if (status === 429) expect(response.headers.get('retry-after')).toBe('600');
    }
  });
});

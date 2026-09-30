import { expect, test } from 'bun:test';
import { createEventHighlightsRoute } from './index.ts';
import { eventHighlightInput, type EventHighlight } from '../../../../types/EventHighlight.ts';

const input = {
  date: '2026-10-02',
  imageUrl: 'https://images.swubase.com/logo.png',
  description: 'Homeworlds release',
};

test('highlight input permits only valid dates, public image host and bounded plain text', () => {
  expect(eventHighlightInput.safeParse(input).success).toBe(true);
  for (const imageUrl of [
    'bad',
    'javascript:alert(1)',
    'https://images.swubase.com.evil.test/image.png',
    'https://evil.test/a.png',
    'https://user@images.swubase.com/a.png',
    'http://images.swubase.com/a.png',
  ])
    expect(eventHighlightInput.safeParse({ ...input, imageUrl }).success).toBe(false);
  expect(eventHighlightInput.safeParse({ ...input, date: '2026-02-30' }).success).toBe(false);
  expect(eventHighlightInput.safeParse({ ...input, description: ' ' }).success).toBe(false);
});

test('admin gate precedes validation and CRUD handles success, bad input and missing rows', async () => {
  const rows = new Map<string, EventHighlight>();
  const service = {
    async list() {
      return [...rows.values()];
    },
    async create(value: typeof input) {
      const row = { ...value, id: crypto.randomUUID(), updatedAt: new Date().toISOString() };
      rows.set(row.id, row);
      return row;
    },
    async update(id: string, value: typeof input) {
      const row = rows.get(id);
      if (!row) return undefined!;
      const next = { ...row, ...value };
      rows.set(id, next);
      return next;
    },
    async remove(id: string) {
      return rows.delete(id);
    },
  };
  const anonymous = createEventHighlightsRoute(service);
  const denied = createEventHighlightsRoute(service, async c => ({
    user: null,
    response: c.json({ message: 'Forbidden' }, 403),
  }));
  for (const [path, method] of [
    ['/', 'GET'],
    ['/', 'POST'],
    ['/bad-id', 'PUT'],
    ['/bad-id', 'DELETE'],
  ]) {
    expect((await anonymous.request(path, { method })).status).toBe(401);
    expect((await denied.request(path, { method })).status).toBe(403);
  }
  expect(rows.size).toBe(0);
  const app = createEventHighlightsRoute(service, async c => ({
    user: c.get('user')!,
    response: null,
  }));
  const send = (path: string, method: string, value?: unknown) =>
    app.request(path, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: value ? JSON.stringify(value) : undefined,
    });
  expect((await send('/', 'POST', { ...input, date: 'bad' })).status).toBe(400);
  const created = await send('/', 'POST', input);
  expect(created.status).toBe(201);
  const { data } = await created.json();
  expect((await (await app.request('/')).json()).data).toHaveLength(1);
  expect((await send('/' + data.id, 'PUT', { ...input, date: '2026-10-09' })).status).toBe(200);
  expect(rows.get(data.id)?.date).toBe('2026-10-09');
  expect((await send('/bad-id', 'DELETE')).status).toBe(400);
  expect((await send('/' + crypto.randomUUID(), 'PUT', input)).status).toBe(404);
  expect((await send('/' + data.id, 'DELETE')).status).toBe(200);
  expect((await send('/' + data.id, 'DELETE')).status).toBe(404);
  expect(rows.size).toBe(0);
});

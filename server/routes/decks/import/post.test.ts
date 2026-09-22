import { afterEach, describe, expect, mock, spyOn, test } from 'bun:test';
import { Hono } from 'hono';
import { zDeckImportRequest } from '../../../../types/DeckImport.ts';
import { formatData } from '../../../../types/Format.ts';
import type { AuthExtension } from '../../../auth/auth.ts';
import { decksImportPostRoute } from './post.ts';
import { decksImportSwudbPostRoute } from '../import-swudb/post.ts';
import * as imports from '../../../lib/decks/importDeck.ts';

afterEach(() => mock.restore());

describe.each([
  {
    path: '/import',
    route: decksImportPostRoute,
    payload: { deckLink: 'https://swudb.com/deck/test' },
  },
  { path: '/import-swudb', route: decksImportSwudbPostRoute, payload: { swudbDeckId: 'test' } },
])('$path requires an explicit supported format', ({ path, route, payload }) => {
  const app = new Hono().route(path, route);

  test.each([undefined, null, '', 'Premier', '1', 0, -1, 99, 1.5])(
    'rejects invalid format %j before contacting a provider',
    async format => {
      const fetchDeck = spyOn(globalThis, 'fetch');
      const response = await app.request(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, format }),
      });

      expect(response.status).toBe(400);
      expect(fetchDeck).not.toHaveBeenCalled();
    },
  );

  test('still requires authentication with a valid format', async () => {
    const response = await app.request(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, format: 6 }),
    });
    expect(response.status).toBe(401);
  });
});

test.each(formatData.map(format => format.id))('accepts SWUBase format %i', format => {
  expect(zDeckImportRequest.parse({ deckLink: ' https://swudb.com/deck/test ', format })).toEqual({
    deckLink: 'https://swudb.com/deck/test',
    format,
  });
});

test('passes the requested format to the import service', async () => {
  const app = new Hono<AuthExtension>();
  app.use('*', async (c, next) => {
    c.set('user', { id: 'owner' } as NonNullable<AuthExtension['Variables']['user']>);
    await next();
  });
  app.route('/import', decksImportPostRoute);
  spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ deck: [], sideboard: [] }));
  const importDeck = spyOn(imports, 'importDeckForUser').mockResolvedValue({
    deck: { id: 'created-deck', format: 6 } as Awaited<
      ReturnType<typeof imports.importDeckForUser>
    >['deck'],
    errors: [],
  });

  const response = await app.request('/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deckLink: 'https://swudb.com/deck/test', format: 6 }),
  });

  expect(response.status).toBe(201);
  expect(importDeck).toHaveBeenCalledWith(
    expect.objectContaining({ userId: 'owner', deckId: 'test', format: 6 }),
  );
});

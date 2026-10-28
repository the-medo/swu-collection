import { afterEach, expect, test } from 'bun:test';
import { fetchRoundMatches } from './tournamentImportLib.ts';

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});

test('strict round fetch refuses an incomplete page sequence', async () => {
  let calls = 0;
  globalThis.fetch = (async () =>
    Response.json({
      recordsTotal: 2,
      data: calls++ === 0 ? [{ ID: 1 }] : [],
    })) as unknown as typeof fetch;
  await expect(fetchRoundMatches(123, { requireComplete: true })).rejects.toThrow(
    'Incomplete match response',
  );
  expect(calls).toBe(2);
});

test('strict round fetch refuses malformed totals and error responses', async () => {
  for (const response of [
    Response.json({ data: [], recordsTotal: 'not a count' }),
    Response.json({ recordsTotal: 2 }),
    new Response('Unavailable', { status: 503 }),
  ]) {
    globalThis.fetch = (async () => response) as unknown as typeof fetch;
    await expect(fetchRoundMatches(123, { requireComplete: true })).rejects.toThrow();
  }
});

test('strict round fetch collects all pages', async () => {
  let calls = 0;
  globalThis.fetch = (async () =>
    Response.json({
      recordsTotal: 2,
      data: [{ ID: ++calls }],
    })) as unknown as typeof fetch;
  expect(await fetchRoundMatches(123, { requireComplete: true })).toEqual([{ ID: 1 }, { ID: 2 }]);
});

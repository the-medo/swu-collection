import { expect, test } from 'bun:test';
import { fetchMeleeResults, type MeleeResult } from './results.ts';

export const resultFixture = (id: number, overrides: Partial<MeleeResult> = {}): MeleeResult => ({
  UserName: 'Example',
  TournamentId: id,
  TournamentName: 'Tournament',
  Game: 'StarWarsUnlimited',
  TournamentStatus: 4,
  TournamentStartDate: '2026-01-02T08:00:00Z',
  ParticipatingCount: 100,
  Rank: 8,
  Format: null,
  Record: '5-1-0',
  DecklistId: 0,
  DecklistName: 'Decklist',
  ...overrides,
});

function pages(responses: unknown[], starts: number[] = []) {
  return (async (_url: unknown, init: RequestInit) => {
    starts.push(Number(new URLSearchParams(String(init.body)).get('start')));
    return Response.json(responses.shift());
  }) as typeof fetch;
}
const page = (data: MeleeResult[], total = data.length) => ({
  recordsTotal: total,
  recordsFiltered: total,
  data,
});

test('fetches every page using returned lengths, filters other games and deduplicates exact entries', async () => {
  const starts: number[] = [];
  const results = await fetchMeleeResults(
    'Example',
    pages(
      [
        page(
          [resultFixture(1, { Game: 'MagicTheGathering' }), resultFixture(2), resultFixture(2)],
          4,
        ),
        page([resultFixture(3, { Rank: 0 })], 4),
      ],
      starts,
    ),
  );
  expect(starts).toEqual([0, 3]);
  expect(results.map(row => row.TournamentId)).toEqual([2, 3]);
  expect(results[1]!.Rank).toBe(0);
});

test('empty history is a valid complete snapshot', async () => {
  expect(await fetchMeleeResults('Example', pages([page([])]))).toEqual([]);
});

test('rejects truncated, repeated, conflicting, wrong-user and changing pages', async () => {
  for (const responses of [
    [page([resultFixture(1)], 2), page([], 2)],
    [page([resultFixture(1)], 2), page([resultFixture(1)], 2)],
    [page([resultFixture(1), resultFixture(1, { Rank: 1 })])],
    [page([resultFixture(2)], 2), page([resultFixture(1)], 2)],
    [page([resultFixture(1, { UserName: 'Other' })])],
    [page([resultFixture(1)], 2), page([resultFixture(2)], 3)],
    [{ recordsTotal: 0, recordsFiltered: 0 }],
  ])
    await expect(fetchMeleeResults('Example', pages(responses))).rejects.toThrow(
      'saved results have been kept',
    );
});

test('network, HTML and non-success responses become safe errors', async () => {
  for (const fetcher of [
    async () => {
      throw new Error('secret upstream details');
    },
    async () => new Response('<html>blocked</html>', { headers: { 'content-type': 'text/html' } }),
    async () => Response.json({}, { status: 503 }),
  ])
    await expect(fetchMeleeResults('Example', fetcher as typeof fetch)).rejects.toThrow(
      'Could not refresh all results',
    );
});

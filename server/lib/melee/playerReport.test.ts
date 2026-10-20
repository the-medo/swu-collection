import { expect, test } from 'bun:test';
import { createMeleePlayerReportFetcher, parseMeleePlayerReport } from './playerReport.ts';

const rounds = new Map([
  ['round 1', 1],
  ['round 2', 2],
  ['round 3', 3],
  ['quarterfinals', 4],
]);
const match = (overrides: Record<string, unknown> = {}) => ({
  roundName: 'Round 1',
  opponentName: 'Opponent display name',
  opponentUsername: 'opponent',
  result: 'SB_Medo won 2-1-0',
  shortResult: 'Win 2-1-0',
  opponentDecklistId: 'not-a-swubase-deck',
  opponentDecklistName: 'Must not be exposed',
  ...overrides,
});
const report = (matches = [match()]) => ({ username: 'SB_Medo', matches, decklists: [] });
const standing = (id = 4377509, username = 'SB_Medo') => ({
  Team: { Players: [{ ID: id, Username: username }] },
});
const page = (data = [standing()], filtered = data.length) => ({
  recordsTotal: 408,
  recordsFiltered: filtered,
  data,
});
const html = (id = 467203) => `<input id="tournament-id" value="${id}">
  <div id="standings-round-selector-container">
    <button class="round-selector" data-id="10" data-name="Round 1" data-is-completed="True"></button>
    <button class="round-selector" data-id="11" data-name="Round 2" data-is-completed="True"></button>
    <button class="round-selector" data-id="12" data-name="Quarterfinals" data-is-completed="True"></button>
  </div>
  <div id="pairings-round-selector-container">
    <button class="round-selector" data-id="10" data-name="Round 1"></button>
    <button class="round-selector" data-id="11" data-name="Round 2"></button>
    <button class="round-selector" data-id="12" data-name="Quarterfinals"></button>
  </div>`;
type Call = { url: string; init: RequestInit };
function fetchFixture(responses: (Response | Error)[]) {
  const calls: Call[] = [];
  const fetcher = (async (url: string, init: RequestInit) => {
    calls.push({ url: String(url), init });
    const response = responses.shift();
    if (!response) throw new Error('Unexpected extra request');
    if (response instanceof Error) throw response;
    return response;
  }) as typeof fetch;
  return { calls, fetcher };
}
const htmlResponse = (value = html()) =>
  new Response(value, { headers: { 'content-type': 'text/html' } });
const responses = () => [htmlResponse(), Response.json(page()), Response.json(report())];

test('fetches only the searched player and all of their matches in one player request, without cookies or decklists', async () => {
  const fixture = fetchFixture([
    htmlResponse(),
    Response.json(page([standing(123, 'SB_Medo_fan'), standing()])),
    Response.json(
      report([match(), match({ roundName: 'Quarterfinals', shortResult: 'Loss 2-0-0' })]),
    ),
  ]);
  const result = await createMeleePlayerReportFetcher(fixture.fetcher)(467203, 'SB_Medo');
  expect(fixture.calls.map(call => call.url)).toEqual([
    'https://melee.gg/Tournament/View/467203',
    'https://melee.gg/Standing/GetRoundStandings',
    'https://melee.gg/Player/GetPlayerDetails?id=4377509',
  ]);
  const form = new URLSearchParams(fixture.calls[1]!.init.body as URLSearchParams);
  expect(form.get('search[value]')).toBe('SB_Medo');
  expect(form.get('search[regex]')).toBe('false');
  expect(form.get('roundId')).toBe('12');
  expect(result.map(round => round.round)).toEqual([1, 3]);
  expect(result[1]!.record).toBeNull();
  expect(result.every(round => round.opponentDeck === null)).toBe(true);
  expect(JSON.stringify(result)).not.toContain('Must not be exposed');
  for (const call of fixture.calls) {
    expect(new Headers(call.init.headers).has('cookie')).toBe(false);
    expect(call.init.redirect).toBe('error');
    expect(call.init.signal).toBe(fixture.calls[0]!.init.signal);
  }
});

test('sorts rounds, reverses loss scores, and retains cumulative records without requiring decks', () => {
  const result = parseMeleePlayerReport(
    report([
      match({
        roundName: 'Round 2',
        result: 'Opponent display name won 2-1-0',
        shortResult: 'Loss 2-1-0',
      }),
      match(),
      match({ roundName: 'Round 3', result: '1-1-0 Draw', shortResult: 'Draw 1-1-0' }),
    ]),
    'sb_medo',
    rounds,
  );
  expect(result.map(row => row.outcome)).toEqual(['win', 'loss', 'draw']);
  expect(result[1]!.games).toEqual({ wins: 1, losses: 2, draws: 0 });
  expect(result[2]!.record).toEqual({ wins: 1, losses: 1, draws: 1 });
});

test('byes, draws without game scores, and unknown forfeits do not invent scores or records', () => {
  const result = parseMeleePlayerReport(
    report([
      match({
        opponentName: null,
        opponentUsername: null,
        result: 'SB_Medo was assigned a bye',
        shortResult: 'Bye',
      }),
      match({ roundName: 'Round 2', result: 'Draw', shortResult: 'Draw' }),
      match({ roundName: 'Round 3', result: 'Players forfeited the match', shortResult: null }),
    ]),
    'SB_Medo',
    rounds,
  );
  expect(result[0]).toMatchObject({
    outcome: 'bye',
    games: null,
    opponentName: null,
    record: { wins: 1, losses: 0, draws: 0 },
  });
  expect(result[1]).toMatchObject({
    outcome: 'draw',
    games: null,
    record: { wins: 1, losses: 0, draws: 1 },
  });
  expect(result[2]).toMatchObject({ outcome: 'unknown', games: null, record: null });
  expect(
    parseMeleePlayerReport(report([match({ roundName: 'Round 2' })]), 'SB_Medo', rounds)[0]!.record,
  ).toBeNull();
});

test('rejects wrong-player, unknown-round, and duplicate-round reports', () => {
  for (const value of [
    { ...report(), username: 'someone-else' },
    report([match({ roundName: 'Unrecognized phase' })]),
    report([match(), match()]),
  ])
    expect(() => parseMeleePlayerReport(value, 'SB_Medo', rounds)).toThrow();
});

test('paginates only filtered standings and requires a unique exact username', async () => {
  const fixture = fetchFixture([
    htmlResponse(),
    Response.json(page([standing(123, 'SB_Medo_fan')], 2)),
    Response.json(page([standing()], 2)),
    Response.json(report()),
  ]);
  expect(await createMeleePlayerReportFetcher(fixture.fetcher)(467203, 'SB_Medo')).toHaveLength(1);
  expect(new URLSearchParams(fixture.calls[2]!.init.body as URLSearchParams).get('start')).toBe(
    '1',
  );
  for (const pages of [
    [page([standing(123, 'SB_Medo_fan')])],
    [page([standing(), standing(124)])],
    [page([standing()], 2), page([], 2)],
    [page([standing()], 2), page([standing()], 2)],
    [page([standing()], 2), page([standing(125)], 3)],
    [{ ...page(), recordsFiltered: 0 }],
  ]) {
    const bad = fetchFixture([htmlResponse(), ...pages.map(value => Response.json(value))]);
    await expect(
      createMeleePlayerReportFetcher(bad.fetcher)(467203, 'SB_Medo'),
    ).rejects.toMatchObject({ status: 502 });
    expect(bad.calls.some(call => call.url.includes('/Player/'))).toBe(false);
  }
});

test('coalesces requests, caches briefly per event and username, and does not cache failures', async () => {
  let time = 0;
  const fixture = fetchFixture([
    ...responses(),
    ...responses(),
    new Error('private error'),
    ...responses(),
  ]);
  const fetchReport = createMeleePlayerReportFetcher(fixture.fetcher, () => time);
  const [a, b] = await Promise.all([
    fetchReport(467203, 'SB_Medo'),
    fetchReport(467203, 'sb_medo'),
  ]);
  expect(a).toEqual(b);
  expect(fixture.calls).toHaveLength(3);
  a[0]!.opponentName = 'Changed in editor';
  expect((await fetchReport(467203, 'SB_Medo'))[0]!.opponentName).toBe('Opponent display name');
  time = 60_000;
  await fetchReport(467203, 'SB_Medo');
  expect(fixture.calls).toHaveLength(6);
  await expect(fetchReport(467204, 'SB_Medo')).rejects.toMatchObject({ status: 502 });
  time = 120_000;
  await fetchReport(467203, 'SB_Medo');
  const failure = fetchFixture([new Error('upstream secret'), ...responses()]);
  const retry = createMeleePlayerReportFetcher(failure.fetcher);
  await expect(retry(467203, 'SB_Medo')).rejects.toThrow('Could not load your rounds');
  expect(await retry(467203, 'SB_Medo')).toHaveLength(1);
  await expect(retry(467203, 'Other')).rejects.toMatchObject({ status: 502 });
});

test('unstarted events can be empty; blocked, oversized, wrong-event and malformed responses fail visibly', async () => {
  const empty = fetchFixture([htmlResponse('<input id="tournament-id" value="467203">')]);
  expect(await createMeleePlayerReportFetcher(empty.fetcher)(467203, 'SB_Medo')).toEqual([]);
  const unpublished = fetchFixture([
    htmlResponse(html().replaceAll('data-is-completed="True"', 'data-is-completed="False"')),
  ]);
  expect(await createMeleePlayerReportFetcher(unpublished.fetcher)(467203, 'SB_Medo')).toEqual([]);
  expect(unpublished.calls).toHaveLength(1);
  for (const response of [
    htmlResponse('<html>login or challenge page</html>'),
    htmlResponse(html(1)),
    htmlResponse(html().replaceAll('data-name="Quarterfinals"', 'data-name="Round 2"')),
    htmlResponse(html().replaceAll('data-name="Round 2"', 'data-name="Round 3"')),
    htmlResponse('x'.repeat(2_000_001)),
    Response.json({}, { status: 503 }),
  ]) {
    const bad = fetchFixture([response]);
    await expect(
      createMeleePlayerReportFetcher(bad.fetcher)(467203, 'SB_Medo'),
    ).rejects.toMatchObject({ status: 502 });
  }
  const badJson = fetchFixture([htmlResponse(), htmlResponse('<html>blocked</html>')]);
  await expect(
    createMeleePlayerReportFetcher(badJson.fetcher)(467203, 'SB_Medo'),
  ).rejects.toMatchObject({ status: 502 });
});

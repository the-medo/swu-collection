import { afterEach, expect, test } from 'bun:test';
import {
  fetchRoundMatches,
  findDecklistForFormat,
  parseStandingsToTournamentDeck,
} from './tournamentImportLib.ts';
import type { Tournament } from '../../db/schema/tournament.ts';
import type { TournamentDeck } from '../../db/schema/tournament_deck.ts';

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

const premierContext = { tournamentId: '466423', standingFormat: 'Premier' };
const freeformReference = { id: 'hover-deck', name: 'Submitted deck' };
const deckPage = (
  format = 'Free-form',
  tournamentId = '466423',
  text = 'Leaders\n1 | Sabine Wren | Galvanized Revolutionary',
) =>
  `<input id="tournament-id-field" value="${tournamentId}">
   <div class="decklist-details-row"><span class="text-nowrap">${format}</span></div>
   <pre id="decklist-swu-text">${text}</pre>`;

test('Premier standings accept a readable Free-form hover deck from the same tournament', async () => {
  globalThis.fetch = (async () => new Response(deckPage())) as typeof fetch;
  expect(await findDecklistForFormat([freeformReference], 'Premier', premierContext)).toEqual(
    freeformReference,
  );
  const explicitFreeform = { DecklistId: 'hover-deck', Format: 'Free-form' };
  expect(await findDecklistForFormat([explicitFreeform], 'Premier', premierContext)).toEqual(
    explicitFreeform,
  );
});

test('Free-form fallback requires the tournament, Premier standing and a nonempty SWU export', async () => {
  for (const [page, context] of [
    [deckPage('Free-form', 'another-tournament'), premierContext],
    [deckPage('Free-form', '466423', '   '), premierContext],
    [deckPage('Draft'), premierContext],
    [deckPage('Sealed'), premierContext],
    [deckPage(), { ...premierContext, standingFormat: 'Draft' }],
    [deckPage(), undefined],
  ] as const) {
    globalThis.fetch = (async () => new Response(page)) as typeof fetch;
    expect(await findDecklistForFormat([freeformReference], 'Premier', context)).toBeUndefined();
  }
});

test('an exact Premier deck takes precedence over a Free-form fallback', async () => {
  globalThis.fetch = (async () => new Response(deckPage())) as typeof fetch;
  const premierDeck = { DecklistId: 'premier-deck', Format: 'Premier' };
  expect(
    await findDecklistForFormat([freeformReference, premierDeck], 'Premier', premierContext),
  ).toEqual(premierDeck);
});

const tournamentFixture = { id: 'tournament', name: 'PQ fixture' } as Tournament;
const standingFixture = {
  Rank: 2,
  Team: { Players: [{ ID: 2, DisplayName: 'Bob' }] },
  MatchWins: 1,
  MatchLosses: 1,
  MatchDraws: 0,
  MatchRecord: '1-1-0',
  Points: 3,
};
const existingDeck = (name: string, guid: string | null = null): TournamentDeck => ({
  tournamentId: tournamentFixture.id,
  deckId: `${name}-deck`,
  placement: 1,
  topRelativeToPlayerCount: false,
  recordWin: 1,
  recordLose: 1,
  recordDraw: 0,
  points: 3,
  meleeDecklistGuid: guid,
  meleePlayerUsername: name,
});
const parseStanding = (decks: TournamentDeck[], guid?: string) =>
  parseStandingsToTournamentDeck(
    standingFixture,
    tournamentFixture,
    decks,
    { skippedStandings: [] },
    guid ? { 2: { DecklistId: guid } } : {},
  );

test('a newly discovered deck fills its own existing placeholder', () => {
  expect(parseStanding([existingDeck('Alice'), existingDeck('Bob')], 'bob-melee')).toMatchObject({
    exists: true,
    filledPlaceholder: true,
    tournamentDeck: { deckId: 'Bob-deck', meleeDecklistGuid: 'bob-melee' },
  });
});

test('missing GUIDs never make different players share an existing placeholder', () => {
  expect(parseStanding([existingDeck('Alice')])).toMatchObject({ exists: false });
  expect(parseStanding([existingDeck('Alice'), existingDeck('Bob')])).toMatchObject({
    exists: true,
    filledPlaceholder: false,
    tournamentDeck: { deckId: 'Bob-deck', meleeDecklistGuid: null },
  });
});

test('reruns preserve known GUIDs and prefer GUID identity over a player placeholder', () => {
  expect(parseStanding([existingDeck('Bob', 'bob-melee')])).toMatchObject({
    exists: true,
    filledPlaceholder: false,
    tournamentDeck: { deckId: 'Bob-deck', meleeDecklistGuid: 'bob-melee' },
  });
  expect(
    parseStanding([existingDeck('Bob'), existingDeck('OldName', 'bob-melee')], 'bob-melee'),
  ).toMatchObject({
    exists: true,
    tournamentDeck: { deckId: 'OldName-deck', meleePlayerUsername: 'Bob' },
  });
  expect(parseStanding([existingDeck('Bob', 'different-melee')], 'bob-melee')).toMatchObject({
    exists: false,
  });
});

test('ambiguous player placeholders fail instead of choosing an arbitrary deck', () => {
  expect(() =>
    parseStanding(
      [existingDeck('Bob'), { ...existingDeck('Bob'), deckId: 'duplicate' }],
      'bob-melee',
    ),
  ).toThrow('Resolve duplicate participant names or stale tournament rows');
});

test("a missing decklist prefers a placeholder and cannot claim another standing's known GUID", () => {
  const claimed = { ...existingDeck('Bob', 'other-player-guid'), deckId: 'other-player-deck' };
  const parse = (decks: TournamentDeck[]) =>
    parseStandingsToTournamentDeck(
      standingFixture,
      tournamentFixture,
      decks,
      { skippedStandings: [] },
      { 1: { DecklistId: 'other-player-guid' } },
    );
  expect(parse([claimed, existingDeck('Bob')])).toMatchObject({
    exists: true,
    tournamentDeck: { deckId: 'Bob-deck', meleeDecklistGuid: null },
  });
  expect(parse([claimed])).toMatchObject({ exists: false });
});

test('two same-name participants cannot reuse the same placeholder in one import', () => {
  const additionalInfo = { skippedStandings: [] };
  const decks = [existingDeck('Bob')];
  const decklists = { 1: { DecklistId: 'first-player-guid' } };
  expect(
    parseStandingsToTournamentDeck(
      { ...standingFixture, Team: { Players: [{ ID: 1, DisplayName: 'Bob' }] } },
      tournamentFixture,
      decks,
      additionalInfo,
      decklists,
    ),
  ).toMatchObject({ exists: true, filledPlaceholder: true });
  expect(() =>
    parseStandingsToTournamentDeck(
      standingFixture,
      tournamentFixture,
      decks,
      additionalInfo,
      decklists,
    ),
  ).toThrow('Multiple participants resolve to existing deck');
});

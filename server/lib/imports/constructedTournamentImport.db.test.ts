import { afterAll, afterEach, expect, test } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { eq, inArray } from 'drizzle-orm';
import { db } from '../../db';
import { deck } from '../../db/schema/deck.ts';
import { deckCard } from '../../db/schema/deck_card.ts';
import { deckInformation } from '../../db/schema/deck_information.ts';
import { entityResource } from '../../db/schema/entity_resource.ts';
import { tournament } from '../../db/schema/tournament.ts';
import { tournamentDeck } from '../../db/schema/tournament_deck.ts';
import { tournamentMatch } from '../../db/schema/tournament_match.ts';
import { sendTournamentResultsDiscordMessage } from '../discord/tournamentResults.ts';
import { runTournamentImport } from './tournamentImportWorkflow.ts';

const enabled = process.env.SWUBASE_LIMITED_IMPORT_DB_TEST === '1';
const databaseTest = test.skipIf(!enabled);
if (enabled) {
  const target = new URL(process.env.DATABASE_URL!);
  if (target.hostname !== '127.0.0.1' || !target.pathname.startsWith('/swubase_')) {
    throw new Error('Tests require the isolated worktree database');
  }
}

const tournamentIds: string[] = [];
const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});
afterAll(async () => {
  if (!tournamentIds.length) return;
  const links = await db
    .select()
    .from(tournamentDeck)
    .where(inArray(tournamentDeck.tournamentId, tournamentIds));
  const deckIds = links.map(row => row.deckId);
  await db.delete(tournamentMatch).where(inArray(tournamentMatch.tournamentId, tournamentIds));
  await db.delete(tournamentDeck).where(inArray(tournamentDeck.tournamentId, tournamentIds));
  await db.delete(tournament).where(inArray(tournament.id, tournamentIds));
  if (deckIds.length) {
    await db.delete(deckCard).where(inArray(deckCard.deckId, deckIds));
    await db.delete(deckInformation).where(inArray(deckInformation.deckId, deckIds));
    await db.delete(entityResource).where(inArray(entityResource.entityId, deckIds));
    await db.delete(deck).where(inArray(deck.id, deckIds));
  }
});

const deckText = `Leader
1 | Sabine Wren | Galvanized Revolutionary
Base
1 | Energy Conversion Lab
Main Deck
3 | Battlefield Marine
Sideboard
2 | Resupply`;

function mockConstructedMelee(format: number, useRoundFallback = false) {
  const requests: string[] = [];
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = String(input);
    requests.push(url);
    if (url.includes('/Tournament/View/')) {
      return new Response(
        '<div id="standings-round-selector-container">' +
          [201, 202]
            .map(
              (id, index) =>
                `<button class="round-selector" data-id="${id}" data-name="Round ${index + 1}" data-is-completed="true"></button>`,
            )
            .join('') +
          '</div>',
      );
    }
    if (url.endsWith('/Standing/GetRoundStandings')) {
      return Response.json({
        recordsTotal: 2,
        data: ['Alice', 'Bob'].map((name, index) => ({
          Rank: index + 1,
          Team: { Players: [{ ID: index + 1, DisplayName: name }] },
          Decklists: [
            // Premier discovery must still ignore a limited deck listed first.
            ...(format === 1 ? [{ DecklistId: 'draft', Format: 'Draft' }] : []),
            {
              DecklistId: name,
              DecklistName: 'Sabine',
              Format: format === 1 ? 'Premier' : 'Eternal',
            },
          ],
          MatchWins: 1,
          MatchLosses: 1,
          MatchDraws: 0,
          MatchRecord: '1-1-0',
          Points: 3,
        })),
      });
    }
    if (/\/Decklist\/View\/(Alice|Bob)$/.test(url)) {
      return new Response(`<pre id="decklist-swu-text">${deckText}</pre>`);
    }
    if (/\/Decklist\/GetTournamentViewData\/(Alice|Bob)$/.test(url)) {
      const opponent = url.endsWith('/Alice') ? 'Bob' : 'Alice';
      return Response.json({
        Json: JSON.stringify({
          Matches: useRoundFallback
            ? []
            : ['Alice won 2-1-0', 'Bob won 2-0-0'].map((Result, index) => ({
                Round: index + 1,
                Opponent: opponent,
                OpponentDecklistGuid: opponent,
                Result,
              })),
        }),
      });
    }
    const roundId = Number(url.match(/\/Match\/GetRoundMatches\/(\d+)$/)?.[1]);
    if ([201, 202].includes(roundId)) {
      return Response.json({
        recordsTotal: 1,
        data: [
          {
            RoundNumber: roundId - 200,
            Competitors: ['Alice', 'Bob'].map(DisplayName => ({
              Team: { Players: [{ DisplayName }] },
            })),
            ResultString: roundId === 201 ? 'Alice won 2-1-0' : 'Bob won 2-0-0',
          },
        ],
      });
    }
    throw new Error(`Unexpected external request: ${url}`);
  }) as typeof fetch;
  return requests;
}

for (const format of [1, 6]) {
  databaseTest(
    `constructed format ${format}: full import, existing deck rerun, round fallback and partial import`,
    async () => {
      const id = randomUUID();
      await db.insert(tournament).values({
        id,
        userId: 'swubase',
        name: 'Constructed import regression fixture',
        type: 'pq',
        location: 'Test',
        continent: 'Europe',
        attendance: 2,
        format,
        days: 1,
        date: new Date('2026-01-01'),
        meleeId: '12345',
        imported: true,
      });
      tournamentIds.push(id);
      const readLinks = () =>
        db
          .select()
          .from(tournamentDeck)
          .where(eq(tournamentDeck.tournamentId, id))
          .orderBy(tournamentDeck.placement);
      const readMatches = () =>
        db
          .select()
          .from(tournamentMatch)
          .where(eq(tournamentMatch.tournamentId, id))
          .orderBy(tournamentMatch.round);

      mockConstructedMelee(format);
      await runTournamentImport(id);
      const links = await readLinks();
      expect(links).toHaveLength(2);
      expect(links.map(row => row.meleeDecklistGuid)).toEqual(['Alice', 'Bob']);
      const deckIds = links.map(row => row.deckId);
      const readCards = () =>
        db
          .select()
          .from(deckCard)
          .where(inArray(deckCard.deckId, deckIds))
          .orderBy(deckCard.deckId, deckCard.board);
      const readResources = () =>
        db
          .select()
          .from(entityResource)
          .where(inArray(entityResource.entityId, deckIds))
          .orderBy(entityResource.id);
      const cards = await readCards();
      for (const deckId of deckIds) {
        expect(cards.filter(row => row.deckId === deckId)).toMatchObject([
          { cardId: 'battlefield-marine', board: 1, quantity: 3 },
          { cardId: 'resupply', board: 2, quantity: 2 },
        ]);
      }
      const initialMatches = await readMatches();
      expect(initialMatches).toHaveLength(2);
      expect(initialMatches).toMatchObject([
        { p1DeckId: deckIds[0], p2DeckId: deckIds[1], result: 3, gameWin: 2, gameLose: 1 },
        { p1DeckId: deckIds[0], p2DeckId: deckIds[1], result: 0, gameWin: 0, gameLose: 2 },
      ]);

      await runTournamentImport(id);
      expect(await readLinks()).toEqual(links);
      expect(await readCards()).toEqual(cards);
      expect((await readMatches()).map(({ id: _id, ...row }) => row)).toEqual(
        initialMatches.map(({ id: _id, ...row }) => row),
      );

      const fallbackRequests = mockConstructedMelee(format, true);
      await runTournamentImport(id);
      expect(fallbackRequests.filter(url => url.includes('/Match/GetRoundMatches/'))).toHaveLength(
        2,
      );
      expect(await readMatches()).toMatchObject([
        { p1DeckId: deckIds[0], p2DeckId: deckIds[1], gameWin: 2, gameLose: 1 },
        { p1DeckId: deckIds[0], p2DeckId: deckIds[1], gameWin: 0, gameLose: 2 },
      ]);
      const beforePartial = await readMatches();
      const resources = await readResources();
      expect(resources).toHaveLength(6);
      const partialRequests = mockConstructedMelee(format);
      await runTournamentImport(id, '', [2]);
      expect((await readMatches())[0]).toEqual(beforePartial[0]);
      expect(await readLinks()).toEqual(links);
      expect(await readCards()).toEqual(cards);
      expect(await readResources()).toEqual(resources);
      expect(partialRequests.some(url => url.includes('/Decklist/'))).toBe(false);
      expect(partialRequests.filter(url => url.includes('/Match/GetRoundMatches/'))).toEqual([
        'https://melee.gg/Match/GetRoundMatches/202',
      ]);
      const decks = await db.select().from(deck).where(inArray(deck.id, deckIds));
      expect(decks).toHaveLength(2);
      for (const row of decks) {
        expect(row).toMatchObject({
          userId: 'swubase',
          format,
          public: 1,
          leaderCardId1: 'sabine-wren--galvanized-revolutionary',
          baseCardId: 'energy-conversion-lab',
        });
      }
      expect(
        await db.select().from(deckInformation).where(inArray(deckInformation.deckId, deckIds)),
      ).toHaveLength(2);
      // Normal results remain eligible for Discord. Dry-run must never contact Discord.
      expect(
        await sendTournamentResultsDiscordMessage({
          tournamentId: id,
          dryRun: true,
          config: {
            enabled: true,
            allowTextOnly: true,
            roleId: 'test-role',
            apiBaseUrl: 'https://discord.invalid',
            appBaseUrl: 'http://localhost:5180',
          },
          fetchFn: (async () => {
            throw new Error('Must not send');
          }) as unknown as typeof fetch,
        }),
      ).toMatchObject({ status: 'dry-run', tournamentId: id });
    },
    30000,
  );
}

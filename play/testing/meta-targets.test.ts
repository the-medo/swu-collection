import { prepareDeckSnapshot, type CardIdentityCatalog } from '../admission/decks.ts';
import { expect, test } from 'bun:test';
import targets from './fixtures/meta-targets.json';

test('the expanded public snapshot retains the original ranking and all final Top 8 placements', () => {
  expect(targets.ranking).toHaveLength(200);
  expect(targets.sampleDecks).toBe(9283);
  expect(targets.top8).toHaveLength(344);
  expect(targets.top8.filter(d => d.placement === 1).map(({ placement, ...d }) => d)).toEqual(
    targets.winners,
  );
  for (const id of new Set(targets.top8.map(d => d.tournamentId))) {
    expect(targets.top8.filter(d => d.tournamentId === id).map(d => d.placement)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8,
    ]);
  }
  expect(
    targets.top8.every(d => d.cards.every(c => c.quantity > 0 && [1, 2].includes(c.board))),
  ).toBe(true);
  expect(targets.top8.some(d => d.placement === 8 && d.cards.some(c => c.board === 2))).toBe(true);
});

test('strict coverage reports incomplete nonwinning lists and unavailable results separately', () => {
  const run = Bun.spawnSync(['bun', 'play/scripts/card-targets.ts', '--require-complete'], {
    cwd: new URL('../../', import.meta.url).pathname,
  });
  expect(run.exitCode).toBe(1);
  const report = JSON.parse(run.stdout.toString());
  expect(report.top8DecksTotal).toBe(344);
  expect(
    report.top8Decks.find(
      (d: { deckId: string }) => d.deckId === 'cb60896c-6903-4b73-a284-bd76136c3eaa',
    ),
  ).toMatchObject({ placement: 8, completeList: false });
  expect(report.missingTop8Results).toHaveLength(19);
  expect(report.top200).toEqual({ implemented: 200, total: 200 });
  expect(report.union).toEqual({ implemented: 551, total: 551 });
  expect(report.unsupported).toEqual([]);
  expect(report.top8DecksReady).toBe(342);
  expect(report.top8Decks.filter((d: { completeList: boolean }) => !d.completeList)).toHaveLength(
    2,
  );
});

test('every complete Top 8 list passes the actual deck admission contract with supported sideboards', async () => {
  const catalog: CardIdentityCatalog = await Bun.file(
    new URL('../../server/db/json/card-list.json', import.meta.url),
  ).json();
  const complete = targets.top8.filter(d => d.leader && d.base && d.cards.some(c => c.board === 1));
  expect(complete).toHaveLength(342);
  for (const deck of complete) {
    const result = prepareDeckSnapshot(
      {
        source: { deckId: deck.deckId, format: 1, kind: 'normal' },
        leader: deck.leader,
        leader2: deck.secondLeader,
        base: deck.base,
        mainboard: deck.cards
          .filter(c => c.board === 1)
          .map(({ cardId, quantity }) => ({ cardId, quantity })),
        sideboard: deck.cards
          .filter(c => c.board === 2)
          .map(({ cardId, quantity }) => ({ cardId, quantity })),
        reserve: [],
      },
      catalog,
      'core-practice',
    );
    expect(result.ok).toBe(true);
    if (!result.ok)
      throw new Error(`${deck.name}, place ${deck.placement}: ${JSON.stringify(result.issues)}`);
    expect(result.snapshot.inactiveUnsupported).toEqual([]);
  }
});

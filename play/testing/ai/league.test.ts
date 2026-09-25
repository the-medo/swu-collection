import { expect, test } from 'bun:test';
import { FullGame, leagueGameContract } from '../../ai/full-game/game.ts';
import { FullSession } from '../../ai/full-game/bridge.ts';
import { leagueRoster } from '../../ai/full-game/roster.ts';
import { randomSource } from '../../ai/random.ts';

test('league sessions require an explicit admitted deck pair and permit uncapped games', () => {
  const session = new FullSession(true);
  expect(session.handle({ id: 0, op: 'hello' })).toEqual(leagueGameContract);
  expect(() => session.handle({ id: 1, op: 'reset', seed: 3 })).toThrow();
  expect(() => session.handle({ id: 2, op: 'reset', seed: 3, decks: [0, 6] })).toThrow();
  session.handle({ id: 3, op: 'reset', seed: 3, decks: [5, 5], limit: null, autoForced: true });
  expect(session.game!.deckIndices).toEqual([5, 5]);
  expect(session.game!.limit).toBeNull();
  expect(session.game!.observation().done).toBe(false);
  expect(() => new FullSession().handle({ id: 1, op: 'reset', seed: 3, decks: [0, 1] })).toThrow();
});

for (let a = 0; a < leagueRoster.length; a++) {
  for (let b = 0; b < leagueRoster.length; b++) {
    test(`six-deck complete games and replay: ${leagueRoster[a]!.key} / ${leagueRoster[b]!.key}`, () => {
      for (const sampled of [false, true]) {
        const seed = 8100 + a * 6 + b;
        const game = new FullGame(seed, 0, 1500, true, true, [a, b]);
        const random = randomSource(seed + 100);
        let observation = game.observation();
        while (!observation.done) {
          expect(observation.context.length).toBe(leagueGameContract.encoding.contextSize);
          observation = sampled
            ? game.step(observation.ticket, random(observation.candidates.length))
            : game.reference(observation.ticket).observation;
        }
        expect(observation.outcome).toBe('terminal');
        expect(game.verifyReplay().verified).toBe(true);
      }
    }, 120_000);
  }
}

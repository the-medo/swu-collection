import { expect, test } from 'bun:test';
import { advance } from '../engine/advance.ts';
import { decodeState, encodeState } from '../engine/checkpoint.ts';
import type { GameState } from '../engine/model.ts';
import { instance, move } from '../engine/state.ts';
import { LocalGame, replay } from '../host/session.ts';
import { restoreActionState } from '../history/timeline.ts';
import { Projector } from '../projection/projector.ts';
import { clientMessageSchema } from '../view/wire.ts';
import { scenario } from './scenario.ts';
import { config, ids, position, setup } from './helpers.ts';
const key = 'hand-reveal-projection-test-secret';
const reveal = (state: GameState, playerId: string, revealed: boolean) =>
  advance(state, {
    type: 'set-hand-reveal',
    gameId: state.gameId,
    expectedRevision: state.revision,
    playerId,
    revealed,
  }).state;

test('each player reveals only their hand, including new cards, without advancing the turn', () => {
  const input = position();
  input.players[0].hand = [{ card: ids.fighter }];
  input.players[0].resources = [{ card: ids.consular }];
  input.players[1].hand = [{ card: ids.racer }];
  let state = scenario(input).state;
  const before = structuredClone(state);
  // Bob can change consent while Alice owns the decision.
  state = reveal(state, 'bob', true);
  const alice = new Projector(state.gameId, { role: 'player', playerId: 'alice' }, key);
  const bob = new Projector(state.gameId, { role: 'player', playerId: 'bob' }, key);
  const watcher = new Projector(state.gameId, { role: 'spectator' }, key);
  expect(alice.project(state).cards.some(c => c.owner === 'bob' && c.zone === 'hand')).toBe(true);
  expect(bob.project(state).cards.some(c => c.owner === 'alice' && c.zone === 'hand')).toBe(false);
  expect(watcher.project(state).cards.some(c => c.zone === 'hand')).toBe(false);
  expect(state.execution).toEqual(before.execution);
  expect(state.activePlayer).toBe(before.activePlayer);
  expect(state.phaseHistory).toEqual(before.phaseHistory);
  expect(state.facts).toEqual(before.facts);
  move(state, instance(state, state.players.bob!.deck[0]!), 'hand');
  expect(
    alice.project(state).cards.filter(c => c.owner === 'bob' && c.zone === 'hand'),
  ).toHaveLength(2);
  state = reveal(state, 'alice', true);
  expect(bob.project(state).cards.some(c => c.owner === 'alice' && c.zone === 'hand')).toBe(true);
  expect(
    bob.project(state).cards.find(c => c.zone === 'resources' && c.owner === 'alice')?.face,
  ).toBeNull();
  state = reveal(state, 'bob', false);
  const concealed = alice.project(state);
  expect(concealed.cards.some(c => c.zone === 'hand' && c.owner === 'bob')).toBe(false);
  const changed = structuredClone(state);
  instance(changed, changed.players.bob!.hand[0]!).cardId = ids.trooper;
  expect(alice.project(changed)).toEqual(concealed);
  // Spectator consent is independent of either player's choice.
  state.disclosure.handsToSpectators = true;
  expect(watcher.project(state).cards.filter(c => c.zone === 'hand')).toHaveLength(3);
  expect(
    new Projector(state.gameId, { role: 'spectator', showRevealedHands: false }, key)
      .project(state)
      .cards.some(c => c.zone === 'hand'),
  ).toBe(false);
});

test('hand consent survives checkpoints, command replay and undo; invalid owners and old pins are rejected', () => {
  const game = new LocalGame(config('hand-recording'), () => 0);
  const initial = setup(game);
  const input = {
    type: 'set-hand-reveal',
    gameId: initial.gameId,
    expectedRevision: initial.revision,
    playerId: 'alice',
    revealed: true,
  };
  const next = game.submit(input);
  expect(decodeState(encodeState(next))).toEqual(next);
  expect(replay(game.recording)).toEqual(next);
  expect(restoreActionState(next, initial).disclosure).toEqual(next.disclosure);
  expect(() => advance(initial, { ...input, playerId: 'outsider' })).toThrow();
  expect(() =>
    advance({ ...initial, versions: { ...initial.versions, engine: '1.2.0' } }, input),
  ).toThrow();
  expect(
    clientMessageSchema.safeParse({
      type: 'set-hand-reveal',
      commandId: crypto.randomUUID(),
      revealed: true,
      playerId: 'bob',
    }).success,
  ).toBe(false);
  const invalid = structuredClone(next);
  invalid.disclosure.revealedHands!.outsider = true;
  expect(() => decodeState(encodeState(invalid))).toThrow();
});

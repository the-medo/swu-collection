import { expect, test } from 'bun:test';
import { createInitialCheckpoint } from '../host/durable-game.ts';
import { decodeState } from '../engine/checkpoint.ts';
import { collectStatistics } from '../statistics/collect.ts';
import { historyFixture } from './history-fixture.ts';
import { config, choose, ids, position } from './helpers.ts';
import { scenario } from './scenario.ts';

test('setup draws/resources are counted once, with private per-player cards and mulligan/initiative', () => {
  const game = historyFixture(
    'statistics-setup',
    decodeState(createInitialCheckpoint(config('statistics-setup'))),
  );
  game.submit(choose(game.state, i => i.kind === 'initiative' && i.playerId === 'alice'));
  game.submit(choose(game.state, i => i.kind === 'mulligan' && i.take));
  game.submit(choose(game.state, i => i.kind === 'mulligan' && !i.take));
  for (let i = 0; i < 2; i++)
    game.choose('resource', game.state.execution.decision!.selection!.cards.slice(0, 2));
  game.finish();
  const { players } = collectStatistics(game.history);
  expect(players.alice!.totals.drawn).toBe(12);
  expect(players.bob!.totals.drawn).toBe(6);
  expect(players.alice!.totals.resourced).toBe(2);
  expect(players.bob!.totals.resourced).toBe(2);
  expect(players.alice!.hasMulligan).toBe(true);
  expect(players.bob!.hasMulligan).toBe(false);
  expect(players.alice!.hasInitiative).toBe(true);
  expect(players.bob!.hasInitiative).toBe(false);
  expect(players.alice!.totals.actions).toBe(0);
});

test('nested free plays count separately as cards, once as an action, and disappear on agreed undo', () => {
  const p = position('statistics-nested');
  p.players[0].hand = [{ card: 'kelleran-beq--the-sabered-hand' }];
  p.players[0].resources = Array.from({ length: 12 }, () => ({ card: ids.marine }));
  p.players[0].deck![0] = { card: ids.trooper, ref: 'found' };
  const fixture = scenario(p);
  const game = historyFixture(p.gameId, fixture.state);
  game.choose('play');
  game.choose('search', [fixture.refs.found!]);
  game.choose('play');
  const completed = structuredClone(game.history);
  game.finish();
  const first = collectStatistics(game.history).players.alice!;
  expect(first.totals.played).toBe(2);
  expect(first.totals.actions).toBe(1);
  expect(first.cardMetrics[ids.trooper]?.played).toBe(1);
  const undo = historyFixture(
    'statistics-undo',
    scenario({ ...p, gameId: 'statistics-undo' }).state,
  );
  undo.choose('play');
  undo.choose('search', [fixture.refs.found!]);
  undo.choose('play');
  undo.undo(0);
  undo.choose('take-initiative');
  undo.finish();
  expect(collectStatistics(undo.history).players.alice!.totals.played).toBe(0);
  expect(collectStatistics(undo.history).players.alice!.totals.actions).toBe(1);
  expect(() => collectStatistics(completed)).toThrow('completed');
});

test('attacks, action abilities, and the round of an action are retained separately', () => {
  const p = position('statistics-actions');
  p.players[0].ground = [{ card: ids.marine, ref: 'attacker' }];
  const fixture = scenario(p),
    game = historyFixture(p.gameId, fixture.state);
  game.submit(choose(game.state, i => i.kind === 'attack' && i.attacker === fixture.refs.attacker));
  game.choose('pass');
  game.submit(choose(game.state, i => i.kind === 'use-ability' && i.abilityId !== 'deploy'));
  game.finish();
  const alice = collectStatistics(game.history).players.alice!;
  expect(alice.cardMetrics[ids.leader]?.activated).toBe(1);
  expect(alice.totals.attacks).toBe(1);
  expect(alice.totals.actions).toBe(2);
  expect(alice.roundMetrics['1']?.actions).toBe(2);
});

test('cancelled Exploit payment does not add a play or consume an action', () => {
  const p = position('statistics-cancel');
  p.players[0].space = [{ card: 'the-starhawk--prototype-battleship', ref: 'source' }];
  p.players[0].hand = [{ card: 'battle-droid-legion' }];
  p.players[0].resources = Array.from({ length: 5 }, () => ({ card: ids.marine }));
  const fixture = scenario(p),
    game = historyFixture(p.gameId, fixture.state);
  game.choose('play');
  game.choose('accept-effect', [fixture.refs.source!]);
  expect(game.state.facts.some(f => f.type === 'play-cancelled')).toBe(true);
  game.finish();
  const metrics = collectStatistics(game.history).players.alice!;
  expect(metrics.cardMetrics['battle-droid-legion']?.played ?? 0).toBe(0);
  expect(metrics.totals.actions).toBe(0);
});

test('forced opponent discard belongs to its owner, and the source is not counted as discarded', () => {
  const p = position('statistics-discard');
  p.players[0].resources = Array.from({ length: 12 }, () => ({ card: ids.marine }));
  p.players[0].hand = [{ card: 'hold-for-questioning' }];
  p.players[1].ground = [{ card: ids.marine }];
  p.players[1].hand = [{ card: ids.marine, ref: 'discarded' }];
  const fixture = scenario(p),
    game = historyFixture(p.gameId, fixture.state);
  game.choose('play');
  game.choose('target');
  game.choose('accept-effect', [fixture.refs.discarded!]);
  game.finish();
  const { players } = collectStatistics(game.history);
  expect(players.bob!.cardMetrics[ids.marine]?.discarded).toBe(1);
  expect(players.alice!.totals.discarded).toBe(0);
  expect(players.alice!.cardMetrics['hold-for-questioning']?.played).toBe(1);
});

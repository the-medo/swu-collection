import { expect, test } from 'bun:test';
import { rosterFixtures } from './roster-fixtures.ts';
import { decodeTrainingRoster } from '../../ai/full-game/training-roster.ts';
import { rosterEnvironment } from '../../ai/full-game/game.ts';
import { FullSession } from '../../ai/full-game/bridge.ts';

test('new leaders and multiple own lists have explicit private list routing and replayable games', () => {
  const roster = decodeTrainingRoster(rosterFixtures().eight);
  const env = rosterEnvironment(roster);
  expect(env.contract.decks.length).toBe(8);
  expect(env.contract.specialists.leaders.length).toBe(7);
  expect(env.contract.encoding.ownDeckKeys).toEqual(roster.decks.map(d => d.key));
  const session = new FullSession(false, env);
  expect(() => session.handle({ id: 1, op: 'reset', seed: 50, decks: [0, 8] })).toThrow(
    'Unknown training deck',
  );
  const result = session.handle({
    id: 2,
    op: 'reset',
    seed: 50,
    decks: [6, 7],
    autoForced: true,
  }) as {
    generation: number;
    observation: { context: number[]; seat: number };
  };
  const own = result.observation.seat === 0 ? 6 : 7;
  expect(result.observation.context.slice(-8)).toEqual(
    Array.from({ length: 8 }, (_, i) => Number(i === own)),
  );
  session.handle({ id: 3, op: 'truncate', generation: result.generation });
  expect(session.handle({ id: 4, op: 'replay', generation: result.generation })).toMatchObject({
    verified: true,
  });
});

test('rosters reject unsupported/corrupt snapshots, duplicate keys, empty archetypes and incorrect leaders', () => {
  const mutate = (edit: (r: ReturnType<typeof rosterFixtures>['eight']) => void) => {
    const roster = rosterFixtures().eight;
    edit(roster);
    expect(() => decodeTrainingRoster(roster)).toThrow();
  };
  mutate(r => {
    r.decks[7]!.strategies = [];
  });
  mutate(r => {
    r.decks[7]!.strategies = ['invented'];
  });
  mutate(r => {
    r.decks[7]!.key = r.decks[0]!.key;
  });
  mutate(r => {
    r.decks[7]!.leaderKey = 'dooku';
  });
  mutate(r => {
    r.decks[7]!.snapshot = { ...r.decks[7]!.snapshot, leader: 'missing-leader' };
  });
  mutate(r => {
    r.leaders[6]!.cardId = r.leaders[0]!.cardId;
  });
});

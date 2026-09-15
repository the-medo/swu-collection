import { expect, test } from 'bun:test';
import { advance } from '../engine/advance.ts';
import { decodeState } from '../engine/checkpoint.ts';
import { practiceCheckpoint } from '../history/practice.ts';
import { scenario } from './scenario.ts';
import { choose, ids } from './helpers.ts';
test('practice remaps a pending Exploit payment and its embedded cancellation checkpoint', () => {
  const { state } = scenario({
    gameId: 'source',
    activePlayer: 'p1',
    initiative: { holder: 'p1' },
    players: [
      {
        id: 'p1',
        base: { card: ids.base },
        leader: { card: 'count-dooku--face-of-the-confederacy' },
        hand: [{ card: 'hailfire-tank' }],
        resources: Array.from({ length: 6 }, () => ({ card: ids.marine })),
        ground: [{ card: 'battle-droid' }],
      },
      { id: 'p2', base: { card: ids.base }, leader: { card: ids.leader } },
    ],
  });
  const pending = advance(state, choose(state, 'play')).state;
  expect(pending.playPayment).not.toBeNull();
  const fork = decodeState(practiceCheckpoint(pending, 'practice'));
  expect(fork.gameId).toBe('practice');
  expect(fork.execution).toEqual(pending.execution);
  expect(JSON.parse(fork.playPayment!.rollback).gameId).toBe('practice');
  const cancelled = advance(fork, choose(fork, 'accept-effect', [])).state;
  expect(cancelled.gameId).toBe('practice');
  expect(cancelled.players).toEqual(state.players);
  expect(pending.gameId).toBe('source');
});

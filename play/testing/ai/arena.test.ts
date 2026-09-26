import { expect, test } from 'bun:test';
import { isDeepStrictEqual } from 'node:util';
import { advance } from '../../engine/advance.ts';
import { decodeState, encodeState } from '../../engine/checkpoint.ts';
import { Projector } from '../../projection/projector.ts';
import { PracticeArena, scriptedCommand } from '../../ai/arena.ts';
import { TacticalSession } from '../../ai/bridge.ts';
import { encodeChoices, featureFingerprint, puzzleFor, TacticalPuzzle } from '../../ai/tactics.ts';

test('seeded headless games complete through projected commands and replay exactly', () => {
  const games = [new PracticeArena(42), new PracticeArena(42)];
  const traces: string[][] = [];
  for (const game of games) {
    const trace: string[] = [];
    for (let count = 0; count < 1000; count++) {
      const observation = game.observe();
      if (!observation) break;
      const command = scriptedCommand(observation.view);
      const option = observation.view.decision!.options.find(o => o.id === command.optionId)!;
      trace.push(`${observation.playerId}:${option.kind}`);
      game.step(command);
      if (count === 0) expect(() => game.step(command)).toThrow();
    }
    expect(game.result).not.toBeNull();
    game.verifyReplay();
    traces.push(trace);
  }
  expect(traces[0]).toEqual(traces[1]);
  expect(games[0]!.result).toEqual(games[1]!.result);
});

test('each tactical position offers success and failure, with real engine outcomes', () => {
  const kinds = new Set<string>();
  const seats = new Set<string>();
  for (let seed = 0; seed < 32; seed++) {
    const puzzle = new TacticalPuzzle(seed);
    kinds.add(puzzle.kind);
    seats.add(puzzle.playerId);
    const outcomes = puzzle.options.map((option, action) => {
      const candidate = new TacticalPuzzle(seed);
      const before = encodeState(candidate.initial);
      const result = candidate.step(action);
      expect(encodeState(candidate.initial)).toBe(before);
      let replayed = decodeState(before);
      for (const input of result.inputs) replayed = advance(replayed, input).state;
      expect(isDeepStrictEqual(replayed, result.state)).toBe(true);
      expect(() => candidate.step(action)).toThrow('consumed');
      if (result.success) {
        const target = puzzle.view.cards.find(card => card.id === option.cards[1]);
        expect(target?.face?.kind).toBe(puzzle.kind === 'win-now' ? 'base' : 'unit');
        if (puzzle.kind === 'stop-lethal') {
          expect(result.gameOutcome).toBe('ongoing');
          expect(result.reward).toBe(0);
        } else {
          expect(result.gameOutcome).toBe('win');
          expect(result.reward).toBe(1);
        }
      }
      return result.success;
    });
    expect(outcomes).toContain(true);
    expect(outcomes).toContain(false);
  }
  expect(kinds.size).toBe(2);
  expect(seats.size).toBe(2);
});

test('policy features ignore hidden hands/deck order and projector-specific handles', () => {
  const puzzle = new TacticalPuzzle(6);
  const secret = structuredClone(puzzle.initial);
  const opponent = secret.seats.find(seat => seat !== puzzle.playerId)!;
  const player = secret.players[opponent]!;
  for (const id of [...player.hand, ...player.deck]) secret.cards[id]!.cardId = 'tie-ln-fighter';
  player.deck.reverse();
  secret.disclosure.handsToPlayers = true;
  const original = new Projector(secret.gameId, {
    role: 'player',
    playerId: puzzle.playerId,
    showRevealedHands: false,
  }).project(puzzle.initial);
  const changed = new Projector(secret.gameId, {
    role: 'player',
    playerId: puzzle.playerId,
    showRevealedHands: false,
  }).project(secret);
  expect(original.epoch).not.toBe(changed.epoch);
  expect(encodeChoices(original, puzzle.playerId)).toEqual(encodeChoices(changed, puzzle.playerId));
  expect(featureFingerprint(encodeChoices(original, puzzle.playerId))).toBe(puzzle.fingerprint);
  expect(featureFingerprint([...puzzle.features].reverse())).toBe(puzzle.fingerprint);
});

test('feature-equivalent puzzles cannot cross train/validation/test partitions', () => {
  const fingerprints = new Map<string, string>();
  for (const split of ['train', 'validation', 'test'] as const) {
    for (let index = 0; index < 12; index++) {
      const puzzle = puzzleFor(split, index);
      expect(puzzleFor(split, index).features).toEqual(puzzle.features);
      const previous = fingerprints.get(puzzle.fingerprint);
      if (previous) expect(previous).toBe(split);
      fingerprints.set(puzzle.fingerprint, split);
    }
  }
});

test('bridge rejects stale, invalid, duplicate and oversized requests without leaking full states', () => {
  const session = new TacticalSession();
  expect(() =>
    session.handle({ id: 1, op: 'reset', split: 'train', start: 0, batch: 257 }),
  ).toThrow();
  const first = session.handle({ id: 2, op: 'reset', split: 'train', start: 0, batch: 2 });
  expect('generation' in first).toBe(true);
  if (!('generation' in first)) throw new Error('Missing reset result');
  expect(() =>
    session.handle({ id: 3, op: 'step', generation: first.generation, actions: [99999, 0] }),
  ).toThrow();
  const result = session.handle({
    id: 4,
    op: 'step',
    generation: first.generation,
    actions: [0, 0],
  });
  expect(JSON.stringify(result)).not.toContain('inputs');
  expect(JSON.stringify(result)).not.toContain('state');
  expect(() =>
    session.handle({ id: 5, op: 'step', generation: first.generation, actions: [0, 0] }),
  ).toThrow();
  session.handle({ id: 6, op: 'reset', split: 'train', start: 1, batch: 2 });
  expect(() =>
    session.handle({ id: 7, op: 'step', generation: first.generation, actions: [0, 0] }),
  ).toThrow();
});

test('tactical encoder fails explicitly for unsupported intermediate choices', () => {
  const puzzle = new TacticalPuzzle(0);
  const view = structuredClone(puzzle.view);
  view.decision!.kind = 'search';
  expect(() => encodeChoices(view, puzzle.playerId)).toThrow('simple action');
});

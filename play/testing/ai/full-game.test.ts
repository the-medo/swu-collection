import { expect, test } from 'bun:test';
import { canComplete, CommandBuilder, selectionComplete } from '../../ai/full-game/choices.ts';
import { FullGame } from '../../ai/full-game/game.ts';
import { FullSession } from '../../ai/full-game/bridge.ts';
import { randomSource } from '../../ai/random.ts';
import { encodeCandidate, encodeContext, VisibleMemory } from '../../ai/full-game/encoding.ts';
import { Projector } from '../../projection/projector.ts';
import type { VisibleDecision } from '../../view/types.ts';

test('selection adapter keeps precisely the prefixes with legal constrained completions', () => {
  const contracts: NonNullable<VisibleDecision['selection']>[] = [
    { cards: ['a', 'b', 'c'], min: 2, max: 3, budget: { max: 5, costs: { a: 2, b: 2, c: 4 } } },
    {
      cards: ['a', 'b', 'c'],
      min: 1,
      max: 2,
      disclose: {
        required: ['Heroism', 'Heroism', 'Aggression'],
        icons: { a: ['Heroism', 'Aggression'], b: ['Heroism'], c: ['Villainy'] },
      },
    },
    { cards: ['a', 'b', 'c'], min: 0, max: 2 },
  ];
  for (const contract of contracts) {
    const subsets = Array.from({ length: 8 }, (_, mask) =>
      contract.cards.filter((_, i) => !!(mask & (1 << i))),
    );
    const valid = subsets.filter(s => selectionComplete(contract, s));
    for (const prefix of subsets) {
      expect(canComplete(contract, prefix)).toBe(
        valid.some(full => prefix.every(id => full.includes(id))),
      );
    }
  }
  const allocation = {
    cards: ['a', 'b'],
    min: 4,
    max: 6,
    allocation: { quantum: 2, limits: { a: 2, b: 4 } },
  };
  expect(canComplete(allocation, ['a', 'a'])).toBe(true);
  expect(canComplete(allocation, ['a'])).toBe(false);
  expect(canComplete(allocation, ['a', 'a', 'a', 'a'])).toBe(false);
  expect(selectionComplete(allocation, ['a', 'a', 'b', 'b'])).toBe(true);
});

test('exact Greef/Dedra lists complete legal projected reference games and replay in both orientations', () => {
  for (let orientation = 0; orientation < 2; orientation++) {
    const game = new FullGame(30 + orientation, orientation);
    let observation = game.observation();
    while (!observation.done) observation = game.reference(observation.ticket).observation;
    expect(observation.outcome).toBe('terminal');
    expect(observation.commands).toBeGreaterThan(20);
    expect(game.verifyReplay().verified).toBe(true);
  }
}, 120_000);

test('sampled legal micro-choices resolve real games without injecting heuristic selections', () => {
  for (let orientation = 0; orientation < 2; orientation++) {
    const game = new FullGame(54 + orientation, orientation);
    const random = randomSource(400 + orientation);
    let observation = game.observation();
    while (!observation.done)
      observation = game.step(observation.ticket, random(observation.candidates.length));
    expect(observation.outcome).toBe('terminal');
    expect(game.verifyReplay().verified).toBe(true);
  }
}, 120_000);

test('automatic forced choices preserve every strategic observation, memory and exact replay', () => {
  for (let orientation = 0; orientation < 2; orientation++) {
    const manual = new FullGame(30 + orientation, orientation);
    const automatic = new FullGame(30 + orientation, orientation, 1500, true);
    let a = manual.observation(),
      b = automatic.observation();
    let skipped = 0;
    while (!a.done) {
      if (a.candidates.length === 1) {
        a = manual.step(a.ticket, 0);
        skipped++;
        continue;
      }
      // Includes both seats' accumulated event memories and partial command
      // selections, but never opaque projector handles or hidden state.
      expect(b).toEqual(a);
      a = manual.reference(a.ticket).observation;
      if (b.done) throw new Error('Automatic game ended before the manual game');
      b = automatic.reference(b.ticket).observation;
    }
    expect(b).toEqual({ ...a, forcedChoices: skipped });
    expect(skipped).toBeGreaterThan(0);
    expect(automatic.game.recording).toEqual(manual.game.recording);
    expect(automatic.game.state).toEqual(manual.game.state);
    expect(automatic.verifyReplay().verified).toBe(true);
  }
}, 120_000);

test('automatic forced choices respect command limits and reject skipped tickets', () => {
  const game = new FullGame(30, 0, 3, true);
  let observation = game.observation();
  while (!observation.done) observation = game.reference(observation.ticket).observation;
  expect(observation).toMatchObject({ outcome: 'cutoff', reason: 'decision-limit', commands: 3 });
  expect(game.verifyReplay().verified).toBe(true);
  expect(() => game.step(0, 0)).toThrow('Stale');
});

test('incremental cached projections preserve observations, both memories and full replays', () => {
  for (let orientation = 0; orientation < 2; orientation++) {
    for (const sampled of [false, true]) {
      const original = new FullGame(54 + orientation, orientation, 1500, true, false);
      const optimized = new FullGame(54 + orientation, orientation, 1500, true);
      const random = randomSource(400 + orientation);
      let a = original.observation(),
        b = optimized.observation();
      while (!a.done) {
        expect(b).toEqual(a);
        for (let seat = 0; seat < 2; seat++) {
          expect(optimized.memories[seat]!.values).toEqual(original.memories[seat]!.values);
          expect(optimized.memories[seat]!.seen.size).toBe(original.memories[seat]!.seen.size);
        }
        if (b.done) throw new Error('Optimized game ended early');
        if (sampled) {
          const action = random(a.candidates.length);
          a = original.step(a.ticket, action);
          b = optimized.step(b.ticket, action);
        } else {
          const first = original.reference(a.ticket),
            second = optimized.reference(b.ticket);
          expect(first.index).toBe(second.index);
          a = first.observation;
          b = second.observation;
        }
      }
      expect(b).toEqual(a);
      expect(a.outcome).toBe('terminal');
      expect(optimized.game.recording).toEqual(original.game.recording);
      expect(optimized.game.state).toEqual(original.game.state);
      expect(optimized.verifyReplay().verified).toBe(true);
    }
  }
}, 120_000);

test('full-game features ignore concealed identities and viewer-specific handles', () => {
  const game = new FullGame(13, 0);
  while (game.game.state.phase === 'setup') game.reference(game.ticket);
  const original = game.game.state,
    modified = structuredClone(original);
  const self = original.execution.decision!.playerId;
  const other = game.seats.find(s => s !== self)!;
  for (const id of [
    ...modified.players[other]!.hand,
    ...modified.players[other]!.deck,
    ...modified.players[other]!.resources,
  ]) {
    const c = modified.cards[id]!;
    if (c.cardId !== 'credit') c.cardId = 'battlefield-marine';
  }
  const project = (state: typeof original) =>
    new Projector(state.gameId, { role: 'player', playerId: self }).project(state);
  const a = project(original),
    b = project(modified);
  const am = new VisibleMemory(),
    bm = new VisibleMemory();
  am.observe(a, self);
  bm.observe(b, self);
  const ab = new CommandBuilder(a),
    bb = new CommandBuilder(b);
  expect(encodeContext(a, self, game.deckIndices[game.seat]!, am, ab)).toEqual(
    encodeContext(b, self, game.deckIndices[game.seat]!, bm, bb),
  );
  expect(ab.choices().map(c => encodeCandidate(ab, c, self))).toEqual(
    bb.choices().map(c => encodeCandidate(bb, c, self)),
  );
});

test('protocol rejects stale and repeated choices; interrupted games remain cutoffs', () => {
  const session = new FullSession();
  session.handle({ id: 1, op: 'reset', seed: 3, orientation: 0, limit: 1 });
  expect(() => session.handle({ id: 2, op: 'step', generation: 0, ticket: 0, action: 0 })).toThrow(
    'Stale',
  );
  session.handle({ id: 3, op: 'step', generation: 1, ticket: 0, action: 0 });
  expect(() =>
    session.handle({ id: 4, op: 'step', generation: 1, ticket: 0, action: 0 }),
  ).toThrow();
  expect(session.game!.observation()).toMatchObject({
    done: true,
    outcome: 'cutoff',
    winner: null,
  });
  session.handle({ id: 5, op: 'reset', seed: 4, orientation: 1 });
  expect(session.handle({ id: 6, op: 'truncate', generation: 2 })).toMatchObject({
    observation: { done: true, outcome: 'cutoff', reason: 'run-budget' },
  });
});

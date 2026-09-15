import { describe, expect, test } from 'bun:test';
import { advance, createGame } from '../engine/advance.ts';
import { aspectPenalty, instance, move, playCost } from '../engine/state.ts';
import { decodeState, encodeState } from '../engine/checkpoint.ts';
import { IllegalInput } from '../engine/model.ts';
import { LocalGame, replay } from '../host/session.ts';
import { scenario } from './scenario.ts';
import { choose, config, ids, position, setup } from './helpers.ts';

describe('v8 §5.2 setup and explicit randomness', () => {
  test('random player chooses initiative, before shuffling and drawing', () => {
    let state = createGame(config());
    expect(state.execution.decision).toBeNull();
    expect(state.execution.random?.bounds).toEqual([2]);
    const before = encodeState(state);
    const input = {
      type: 'random',
      gameId: state.gameId,
      expectedRevision: 0,
      requestId: state.execution.random!.id,
      values: [1],
    };
    expect(() => advance(state, { ...input, values: [2] })).toThrow(IllegalInput);
    expect(encodeState(state)).toBe(before);
    state = advance(state, input).state;
    expect(state.execution.decision?.playerId).toBe('bob');
    expect(state.players.bob!.hand).toHaveLength(0);
    state = advance(
      state,
      choose(state, i => i.kind === 'initiative' && i.playerId === 'alice'),
    ).state;
    expect(state.initiative.holder).toBe('alice');
    expect(state.execution.random?.bounds).toEqual(Array.from({ length: 23 }, (_, i) => 24 - i));
  });

  test('one whole-hand mulligan, then exactly two ready resources per player', () => {
    const game = new LocalGame(config(), upper => upper - 1);
    let state = game.submit(
      choose(game.state, i => i.kind === 'initiative' && i.playerId === 'bob'),
    );
    expect(state.execution.decision?.playerId).toBe('bob');
    const originalHand = [...state.players.bob!.hand];
    state = game.submit(choose(state, i => i.kind === 'mulligan' && i.take));
    expect(state.execution.decision?.playerId).toBe('alice');
    expect(state.players.bob!.hand).toHaveLength(6);
    expect(state.players.bob!.hand).not.toEqual(originalHand);
    expect(originalHand.every(id => state.players.bob!.deck.includes(id))).toBe(true);
    state = game.submit(choose(state, i => i.kind === 'mulligan' && !i.take));
    const selected = state.execution.decision!.selection!.cards.slice(0, 2);
    const before = game.state;
    expect(() => game.submit(choose(state, 'resource', selected.slice(0, 1)))).toThrow();
    expect(() => game.submit(choose(state, 'resource', [selected[0]!, selected[0]!]))).toThrow();
    expect(game.state).toEqual(before);
    state = game.submit(choose(state, 'resource', selected));
    state = game.submit(
      choose(state, 'resource', state.execution.decision!.selection!.cards.slice(0, 2)),
    );
    expect(state.round).toBe(1);
    expect(state.activePlayer).toBe('bob');
    for (const player of Object.values(state.players)) {
      expect(player.hand).toHaveLength(4);
      expect(player.resources).toHaveLength(2);
      expect(player.resources.every(id => !instance(state, id).exhausted)).toBe(true);
    }
  });

  test('rejects unknown cards, nonunit deck roles, invalid player IDs and deck sizes', () => {
    const input = config();
    input.players[0].deck[0]!.cardId = 'not-a-card';
    expect(() => createGame(input)).toThrow('Unsupported');
    input.players[0].deck = [{ cardId: ids.base, quantity: 6 }];
    expect(() => createGame(input)).toThrow();
    input.players[0].deck = [{ cardId: ids.marine, quantity: 5 }];
    expect(() => createGame(input)).toThrow();
    input.players[0].id = 'constructor';
    expect(() => createGame(input)).toThrow();
    expect(() => new LocalGame(config(), () => -1)).toThrow();
  });
});

describe('v8 §§1.6, 1.8, 3.5: costs and unit entry', () => {
  test('pays aspect-adjusted cost atomically and exhausts only the selected copy', () => {
    const input = position();
    input.players[0].hand = [
      { card: ids.marine, ref: 'first' },
      { card: ids.marine, ref: 'second' },
      { card: ids.trooper, ref: 'villain' },
    ];
    input.players[0].resources = Array.from({ length: 2 }, () => ({ card: ids.fighter }));
    const { state, refs } = scenario(input),
      before = encodeState(state);
    expect(playCost(state, instance(state, refs.first!))).toBe(2);
    expect(playCost(state, instance(state, refs.villain!))).toBe(3);
    expect(
      state.execution.decision!.options.some(
        o => o.intent.kind === 'play' && o.intent.card === refs.villain,
      ),
    ).toBe(false);
    const next = advance(
      state,
      choose(state, i => i.kind === 'play' && i.card === refs.second),
    ).state;
    expect(encodeState(state)).toBe(before);
    expect(instance(next, refs.second!).zone).toBe('ground');
    expect(instance(next, refs.second!).exhausted).toBe(true);
    expect(instance(next, refs.second!).incarnation).toBe(1);
    expect(instance(next, refs.first!).zone).toBe('hand');
    expect(next.players.alice!.resources.every(id => instance(next, id).exhausted)).toBe(true);
    expect(next.activePlayer).toBe('bob');
    expect(next.facts.find(e => e.type === 'played')?.cards[0]?.instanceId).toBe(refs.second);
  });
  test('counts each missing repeated aspect icon separately', () => {
    expect(aspectPenalty(['Aggression', 'Aggression', 'Villainy'], ['Aggression', 'Heroism'])).toBe(
      4,
    );
    expect(
      aspectPenalty(['Aggression', 'Aggression'], ['Aggression', 'Aggression', 'Heroism']),
    ).toBe(0);
  });
  test('forged, out-of-seat, stale and cross-game commands leave state unchanged', () => {
    const { state } = scenario(position());
    const before = encodeState(state),
      pass = choose(state, 'pass');
    for (const invalid of [
      { ...pass, playerId: 'bob' },
      { ...pass, gameId: 'another-game' },
      { ...pass, expectedRevision: 9 },
      { ...pass, optionId: 'fake' },
      { ...pass, hp: 0 },
    ]) {
      expect(() => advance(state, invalid)).toThrow(IllegalInput);
      expect(encodeState(state)).toBe(before);
    }
    const next = advance(state, pass).state;
    expect(() => advance(next, pass)).toThrow(IllegalInput);
  });
});

describe('v8 §6.3: legal attacks and simultaneous combat', () => {
  test('same-arena enemies and enemy base are legal; friendly/cross-arena/exhausted are not', () => {
    const input = position();
    input.players[0].ground = [
      { card: ids.marine, ref: 'a' },
      { card: ids.marine, ref: 'exhausted', exhausted: true },
    ];
    input.players[1].ground = [{ card: ids.marine, ref: 'b' }];
    input.players[1].space = [{ card: ids.fighter, ref: 'space' }];
    const { state, refs } = scenario(input);
    const attacks = state.execution.decision!.options.flatMap(o =>
      o.intent.kind === 'attack' ? [o.intent] : [],
    );
    expect(attacks).toHaveLength(2);
    expect(attacks.every(a => a.attacker === refs.a)).toBe(true);
    expect(attacks.map(a => a.defender)).toEqual([state.players.bob!.base, refs.b!]);
  });
  test('both marines deal damage before simultaneous defeat; damage names its actual source', () => {
    const input = position();
    input.players[0].ground = [{ card: ids.marine, ref: 'a' }];
    input.players[1].ground = [{ card: ids.marine, ref: 'b' }];
    const { state, refs } = scenario(input);
    const next = advance(
      state,
      choose(state, i => i.kind === 'attack' && i.defender === refs.b),
    ).state;
    expect(next.ground).toEqual([]);
    expect(next.players.alice!.discard).toContain(refs.a!);
    expect(next.players.bob!.discard).toContain(refs.b!);
    expect(
      next.facts
        .filter(e => e.type === 'damage')
        .map(e => [e.actor, e.cards.map(c => c.instanceId), e.amount]),
    ).toEqual([
      ['alice', [refs.a!, refs.b!], 3],
      ['bob', [refs.b!, refs.a!], 3],
    ]);
    expect(next.facts.findIndex(e => e.type === 'defeated')).toBeGreaterThan(
      next.facts.findLastIndex(e => e.type === 'damage'),
    );
  });
  test('bases do not strike back and lethal damage ends immediately', () => {
    const input = position();
    input.players[0].ground = [{ card: ids.marine, ref: 'a' }];
    input.players[1].base.damage = 28;
    const { state, refs } = scenario(input);
    const next = advance(
      state,
      choose(state, i => i.kind === 'attack' && i.defender === state.players.bob!.base),
    ).state;
    expect(instance(next, refs.a!).damage).toBe(0);
    expect(instance(next, refs.a!).exhausted).toBe(true);
    expect(next.result).toEqual({ winner: 'alice', reason: 'base-defeat' });
    expect(next.execution.frames).toEqual([]);
    expect(next.execution.decision).toBeNull();
  });
});

describe('v8 §§1.4.5, 1.15, 5.4–5.5: passing, initiative and regroup', () => {
  test('passing is reversible until consecutive passes; claiming initiative counts as a pass', () => {
    let state = scenario(position()).state;
    state = advance(state, choose(state, 'pass')).state;
    state = advance(
      state,
      choose(state, i => i.kind === 'use-ability' && i.abilityId === 'damage-bases'),
    ).state;
    expect(state.activePlayer).toBe('alice');
    expect(state.consecutivePasses).toBe(0);
    state = advance(state, choose(state, 'take-initiative')).state;
    state = advance(state, choose(state, 'pass')).state;
    expect(state.phase).toBe('regroup');
    expect(state.execution.decision?.playerId).toBe('alice');
    expect(state.execution.decision?.kind).toBe('resource');
  });
  test('claimant automatically passes; regroup resources in initiative order, then readies', () => {
    const input = position();
    input.players[0].ground = [{ card: ids.marine, ref: 'a' }];
    let { state, refs } = scenario(input);
    state = advance(state, choose(state, 'pass')).state;
    // Opponent performs an action before claiming, so this does not end the phase.
    state = advance(
      state,
      choose(state, i => i.kind === 'use-ability' && i.abilityId === 'damage-bases'),
    ).state;
    state = advance(
      state,
      choose(state, i => i.kind === 'use-ability' && i.abilityId === 'damage-bases'),
    ).state;
    state = advance(state, choose(state, 'take-initiative')).state;
    state = advance(
      state,
      choose(state, i => i.kind === 'attack'),
    ).state;
    expect(state.activePlayer).toBe('alice');
    expect(state.initiative).toEqual({ holder: 'bob', claimed: true });
    state = advance(state, choose(state, 'pass')).state;
    expect(state.execution.decision?.playerId).toBe('bob');
    const chosen = state.players.bob!.hand[0]!;
    state = advance(state, choose(state, 'resource', [chosen])).state;
    expect(instance(state, chosen).exhausted).toBe(true);
    expect(state.execution.decision?.playerId).toBe('alice');
    state = advance(state, choose(state, 'resource')).state;
    expect(state.round).toBe(2);
    expect(state.activePlayer).toBe('bob');
    expect(state.initiative.claimed).toBe(false);
    expect(instance(state, refs.a!).exhausted).toBe(false);
    expect(instance(state, chosen).exhausted).toBe(false);
  });
  test('v8 §8.6: empty decks cause three damage per missing draw, not instant loss', () => {
    const input = position();
    input.players[0].deck = [];
    input.players[1].deck = [{ card: ids.marine }];
    let state = scenario(input).state;
    state = advance(state, choose(state, 'pass')).state;
    state = advance(state, choose(state, 'pass')).state;
    expect(instance(state, state.players.alice!.base).damage).toBe(6);
    expect(instance(state, state.players.bob!.base).damage).toBe(3);
    expect(state.phase).toBe('regroup');
  });
});

describe('Sabine Wren SOR 014; v8 §§3.4, 5.6, 6.3', () => {
  test('simultaneously damaging both bases can draw the game', () => {
    const input = position();
    input.players[0].base.damage = 29;
    input.players[1].base.damage = 29;
    const state = scenario(input).state;
    const next = advance(
      state,
      choose(state, i => i.kind === 'use-ability' && i.abilityId === 'damage-bases'),
    ).state;
    expect(next.result).toEqual({ winner: null, reason: 'base-defeat' });
  });
  test('deploys exhausted leader ready without paying resources; defeated leader retains Epic usage', () => {
    const input = position();
    input.players[0].leader.exhausted = true;
    input.players[0].resources = Array.from({ length: 4 }, () => ({
      card: ids.marine,
      exhausted: true,
    }));
    input.players[1].ground = [{ card: ids.marine, ref: 'enemy' }];
    let { state, refs } = scenario(input);
    const leaderId = state.players.alice!.leader;
    state = advance(
      state,
      choose(state, i => i.kind === 'use-ability' && i.abilityId === 'deploy'),
    ).state;
    expect(instance(state, leaderId)).toMatchObject({
      deployedAs: 'unit',
      abilityUses: { deploy: 1 },
      exhausted: false,
      incarnation: 2,
    });
    expect(state.players.alice!.resources.every(id => instance(state, id).exhausted)).toBe(true);
    state = advance(
      state,
      choose(state, i => i.kind === 'attack' && i.defender === leaderId),
    ).state;
    state = advance(
      state,
      choose(state, i => i.kind === 'attack' && i.defender === refs.enemy),
    ).state;
    expect(instance(state, leaderId)).toMatchObject({
      deployedAs: null,
      abilityUses: { deploy: 1 },
      exhausted: true,
      zone: 'base',
      damage: 0,
      incarnation: 3,
    });
    state = advance(state, choose(state, 'pass')).state;
    expect(
      state.execution.decision!.options.some(
        o => o.intent.kind === 'use-ability' && o.intent.abilityId === 'deploy',
      ),
    ).toBe(false);
    expect(instance(state, state.players.bob!.base).damage).toBe(1);
  });
  test('On Attack can end the game before combat damage', () => {
    const input = position();
    input.players[0].leader.deployedAs = 'unit';
    input.players[1].base.damage = 29;
    const state = scenario(input).state;
    const next = advance(
      state,
      choose(state, i => i.kind === 'attack'),
    ).state;
    expect(instance(next, next.players.bob!.base).damage).toBe(30);
    expect(next.facts.filter(e => e.type === 'damage')).toHaveLength(1);
  });
  test('either player can concede even during an opponent decision or random suspension', () => {
    for (const state of [createGame(config()), scenario(position()).state]) {
      const next = advance(state, {
        type: 'concede',
        gameId: state.gameId,
        expectedRevision: state.revision,
        playerId: 'bob',
      }).state;
      expect(next.result).toEqual({ winner: 'alice', reason: 'concession' });
    }
  });
});

describe('scenario, serialization, and independent games', () => {
  test('v8 §§8.5, 8.36: arena movement preserves a copy; leaving and re-entering creates a new one', () => {
    const input = position();
    input.players[0].ground = [{ card: ids.marine, ref: 'marine' }];
    const { state, refs } = scenario(input),
      card = instance(state, refs.marine!);
    const originalIncarnation = card.incarnation;
    move(state, card, 'space');
    expect(card.incarnation).toBe(originalIncarnation);
    expect(state.ground).not.toContain(card.instanceId);
    expect(state.space).toContain(card.instanceId);
    move(state, card, 'hand');
    move(state, card, 'ground');
    expect(card.incarnation).toBe(originalIncarnation + 1);
    expect(state.space).not.toContain(card.instanceId);
  });
  test('rejects duplicate aliases, incorrect arenas, invalid hidden-zone damage and unknown versions', () => {
    const input = position();
    input.players[0].ground = [
      { card: ids.marine, ref: 'same' },
      { card: ids.marine, ref: 'same' },
    ];
    expect(() => scenario(input)).toThrow('Duplicate');
    input.players[0].ground = [{ card: ids.fighter }];
    expect(() => scenario(input)).toThrow('arena');
    input.players[0].ground = [];
    input.players[0].hand = [{ card: ids.marine, damage: 1 }];
    expect(() => scenario(input)).toThrow();
    const state = scenario(position()).state;
    expect(() =>
      decodeState(JSON.stringify({ ...state, versions: { ...state.versions, engine: 'future' } })),
    ).toThrow();
  });
  test('pending choices round-trip and produce the same next transition', () => {
    const game = new LocalGame(config(), () => 0);
    const state = game.state,
      copy = decodeState(encodeState(state)),
      input = choose(state, 'initiative');
    expect(advance(copy, input)).toEqual(advance(state, input));
    expect(replay(game.recording)).toEqual(state);
  });
  test('checkpoint codec rejects corrupted zone membership, choices and random bounds', () => {
    const state = scenario(position()).state;
    const duplicate = structuredClone(state);
    duplicate.players.alice!.hand.push(duplicate.players.alice!.deck[0]!);
    expect(() => decodeState(encodeState(duplicate))).toThrow('membership');
    const choices = structuredClone(state);
    choices.execution.decision!.options = [];
    expect(() => decodeState(encodeState(choices))).toThrow('choices');
    const missing = structuredClone(state);
    missing.execution = { frames: [], pendingTriggers: [], decision: null, random: null };
    expect(() => decodeState(encodeState(missing))).toThrow('suspension');
    const random = createGame(config());
    random.execution.random!.bounds = [9];
    expect(() => decodeState(encodeState(random))).toThrow('bounds');
  });
  test('host randomness failure leaves both accepted state and recording unchanged', () => {
    let fail = false;
    const game = new LocalGame(config(), upper => {
      if (fail) throw new Error('Random source failed');
      return upper - 1;
    });
    const state = game.state,
      recording = game.recording;
    fail = true;
    expect(() => game.submit(choose(state, 'initiative'))).toThrow('Random source failed');
    expect(game.state).toEqual(state);
    expect(game.recording).toEqual(recording);
    expect(() =>
      game.submit({
        type: 'random',
        gameId: state.gameId,
        expectedRevision: state.revision,
        requestId: 'r1',
        values: [0],
      }),
    ).toThrow('host-only');
  });
  test('games using the same physical ID strings share no state or random stream', () => {
    const a = new LocalGame(config('first-game'), () => 0),
      b = new LocalGame(config('second-game'), upper => upper - 1);
    const before = b.state;
    setup(a, true);
    expect(b.state).toEqual(before);
    const exposed = a.state;
    exposed.players.alice!.hand.length = 0;
    expect(a.state.players.alice!.hand).toHaveLength(4);
    expect(() => b.submit(choose(a.state, 'pass'))).toThrow();
  });
});

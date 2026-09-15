import { expect, test } from 'bun:test';
import { advance, settle } from '../engine/advance.ts';
import { cardDefinition } from '../cards/registry.ts';
import { attachedUpgrades, unitStats } from '../engine/attachments.ts';
import { effectiveAbilities } from '../engine/effective-abilities.ts';
import { modifyUnit } from '../engine/lasting.ts';
import { decodeState, encodeState } from '../engine/checkpoint.ts';
import { choose, ids, position } from './helpers.ts';
import { scenario } from './scenario.ts';
import type { GameState, Intent } from '../engine/model.ts';
function step(
  s: GameState,
  p: Intent['kind'] | ((i: Intent) => boolean),
  selected: string[] = [],
): GameState {
  s = advance(s, choose(s, p, selected)).state;
  while (s.execution.decision?.kind === 'trigger') s = advance(s, choose(s, 'trigger')).state;
  return s;
}
const target = (s: GameState, id: string) => step(s, i => i.kind === 'target' && i.card === id);
const play = (s: GameState, id: string) => step(s, i => i.kind === 'play' && i.card === id);
const attack = (s: GameState, a: string, d: string) =>
  step(s, i => i.kind === 'attack' && i.attacker === a && i.defender === d);
function board(card: string, inPlay = false) {
  const p = position();
  p.players[0].resources = Array.from({ length: 20 }, () => ({ card: ids.marine }));
  const d = cardDefinition(card);
  if (inPlay && d.kind === 'unit') p.players[0][d.arena] = [{ card, ref: 'source' }];
  else p.players[0].hand = [{ card, ref: 'source' }];
  return p;
}
const tokens = (s: GameState, id: string) =>
  attachedUpgrades(s, s.cards[id]!).filter(c => c.cardId === 'experience').length;
test('Darth Sion counts enemy defeated units and returns only after departing with at least seven power', () => {
  const p = board('darth-sion--lord-of-pain');
  p.players[0].discard = [{ card: ids.marine, ref: 'own' }];
  p.players[1].discard = [
    { card: ids.marine, ref: 'a' },
    { card: ids.marine, ref: 'b' },
  ];
  p.defeatedThisPhase = ['own', 'a', 'b'];
  const g = scenario(p);
  expect(tokens(play(g.state, g.refs.source!), g.refs.source!)).toBe(2);
  for (const high of [false, true]) {
    const q = board('darth-sion--lord-of-pain', true);
    q.players[0].ground![0]!.damage = 4;
    q.activePlayer = 'bob';
    q.players[1].ground = [{ card: ids.consular, ref: 'killer' }];
    const { state, refs } = scenario(q);
    if (high)
      modifyUnit(state, state.cards[refs.source!]!, state.cards[refs.source!]!, {
        kind: 'modify',
        power: 2,
        hp: 0,
        duration: 'phase',
      });
    state.execution.decision = null;
    settle(state);
    const s = attack(state, refs.killer!, refs.source!);
    expect(s.cards[refs.source!]!.zone).toBe(high ? 'hand' : 'discard');
  }
});
test('Libertine gains power per prisoner and can make an enemy capture its own friendly unit', () => {
  const p = board('libertine--under-new-ownership');
  p.players[0].ground = [{ card: ids.marine, ref: 'friendly' }];
  p.players[1].space = [{ card: ids.fighter, ref: 'guard' }];
  const { state, refs } = scenario(p);
  let s = target(play(state, refs.source!), refs.guard!);
  s = target(s, refs.friendly!);
  expect(s.cards[refs.friendly!]!.capturedBy?.instanceId).toBe(refs.guard!);
  const q = board('libertine--under-new-ownership', true);
  q.captured = [
    { card: ids.marine, owner: 'bob', guard: 'source' },
    { card: ids.marine, owner: 'alice', guard: 'source' },
  ];
  const g = scenario(q);
  expect(unitStats(g.state, g.state.cards[g.refs.source!]!).power).toBe(5);
});
test('Implicate grants the defending unit its own Spy trigger through the phase', () => {
  const p = board('implicate');
  p.players[0].ground = [{ card: ids.consular, ref: 'ally' }];
  p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
  const { state, refs } = scenario(p);
  let s = target(play(state, refs.source!), refs.ally!);
  expect(effectiveAbilities(s, s.cards[refs.ally!]!).keywords).toContain('Sentinel');
  s = attack(s, refs.enemy!, refs.ally!);
  expect(
    s.ground.filter(id => s.cards[id]!.cardId === 'spy' && s.cards[id]!.controller === 'alice'),
  ).toHaveLength(1);
});
test('Oppression records a friendly defeat during its attack, not just an earlier attack', () => {
  for (const attacking of [false, true]) {
    const p = board('oppression-breeds-rebellion');
    p.players[0].ground = [{ card: ids.trooper, ref: 'ally' }];
    p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
    if (!attacking) p.activePlayer = 'bob';
    const { state, refs } = scenario(p);
    let s = attacking
      ? attack(state, refs.ally!, refs.enemy!)
      : attack(state, refs.enemy!, refs.ally!);
    if (attacking) s = step(s, 'pass');
    expect(s.phaseHistory.defeatedAttacking).toHaveLength(attacking ? 1 : 0);
    s = play(s, refs.source!);
    expect(s.players.alice!.hand).toHaveLength(attacking ? 3 : 0);
  }
});
test('Populist Advisor reacts to enemy combat damage, not a leader ability damaging its base', () => {
  for (const combat of [false, true]) {
    const p = board('populist-advisor', true);
    p.activePlayer = 'bob';
    p.players[1].ground = [{ card: ids.marine, ref: 'enemy' }];
    const { state, refs } = scenario(p);
    const s = combat
      ? attack(state, refs.enemy!, state.players.alice!.base)
      : step(state, i => i.kind === 'use-ability' && i.card === state.players.bob!.leader);
    expect(
      effectiveAbilities(s, s.cards[refs.source!]!).keywords?.includes('Sentinel') ?? false,
    ).toBe(combat);
  }
});
test('Elite Squad reacts even to lethal friendly ability damage, without requiring its source to survive', () => {
  for (const lethal of [false, true]) {
    const p = board('death-trooper');
    p.players[0].ground = [
      { card: 'the-elite-squad--neutralizing-insurgents', ref: 'elite', damage: lethal ? 6 : 0 },
    ];
    p.players[1].ground = [{ card: 'darth-sion--lord-of-pain', ref: 'enemy' }];
    const { state, refs } = scenario(p);
    let s = target(play(state, refs.source!), refs.elite!);
    s = target(s, refs.enemy!);
    s = target(s, refs.enemy!);
    expect(s.cards[refs.enemy!]!.damage).toBe(4);
    expect(s.cards[refs.elite!]!.zone).toBe(lethal ? 'discard' : 'ground');
  }
});
test('Fully Armed checks the opponent’s previous action and gives its nested unit Ambush', () => {
  for (const previous of [true, false]) {
    const p = board('fully-armed-and-operational');
    p.activePlayer = 'bob';
    p.players[0].hand!.push({ card: ids.consular, ref: 'unit' });
    p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
    const { state, refs } = scenario(p);
    let s = attack(state, refs.enemy!, state.players.alice!.base);
    if (!previous) {
      s = step(s, 'pass');
      s = step(s, i => i.kind === 'use-ability' && i.card === s.players.bob!.leader);
    }
    s = play(s, refs.source!);
    if (previous) {
      s = play(s, refs.unit!);
      s = target(s, refs.enemy!);
      expect(s.cards[refs.enemy!]!.damage).toBe(3);
      expect(s.cards[refs.unit!]!.exhausted).toBe(true);
    } else expect(s.cards[refs.unit!]!.zone).toBe('hand');
  }
});
test('One in a Million cannot be played from hand and checks ready resources after its Plot payment', () => {
  const p = board('one-in-a-million');
  p.players[0].ground = [{ card: ids.marine, ref: 'unit' }];
  const g = scenario(p);
  expect(
    g.state.execution.decision!.options.some(
      o => o.intent.kind === 'play' && o.intent.card === g.refs.source,
    ),
  ).toBe(false);
  const q = position();
  q.players[0].resources = [
    ...Array.from({ length: 6 }, () => ({ card: ids.marine })),
    { card: 'one-in-a-million', ref: 'event' },
  ];
  q.players[0].ground = [
    { card: ids.marine, ref: 'equal' },
    { card: ids.consular, ref: 'wrongHp' },
  ];
  q.players[0].credits = ['credit'];
  const { state, refs } = scenario(q);
  let s = step(state, i => i.kind === 'use-ability' && i.abilityId === 'deploy');
  s = step(s, 'accept-effect', [refs.event!]);
  // Keep the source ready while paying three other resources (including the
  // aspect penalty); its exhausted replacement leaves exactly three ready.
  s = step(
    s,
    i => i.kind === 'play' && i.card === refs.event && i.plotPayment === 'other-resources',
  );
  s = step(s, 'accept-effect', []);
  expect(s.execution.decision!.options.map(o => o.intent)).toEqual([
    { kind: 'target', card: refs.equal! },
  ]);
  s = target(s, refs.equal!);
  expect(s.cards[refs.equal!]!.zone).toBe('discard');
  expect(s.cards[refs.wrongHp!]!.zone).toBe('ground');
  expect(s.cards[refs.credit!]!.zone).toBe('resources');
});
test('Willrow protects exactly one friendly upgrade from enemy defeat and return, but not host departure', () => {
  for (const card of ['outer-rim-constable', 'junior-senator'])
    for (const count of [1, 2]) {
      const p = position();
      p.activePlayer = 'bob';
      p.players[0].ground = [{ card: 'willrow-hood--on-the-run', ref: 'host' }];
      p.players[1].hand = [{ card, ref: 'effect' }];
      p.players[1].resources = Array.from({ length: 10 }, () => ({ card: ids.marine }));
      p.attachments = [
        { card: 'academy-training', unit: 'host', ref: 'upgrade' },
        ...(count === 2 ? [{ card: 'experience', unit: 'host', ref: 'second' }] : []),
      ];
      const { state, refs } = scenario(p);
      let s = play(state, refs.effect!);
      s =
        card === 'outer-rim-constable'
          ? target(s, refs.upgrade!)
          : step(s, 'accept-effect', [refs.upgrade!]);
      expect(s.cards[refs.upgrade!]!.zone).toBe(
        count === 1 ? 'ground' : card === 'outer-rim-constable' ? 'discard' : 'hand',
      );
    }
  const p = position();
  p.activePlayer = 'bob';
  p.players[0].ground = [{ card: 'willrow-hood--on-the-run', ref: 'host' }];
  p.players[1].hand = [{ card: 'beguile', ref: 'event' }];
  p.players[1].resources = Array.from({ length: 10 }, () => ({ card: ids.marine }));
  p.attachments = [{ card: 'academy-training', unit: 'host', ref: 'upgrade' }];
  const { state, refs } = scenario(p);
  const s = target(step(play(state, refs.event!), 'accept-effect'), refs.host!);
  expect(s.cards[refs.host!]!.zone).toBe('hand');
  expect(s.cards[refs.upgrade!]!.zone).toBe('discard');
});
test('Willrow’s protection disappears if he loses his abilities and never protects an enemy-owned upgrade', () => {
  for (const blank of [false, true]) {
    const p = position();
    p.activePlayer = 'bob';
    p.players[0].ground = [{ card: 'willrow-hood--on-the-run', ref: 'host' }];
    p.players[1].hand = [{ card: 'outer-rim-constable', ref: 'event' }];
    p.players[1].resources = [{ card: ids.marine }, { card: ids.marine }];
    p.attachments = [
      { card: 'academy-training', unit: 'host', ref: 'upgrade', owner: blank ? 'alice' : 'bob' },
    ];
    const { state, refs } = scenario(p);
    if (blank)
      modifyUnit(state, state.cards[refs.host!]!, state.cards[refs.host!]!, {
        kind: 'modify',
        power: 0,
        hp: 0,
        duration: 'phase',
        loseAbilities: true,
      });
    state.execution.decision = null;
    settle(state);
    const s = target(play(state, refs.event!), refs.upgrade!);
    expect(s.cards[refs.upgrade!]!.zone).toBe('discard');
  }
});
test('Willrow protection is evaluated before simultaneous upgrade removal', () => {
  const p = position();
  p.activePlayer = 'bob';
  p.players[0].ground = [{ card: 'willrow-hood--on-the-run', ref: 'host' }];
  p.players[1].hand = [{ card: 'kaydel-connix--for-our-survival', ref: 'effect' }];
  p.players[1].resources = Array.from({ length: 10 }, () => ({ card: ids.marine }));
  p.attachments = [
    { card: 'experience', unit: 'host', ref: 'a' },
    { card: 'experience', unit: 'host', ref: 'b' },
  ];
  const { state, refs } = scenario(p);
  const s = target(play(state, refs.effect!), refs.host!);
  expect(s.cards[refs.a!]!.zone).toBe('set-aside');
  expect(s.cards[refs.b!]!.zone).toBe('set-aside');
});
test('Willrow’s single Shield survives enemy Saboteur but is still spent preventing combat damage', () => {
  const p = position();
  p.activePlayer = 'bob';
  p.players[0].ground = [{ card: 'willrow-hood--on-the-run', ref: 'host' }];
  p.players[1].ground = [{ card: 'rebel-pathfinder', ref: 'attacker' }];
  p.attachments = [{ card: 'shield', unit: 'host', ref: 'shield' }];
  const { state, refs } = scenario(p);
  const s = attack(state, refs.attacker!, refs.host!);
  expect(s.cards[refs.host!]!.damage).toBe(0);
  expect(s.cards[refs.shield!]!.zone).toBe('set-aside');
});
test('checkpoints reject an invented previous-action player and a defeat absent from the phase history', () => {
  const g = scenario(board('oppression-breeds-rebellion'));
  const bad = structuredClone(g.state);
  bad.phaseHistory.lastActions.stranger = { basesAttacked: ['alice'] };
  expect(() => decodeState(encodeState(bad))).toThrow('Invalid previous action history');
  const another = structuredClone(g.state);
  another.phaseHistory.defeatedAttacking.push(another.cards[another.players.alice!.leader]!);
  expect(() => decodeState(encodeState(another))).toThrow('Invalid attacking defeat history');
});

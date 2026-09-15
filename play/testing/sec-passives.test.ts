import { expect, test } from 'bun:test';
import { advance, settle } from '../engine/advance.ts';
import { cardDefinition } from '../cards/registry.ts';
import { canPayAbilityCosts } from '../engine/abilities.ts';
import { readyResourceCount, spendingPower } from '../engine/credits.ts';
import { cardTraits } from '../engine/attributes.ts';
import { unitStats } from '../engine/attachments.ts';
import { effectiveAbilities } from '../engine/effective-abilities.ts';
import { modifyUnit } from '../engine/lasting.ts';
import { decodeState, encodeState } from '../engine/checkpoint.ts';
import { Projector } from '../projection/projector.ts';
import { reference, move, addCard, playCost } from '../engine/state.ts';
import { choose, ids, position } from './helpers.ts';
import { scenario } from './scenario.ts';
import type { GameState, Intent } from '../engine/model.ts';
function step(s: GameState, p: Intent['kind'] | ((i: Intent) => boolean), selected: string[] = []) {
  s = advance(s, choose(s, p, selected)).state;
  while (s.execution.decision?.kind === 'trigger') s = advance(s, choose(s, 'trigger')).state;
  return s;
}
const target = (s: GameState, id: string) => step(s, i => i.kind === 'target' && i.card === id);
const play = (s: GameState, id: string) => step(s, i => i.kind === 'play' && i.card === id);
function damage(
  s: GameState,
  targetId: string,
  amount: number,
  sourceId?: string,
  unpreventable = false,
) {
  s.execution.decision = null;
  s.execution.frames.unshift({
    kind: 'damage',
    actor: sourceId ? s.cards[sourceId]!.controller : null,
    assignments: [
      {
        target: reference(s.cards[targetId]!),
        amount,
        source: sourceId ? structuredClone(s.cards[sourceId]!) : null,
        preventedBy: null,
        ...(unpreventable ? { unpreventable: true } : {}),
      },
    ],
  });
  settle(s);
  return s;
}
function board(card: string, inPlay = true) {
  const p = position();
  p.players[0].resources = Array.from({ length: 20 }, () => ({ card: ids.marine }));
  const d = cardDefinition(card);
  if (inPlay && d.kind === 'unit') p.players[0][d.arena] = [{ card, ref: 'source' }];
  else p.players[0].hand = [{ card, ref: 'source' }];
  return p;
}
test('Cassian weakens his attacker, prevents enemy ability damage only, and allows Shield-first ordering', () => {
  for (const enemy of [false, true]) {
    const p = board('cassian-andor--lay-low');
    (p.players[enemy ? 1 : 0].ground ??= []).push({ card: ids.marine, ref: 'dealer' });
    const { state, refs } = scenario(p);
    damage(state, refs.source!, 1, refs.dealer!);
    expect(state.cards[refs.source!]!.damage).toBe(enemy ? 0 : 1);
  }
  const p = board('cassian-andor--lay-low');
  p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
  p.attachments = [{ card: 'shield', unit: 'source', ref: 'shield' }];
  const g = scenario(p);
  let s = damage(g.state, g.refs.source!, 1, g.refs.enemy!);
  expect(s.execution.decision!.kind).toBe('replacement');
  s = target(decodeState(encodeState(s)), g.refs.source!);
  expect(s.cards[g.refs.shield!]!.zone).toBe('ground');
  s = damage(s, g.refs.source!, 3, g.refs.enemy!);
  s = target(s, g.refs.shield!);
  expect(s.cards[g.refs.source!]!.damage).toBe(0);
  expect(s.cards[g.refs.shield!]!.zone).toBe('set-aside');
  s.activePlayer = 'bob';
  s.execution.decision = null;
  settle(s);
  s = step(
    s,
    i => i.kind === 'attack' && i.attacker === g.refs.enemy && i.defender === g.refs.source,
  );
  expect(s.cards[g.refs.source!]!.damage).toBe(1);
});
test('Exiled removes Force and all abilities except Grit, including later grants, while its own ability loss lifts the restriction', () => {
  const p = board('exiled-from-the-force', false);
  p.players[0].ground = [
    { card: 'obi-wan-kenobi--finding-what-doesn-t-exist', ref: 'host', damage: 2 },
  ];
  const { state, refs } = scenario(p);
  let s = step(state, i => i.kind === 'play' && i.card === refs.source && i.target === refs.host);
  expect(cardTraits(s, s.cards[refs.host!]!)).not.toContain('Force');
  expect(effectiveAbilities(s, s.cards[refs.host!]!).triggers).toHaveLength(0);
  expect(effectiveAbilities(s, s.cards[refs.host!]!).keywords).toEqual(['Grit']);
  expect(unitStats(s, s.cards[refs.host!]!).power).toBe(6);
  modifyUnit(s, s.cards[refs.host!]!, s.cards[refs.host!]!, {
    kind: 'modify',
    power: 0,
    hp: 0,
    duration: 'phase',
    abilities: { keywords: ['Sentinel', 'Grit'] },
  });
  expect(effectiveAbilities(s, s.cards[refs.host!]!).keywords).toEqual(['Grit']);
  s = decodeState(encodeState(s));
  modifyUnit(s, s.cards[refs.host!]!, s.cards[refs.source!]!, {
    kind: 'modify',
    power: 0,
    hp: 0,
    duration: 'phase',
    loseAbilities: true,
  });
  expect(cardTraits(s, s.cards[refs.host!]!)).toContain('Force');
  expect(effectiveAbilities(s, s.cards[refs.host!]!).keywords).toContain('Sentinel');
});
test('Sly Moore’s phase effect survives her departure, affects later enemy units and applies only while attacking a base', () => {
  const { state, refs } = scenario(board('sly-moore--witness-to-power', false));
  let s = play(state, refs.source!);
  move(s, s.cards[refs.source!]!, 'hand');
  const enemy = addCard(s, 'bob', ids.marine, 'ground');
  enemy.exhausted = false;
  s.execution.decision = null;
  settle(s);
  s = step(
    s,
    i =>
      i.kind === 'attack' &&
      i.attacker === enemy.instanceId &&
      i.defender === s.players.alice!.base,
  );
  expect(s.cards[s.players.alice!.base]!.damage).toBe(1);
  expect(unitStats(s, s.cards[enemy.instanceId]!).power).toBe(3);
  expect(decodeState(encodeState(s)).phaseStatModifiers).toHaveLength(1);
  s = step(s, 'pass');
  s = step(s, 'pass');
  expect(s.phaseStatModifiers).toHaveLength(0);
});
test('Vigil prevents one per other friendly unit, increases its own damage once and respects unpreventable damage', () => {
  for (const unpreventable of [false, true]) {
    const p = board('vigil--securing-the-future');
    p.players[0].ground = [{ card: ids.consular, ref: 'ally' }];
    p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
    const { state, refs } = scenario(p);
    damage(state, refs.ally!, 2, refs.enemy!, unpreventable);
    expect(state.cards[refs.ally!]!.damage).toBe(unpreventable ? 2 : 1);
    damage(state, refs.source!, 2, refs.enemy!, unpreventable);
    expect(state.cards[refs.source!]!.damage).toBe(3);
  }
});
test('Vigil’s Shield ordering does not consume a Shield after its other-friendly prevention reaches zero', () => {
  const p = board('vigil--securing-the-future');
  p.players[0].ground = [{ card: ids.consular, ref: 'ally' }];
  p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
  p.attachments = [{ card: 'shield', unit: 'ally', ref: 'shield' }];
  const { state, refs } = scenario(p);
  const s = target(
    decodeState(encodeState(damage(state, refs.ally!, 1, refs.enemy!))),
    refs.source!,
  );
  expect(s.cards[refs.ally!]!.damage).toBe(0);
  expect(s.cards[refs.shield!]!.zone).toBe('ground');
});
test('Umbaran tracks the first attempted damage even if a Shield prevents it or the packet is unpreventable', () => {
  for (const mode of ['ordinary', 'shield', 'unpreventable'] as const) {
    const p = board('umbaran-mobile-cannon');
    p.players[1].ground = [{ card: ids.marine, ref: 'enemy' }];
    if (mode === 'shield') p.attachments = [{ card: 'shield', unit: 'source', ref: 'shield' }];
    const { state, refs } = scenario(p);
    let s = damage(state, refs.source!, 1, refs.enemy!, mode === 'unpreventable');
    if (mode === 'shield') s = target(s, refs.shield!);
    expect(s.cards[refs.source!]!.damage).toBe(mode === 'unpreventable' ? 1 : 0);
    s = damage(decodeState(encodeState(s)), refs.source!, 1, refs.enemy!);
    expect(s.cards[refs.source!]!.damage).toBe(mode === 'unpreventable' ? 2 : 1);
    expect(s.phaseHistory.damageAttempts.filter(r => r.instanceId === refs.source)).toHaveLength(1);
  }
});
test('Vuutun discounts itself for friendly Droids but cannot provide their resource payments before entering play', () => {
  const p = board('vuutun-palaa--droid-control-ship', false);
  p.players[0].resources = Array.from({ length: 5 }, () => ({ card: ids.marine }));
  p.players[0].ground = [
    { card: 'battle-droid', ref: 'a' },
    { card: 'battle-droid', ref: 'b' },
  ];
  const { state, refs } = scenario(p);
  expect(playCost(state, state.cards[refs.source!]!)).toBe(7);
  expect(spendingPower(state, 'alice')).toBe(5);
  expect(
    state.execution.decision!.options.some(
      o => o.intent.kind === 'play' && o.intent.card === refs.source,
    ),
  ).toBe(false);
});
test('Droid payments remain optional beside ready resources, spend no Credits, and count as resources paid', () => {
  const p = board('vuutun-palaa--droid-control-ship');
  p.players[0].resources = [{ card: ids.marine, ref: 'resource' }, { card: ids.marine }];
  p.players[0].ground = [{ card: 'battle-droid', ref: 'droid' }];
  p.players[0].hand = [{ card: ids.marine, ref: 'unit' }];
  p.players[0].credits = ['credit'];
  const { state, refs } = scenario(p);
  let s = play(state, refs.unit!);
  expect(s.execution.decision!.selection!.cards).toContain(refs.droid!);
  expect(s.execution.decision!.selection!.min).toBe(0);
  expect(s.players.alice!.resources).toHaveLength(2);
  const view = new Projector(s.gameId, { role: 'player', playerId: 'alice' }).project(s);
  expect(view.decision!.selection!.cards).toHaveLength(2);
  s = step(decodeState(encodeState(s)), 'accept-effect', [refs.droid!, refs.credit!]);
  expect(s.cards[refs.droid!]!.exhausted).toBe(true);
  expect(s.cards[refs.credit!]!.zone).toBe('set-aside');
  expect(readyResourceCount(s, 'alice')).toBe(2);
  expect(s.cards[refs.unit!]!.resourcesPaid).toBe(1);
});
test('Droids alone can pay for a card; losing Vuutun removes that permission and cannot inflate deployment thresholds', () => {
  const p = board('vuutun-palaa--droid-control-ship');
  p.players[0].resources = [];
  p.players[0].ground = [
    { card: 'battle-droid', ref: 'a' },
    { card: 'battle-droid', ref: 'b' },
  ];
  p.players[0].hand = [{ card: ids.marine, ref: 'unit' }];
  const g = scenario(p);
  const s = step(play(g.state, g.refs.unit!), 'accept-effect', [g.refs.a!, g.refs.b!]);
  expect(s.cards[g.refs.unit!]!.zone).toBe('ground');
  expect(s.cards[g.refs.unit!]!.resourcesPaid).toBe(2);
  const h = scenario(p);
  modifyUnit(h.state, h.state.cards[h.refs.source!]!, h.state.cards[h.refs.source!]!, {
    kind: 'modify',
    power: 0,
    hp: 0,
    duration: 'phase',
    loseAbilities: true,
  });
  expect(spendingPower(h.state, 'alice')).toBe(0);
  expect(h.state.players.alice!.resources).toHaveLength(0);
});
test('An exhaust-self or exhaust-unit cost cannot spend the same ready Droid a second time as a resource', () => {
  const p = board('vuutun-palaa--droid-control-ship');
  p.players[0].resources = [];
  p.players[0].ground = [{ card: 'battle-droid', ref: 'droid' }];
  const { state, refs } = scenario(p);
  state.cards[refs.source!]!.exhausted = true;
  for (const kind of ['exhaust-self', 'exhaust-friendly-unit'] as const)
    expect(
      canPayAbilityCosts(state, state.cards[refs.droid!]!, {
        id: 'compound',
        costs: [{ kind: 'resources', amount: 1 }, { kind }],
        limit: null,
        effects: [],
      }),
    ).toBe(false);
  addCard(state, 'alice', 'battle-droid', 'ground').exhausted = false;
  expect(
    canPayAbilityCosts(state, state.cards[refs.droid!]!, {
      id: 'compound',
      costs: [{ kind: 'resources', amount: 1 }, { kind: 'exhaust-self' }],
      limit: null,
      effects: [],
    }),
  ).toBe(true);
});
test('The opposing player can pay Cikatro’s revealed-card demand with their own Droid, including recovery at payment', () => {
  const p = board('cikatro-vizago--business-is-what-matters');
  p.players[1].resources = [];
  p.players[1].space = [{ card: 'vuutun-palaa--droid-control-ship', ref: 'ship' }];
  p.players[1].ground = [{ card: 'battle-droid', ref: 'droid' }];
  const { state, refs } = scenario(p);
  let s = step(
    state,
    i =>
      i.kind === 'attack' && i.attacker === refs.source && i.defender === state.players.bob!.base,
  );
  s = step(s, 'accept-effect');
  expect(s.execution.decision!.playerId).toBe('bob');
  const top = s.players.alice!.deck[0]!;
  s = step(decodeState(encodeState(s)), 'accept-effect', [refs.droid!]);
  expect(s.cards[top]!.zone).toBe('deck');
  expect(s.cards[refs.droid!]!.exhausted).toBe(true);
});
test('Jabba’s Credit-only Ambush bonus is not granted by exhausting a Droid for the nested play', () => {
  for (const credit of [false, true]) {
    const p = board('vuutun-palaa--droid-control-ship');
    p.players[0].leader = { card: 'jabba-the-hutt--crime-boss', deployedAs: 'unit', ref: 'jabba' };
    p.players[0].ground = [{ card: 'battle-droid', ref: 'droid' }];
    p.players[0].hand = [{ card: 'contraband-starhopper', ref: 'unit' }];
    p.players[0].credits = ['credit'];
    const g = scenario(p);
    let s = step(g.state, i => i.kind === 'use-ability' && i.card === g.refs.jabba);
    s = play(s, g.refs.unit!);
    s = step(s, 'accept-effect', [credit ? g.refs.credit! : g.refs.droid!]);
    expect(
      effectiveAbilities(s, s.cards[g.refs.unit!]!).keywords?.includes('Ambush') ?? false,
    ).toBe(credit);
  }
});
test('Exploit removes sacrificed Droids before offering the remaining resource payment', () => {
  const p = board('vuutun-palaa--droid-control-ship');
  p.players[0].ground = [
    { card: 'battle-droid', ref: 'sacrifice' },
    { card: 'battle-droid', ref: 'pay' },
  ];
  p.players[0].hand = [{ card: 'battle-droid-legion', ref: 'unit' }];
  const g = scenario(p);
  let s = step(play(g.state, g.refs.unit!), 'accept-effect', [g.refs.sacrifice!]);
  expect(s.execution.frames[0]!.kind).toBe('credit-payment');
  expect(s.execution.decision!.selection!.cards).toContain(g.refs.pay!);
  expect(s.execution.decision!.selection!.cards).not.toContain(g.refs.sacrifice!);
  s = step(decodeState(encodeState(s)), 'accept-effect', [g.refs.pay!]);
  expect(s.cards[g.refs.unit!]!.zone).toBe('ground');
  expect(s.cards[g.refs.pay!]!.exhausted).toBe(true);
  expect(s.cards[g.refs.sacrifice!]!.zone).toBe('set-aside');
});

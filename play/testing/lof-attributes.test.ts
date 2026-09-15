import { cardTraits } from '../engine/attributes.ts';
import { cannotReady } from '../engine/lasting.ts';
import { keywordNames } from '../engine/effective-abilities.ts';
import { canAffectWithAbility } from '../engine/protection.ts';
import { effectFrames } from '../engine/triggers.ts';
import { reconcilePrintedStats } from '../engine/printed-stats.ts';
import { expect, test } from 'bun:test';
import { advance, settle } from '../engine/advance.ts';
import { cardDefinition } from '../cards/registry.ts';
import { attachedUpgrades, unitStats } from '../engine/attachments.ts';
import { effectiveAbilities } from '../engine/effective-abilities.ts';
import { encodeState, decodeState } from '../engine/checkpoint.ts';
import { addCard, reference, playCost, assertState, move } from '../engine/state.ts';
import { Projector } from '../projection/projector.ts';
import type { GameState, Intent } from '../engine/model.ts';
import { choose, ids, position } from './helpers.ts';
import { scenario } from './scenario.ts';
import { lofContinuations } from './lof-continuations.ts';
import { forceToken } from '../engine/force.ts';
import { modifyUnit } from '../engine/lasting.ts';
function dealDamage(
  s: GameState,
  assignments: { target: GameState['cards'][string]; amount: number }[],
  actor: string,
  source: GameState['cards'][string],
) {
  s.execution.decision = null;
  s.execution.frames.unshift(
    ...assignments.flatMap(a =>
      effectFrames(actor, source, [{ kind: 'damage-target', target: 'victim', amount: a.amount }], {
        bindings: { victim: reference(a.target) },
      }),
    ),
  );
}
function drain(state: GameState): GameState {
  let s = state;
  for (let n = 0; n < 60; n++) {
    if (s.execution.random) {
      s = advance(s, {
        type: 'random',
        gameId: s.gameId,
        expectedRevision: s.revision,
        requestId: s.execution.random.id,
        values: s.execution.random.bounds.map(() => 0),
      }).state;
      continue;
    }
    if (s.execution.decision?.kind === 'trigger-player') {
      s = advance(s, choose(s, 'trigger-player')).state;
      continue;
    }
    if (s.execution.decision?.kind === 'trigger') {
      s = advance(s, choose(s, 'trigger')).state;
      continue;
    }
    return s;
  }
  throw Error('Unsettled helper');
}
const step = (
  s: GameState,
  p: Intent['kind'] | ((i: Intent) => boolean),
  selected: string[] = [],
) => drain(advance(s, choose(s, p, selected)).state);
const target = (s: GameState, id: string) => step(s, i => i.kind === 'target' && i.card === id);
const play = (s: GameState, id: string, host?: string) =>
  step(s, i => i.kind === 'play' && i.card === id && (!host || i.target === host));
const attack = (s: GameState, id: string, defender?: string) =>
  step(
    s,
    i =>
      i.kind === 'attack' && i.attacker === id && i.defender === (defender ?? s.players.bob!.base),
  );
const select = (s: GameState, ...ids: string[]) => step(s, 'accept-effect', ids);
const tokens = (s: GameState, id: string) =>
  attachedUpgrades(s, s.cards[id]!).filter(c => c.cardId === 'experience').length;
const spies = (s: GameState, player = 'alice') =>
  s.ground.filter(id => s.cards[id]!.controller === player && s.cards[id]!.cardId === 'spy').length;
function board(card: string, inHand = true) {
  const p = position();
  p.players[0].resources = Array.from({ length: 22 }, () => ({ card: ids.marine }));
  const d = cardDefinition(card);
  if (inHand) p.players[0].hand = [{ card, ref: 'source' }];
  else if (d.kind === 'unit') p.players[0][d.arena] = [{ card, ref: 'source' }];
  else throw Error();
  return p;
}
const mode = (s: GameState, mode: string) =>
  step(s, i => i.kind === 'choose-mode' && i.mode === mode);
const blank = (s: GameState, id: string) =>
  modifyUnit(s, s.cards[id]!, s.cards[id]!, {
    kind: 'modify',
    power: 0,
    hp: 0,
    duration: 'phase',
    loseAbilities: true,
  });
test('Adi Gallia observes opposing events even when the event has no legal target', () => {
  const p = board('adi-gallia--stern-and-focused', false);
  p.activePlayer = 'bob';
  p.players[1].hand = [{ card: 'cure-wounds', ref: 'event' }];
  p.players[1].resources = Array.from({ length: 8 }, () => ({ card: ids.marine }));
  const g = scenario(p),
    s = play(g.state, g.refs.event!);
  expect(s.cards[s.players.bob!.base]!.damage).toBe(1);
  expect(s.cards[s.players.alice!.base]!.damage).toBe(0);
});
for (const amount of [0, 3, 6])
  test(`Curious Flock pays exactly ${amount} without applying play discounts`, () => {
    const p = board('curious-flock');
    const g = scenario(p);
    let s = play(g.state, g.refs.source!);
    const before = s.players.alice!.resources.filter(id => !s.cards[id]!.exhausted).length;
    s = mode(s, `pay-${amount}`);
    if (s.execution.decision?.options.some(o => o.intent.kind === 'accept-effect'))
      s = step(s, 'accept-effect');
    expect(tokens(s, g.refs.source!)).toBe(amount);
    expect(s.players.alice!.resources.filter(id => !s.cards[id]!.exhausted).length).toBe(
      before - amount,
    );
  });
test('Curious Flock cannot choose an unaffordable payment', () => {
  const p = board('curious-flock');
  const d = cardDefinition('curious-flock');
  if (d.kind !== 'unit') throw Error();
  p.players[0].resources = Array.from({ length: d.cost + 2 }, () => ({ card: ids.marine }));
  const g = scenario(p),
    s = play(g.state, g.refs.source!);
  expect(s.execution.decision!.options.map(o => o.intent)).toContainEqual({
    kind: 'choose-mode',
    mode: 'pay-2',
  });
  expect(s.execution.decision!.options.map(o => o.intent)).not.toContainEqual({
    kind: 'choose-mode',
    mode: 'pay-3',
  });
});
test('Infused Brawler gains two Experience and spends the selected copy after surviving', () => {
  const p = board('infused-brawler');
  p.players[0].force = true;
  const g = scenario(p);
  let s = step(play(g.state, g.refs.source!), 'accept-effect');
  expect(tokens(s, g.refs.source!)).toBe(2);
  s.cards[g.refs.source!]!.exhausted = false;
  s = step(s, 'pass');
  s = attack(s, g.refs.source!);
  const exp = attachedUpgrades(s, s.cards[g.refs.source!]!)[0]!;
  s = select(s, exp.instanceId);
  expect(tokens(s, g.refs.source!)).toBe(1);
  expect(s.cards[exp.instanceId]!.zone).toBe('set-aside');
});
test('Infused Brawler defeated in combat does not offer a token choice', () => {
  const p = board('infused-brawler', false);
  p.players[1].ground = [{ card: 'jedi-guardian', ref: 'enemy' }];
  const g = scenario(p),
    s = attack(g.state, g.refs.source!, g.refs.enemy!);
  expect(s.cards[g.refs.source!]!.zone).toBe('discard');
  expect(s.execution.decision?.kind).toBe('action');
});
test('Jedi Trials grants a direct conditional Jedi trait independently of host ability loss', () => {
  const p = board('jedi-trials');
  p.players[0].ground = [{ card: 'the-father--maintaining-balance', ref: 'host' }];
  p.attachments = [
    { card: 'experience', unit: 'host' },
    { card: 'experience', unit: 'host' },
  ];
  const g = scenario(p);
  let s = play(g.state, g.refs.source!, g.refs.host!);
  expect(cardTraits(s, s.cards[g.refs.host!]!)).not.toContain('Jedi');
  s = step(s, 'pass');
  s = attack(s, g.refs.host!);
  expect(tokens(s, g.refs.host!)).toBe(3);
  expect(cardTraits(s, s.cards[g.refs.host!]!)).toContain('Jedi');
  blank(s, g.refs.host!);
  expect(cardTraits(s, s.cards[g.refs.host!]!)).toContain('Jedi');
  blank(s, g.refs.source!);
  expect(cardTraits(s, s.cards[g.refs.host!]!)).not.toContain('Jedi');
});
for (const force of [false, true])
  test(`Kylo's Lightsaber exhaustion protection requires a Force host: ${force}`, () => {
    const p = board('loth-cat');
    p.players[0].ground = [{ card: force ? 'jedi-guardian' : ids.marine, ref: 'host' }];
    p.attachments = [{ card: 'kylo-ren-s-lightsaber', unit: 'host' }];
    p.players[1].hand = [{ card: 'loth-cat', ref: 'enemy' }];
    p.players[1].resources = Array.from({ length: 4 }, () => ({ card: ids.marine }));
    p.activePlayer = 'bob';
    const g = scenario(p);
    const s = target(play(g.state, g.refs.enemy!), g.refs.host!);
    expect(s.cards[g.refs.host!]!.exhausted).toBe(!force);
    s.activePlayer = 'alice';
    s.execution.frames = [{ kind: 'action' }];
    s.execution.decision = null;
    settle(s);
    const own = target(play(s, g.refs.source!), g.refs.host!);
    expect(own.cards[g.refs.host!]!.exhausted).toBe(true);
  });
test('Leia cannot ready in space; her Force action moves her before granting Heroism stats', () => {
  const p = board('leia-organa--extraordinary', false);
  p.players[0].force = true;
  p.players[0].space![0]!.exhausted = true;
  p.players[0].ground = [
    { card: ids.marine, ref: 'ally' },
    { card: ids.trooper, ref: 'neutral' },
  ];
  const g = scenario(p);
  expect(cannotReady(g.state, g.state.cards[g.refs.source!]!)).toBe(true);
  let s = step(g.state, i => i.kind === 'use-ability' && i.card === g.refs.source);
  expect(s.cards[g.refs.source!]!.zone).toBe('ground');
  expect(s.cards[g.refs.source!]!.exhausted).toBe(true);
  expect(cannotReady(s, s.cards[g.refs.source!]!)).toBe(false);
  expect(unitStats(s, s.cards[g.refs.source!]!)).toEqual({ power: 7, hp: 7 });
  expect(unitStats(s, s.cards[g.refs.ally!]!)).toEqual({ power: 5, hp: 5 });
  expect(unitStats(s, s.cards[g.refs.neutral!]!)).toEqual({ power: 3, hp: 1 });
  expect(forceToken(s, 'alice')).toBeUndefined();
  s = step(s, 'pass');
  expect(
    s.execution.decision!.options.some(
      o => o.intent.kind === 'use-ability' && o.intent.card === g.refs.source,
    ),
  ).toBe(false);
});
test('Malakili discounts only the first Creature each phase', () => {
  const p = board('malakili--loving-rancor-keeper', false);
  p.players[0].hand = [
    { card: 'wampa', ref: 'a' },
    { card: 'wampa', ref: 'b' },
  ];
  const g = scenario(p);
  expect(playCost(g.state, g.state.cards[g.refs.a!]!)).toBe(3);
  let s = play(g.state, g.refs.a!);
  expect(playCost(s, s.cards[g.refs.b!]!)).toBe(4);
});
for (const enemy of [false, true])
  test(`Malakili prevents damage only from friendly Creatures: ${enemy}`, () => {
    const p = board('malakili--loving-rancor-keeper', false);
    p.players[enemy ? 1 : 0].ground = [
      ...(p.players[enemy ? 1 : 0].ground ?? []),
      { card: 'wampa', ref: 'creature' },
    ];
    p.players[0].ground!.push({ card: ids.marine, ref: 'ally' });
    const g = scenario(p);
    dealDamage(
      g.state,
      [{ target: g.state.cards[g.refs.ally!]!, amount: 2 }],
      enemy ? 'bob' : 'alice',
      g.state.cards[g.refs.creature!]!,
    );
    settle(g.state);
    expect(g.state.cards[g.refs.ally!]!.damage).toBe(enemy ? 2 : 0);
  });
test('Malakili protection does not prevent Creature damage to a base', () => {
  const p = board('malakili--loving-rancor-keeper', false);
  p.players[0].ground!.push({ card: 'wampa', ref: 'creature' });
  const g = scenario(p);
  dealDamage(
    g.state,
    [{ target: g.state.cards[g.state.players.alice!.base]!, amount: 2 }],
    'alice',
    g.state.cards[g.refs.creature!]!,
  );
  settle(g.state);
  expect(g.state.cards[g.state.players.alice!.base]!.damage).toBe(2);
});
test('Marchion doubles the final sum of Raid and ability loss removes that multiplier', () => {
  const p = board('marchion-ro--eye-of-the-nihil', false);
  p.players[0].ground!.push({ card: 'tusken-tracker', ref: 'ally' });
  p.players[1].ground = [{ card: 'tusken-tracker', ref: 'enemy' }];
  const g = scenario(p);
  modifyUnit(g.state, g.state.cards[g.refs.source!]!, g.state.cards[g.refs.ally!]!, {
    kind: 'modify',
    power: 0,
    hp: 0,
    duration: 'phase',
    abilities: { raid: 1 },
  });
  expect(effectiveAbilities(g.state, g.state.cards[g.refs.ally!]!).raid).toBe(6);
  expect(effectiveAbilities(g.state, g.state.cards[g.refs.enemy!]!).raid).toBe(2);
  const s = attack(g.state, g.refs.ally!);
  expect(s.cards[s.players.bob!.base]!.damage).toBe(8);
  blank(g.state, g.refs.source!);
  expect(effectiveAbilities(g.state, g.state.cards[g.refs.ally!]!).raid).toBe(3);
});
for (const force of [false, true])
  test(`Mind Trick uses combined live power and blanks only with Force: ${force}`, () => {
    const p = board('mind-trick');
    if (force) p.players[0].ground = [{ card: 'jedi-guardian' }];
    p.players[1].ground = [
      { card: ids.marine, ref: 'a' },
      { card: ids.trooper, ref: 'b' },
      { card: 'infused-brawler', ref: 'c' },
    ];
    const g = scenario(p);
    modifyUnit(g.state, g.state.cards[g.refs.source!]!, g.state.cards[g.refs.b!]!, {
      kind: 'modify',
      power: -2,
      hp: 0,
      duration: 'phase',
    });
    let s = play(g.state, g.refs.source!);
    expect(s.execution.decision!.selection!.budget).toMatchObject({ stat: 'power', max: 4 });
    expect(() => select(s, g.refs.a!, g.refs.c!)).toThrow();
    s = select(s, g.refs.a!, g.refs.b!);
    expect(s.cards[g.refs.a!]!.exhausted).toBe(true);
    expect(s.cards[g.refs.b!]!.exhausted).toBe(true);
    expect(s.cards[g.refs.c!]!.exhausted).toBe(false);
    expect(s.lastingEffects.some(e => e.target.instanceId === g.refs.a && e.loseAbilities)).toBe(
      force,
    );
  });
test('Nameless Terror removes Force only from existing enemy units until phase end', () => {
  const p = board('nameless-terror', false);
  p.players[1].ground = [{ card: 'jedi-guardian', ref: 'enemy' }];
  p.players[0].ground!.push({ card: 'jedi-guardian', ref: 'ally' });
  const g = scenario(p),
    s = attack(g.state, g.refs.source!);
  expect(cardTraits(s, s.cards[g.refs.enemy!]!)).not.toContain('Force');
  expect(cardTraits(s, s.cards[g.refs.ally!]!)).toContain('Force');
  const later = addCard(s, 'bob', 'jedi-guardian', 'ground');
  expect(cardTraits(s, later)).toContain('Force');
  s.lastingEffects = [];
  expect(cardTraits(s, s.cards[g.refs.enemy!]!)).toContain('Force');
});
test('Mythosaur shields itself, protects upgraded units and grants traits to leaders', () => {
  const p = board('mythosaur--folklore-awakened');
  p.players[0].leader.card = 'darth-vader--dark-lord-of-the-sith';
  p.players[1].leader.card = 'darth-vader--dark-lord-of-the-sith';
  p.players[0].ground = [
    { card: ids.marine, ref: 'upgraded' },
    { card: ids.marine, ref: 'plain' },
  ];
  p.players[1].ground = [{ card: ids.marine, ref: 'enemy' }];
  p.attachments = [{ card: 'experience', unit: 'upgraded' }];
  const g = scenario(p),
    s = play(g.state, g.refs.source!);
  expect(attachedUpgrades(s, s.cards[g.refs.source!]!).map(c => c.cardId)).toContain('shield');
  for (const operation of ['exhaust', 'return-to-hand'] as const) {
    expect(
      canAffectWithAbility(s, s.cards[g.refs.upgraded!]!, s.cards[g.refs.enemy!]!, operation),
    ).toBe(false);
    expect(
      canAffectWithAbility(s, s.cards[g.refs.plain!]!, s.cards[g.refs.enemy!]!, operation),
    ).toBe(true);
  }
  expect(cardTraits(s, s.cards[s.players.alice!.leader]!)).toContain('Mandalorian');
  expect(cardTraits(s, s.cards[s.players.bob!.leader]!)).not.toContain('Mandalorian');
  blank(s, g.refs.upgraded!);
  expect(
    canAffectWithAbility(s, s.cards[g.refs.upgraded!]!, s.cards[g.refs.enemy!]!, 'exhaust'),
  ).toBe(false);
  blank(s, g.refs.source!);
  expect(cardTraits(s, s.cards[s.players.alice!.leader]!)).not.toContain('Mandalorian');
});
test('Mythosaur protects an upgraded unit without preventing attack exhaustion', () => {
  const p = board('mythosaur--folklore-awakened', false);
  p.players[0].ground!.push({ card: ids.marine, ref: 'ally' });
  p.attachments = [{ card: 'experience', unit: 'ally' }];
  const g = scenario(p),
    s = attack(g.state, g.refs.ally!);
  expect(s.cards[g.refs.ally!]!.exhausted).toBe(true);
  expect(s.cards[s.players.bob!.base]!.damage).toBe(4);
});
test('Paz gains twice his damage, including ability loss and healing changes', () => {
  const p = board('paz-vizsla--unyielding-warrior', false);
  p.players[0].ground![0]!.damage = 2;
  const g = scenario(p);
  expect(unitStats(g.state, g.state.cards[g.refs.source!]!).power).toBe(7);
  g.state.cards[g.refs.source!]!.damage = 1;
  expect(unitStats(g.state, g.state.cards[g.refs.source!]!).power).toBe(5);
  blank(g.state, g.refs.source!);
  expect(unitStats(g.state, g.state.cards[g.refs.source!]!).power).toBe(3);
});
test('Oppo gains listed keywords and fixed Raid/Restore amounts, without self-sustaining cycles', () => {
  const p = board('oppo-rancisis--ancient-councilor', false);
  p.players[0].ground!.push(
    { card: 'tusken-tracker', ref: 'raid' },
    { card: 'jedi-guardian', ref: 'guardian' },
    { card: 'dooku--it-is-too-late', ref: 'hidden' },
  );
  const g = scenario(p);
  expect(effectiveAbilities(g.state, g.state.cards[g.refs.source!]!).raid).toBe(2);
  expect(keywordNames(g.state, g.state.cards[g.refs.source!]!)).toContain('Hidden');
  blank(g.state, g.refs.hidden!);
  expect(keywordNames(g.state, g.state.cards[g.refs.source!]!)).not.toContain('Hidden');
  blank(g.state, g.refs.raid!);
  expect(keywordNames(g.state, g.state.cards[g.refs.source!]!)).not.toContain('Raid');
});
test('Psychometry excludes only itself and searches traits of the exact chosen discard', () => {
  const p = board('psychometry');
  p.players[0].discard = [{ card: 'psychometry', ref: 'other' }];
  p.players[0].deck = [
    { card: 'force-slow', ref: 'found' },
    { card: ids.marine, ref: 'wrong' },
    ...Array.from({ length: 4 }, () => ({ card: ids.marine })),
  ];
  const g = scenario(p);
  let s = play(g.state, g.refs.source!);
  expect(s.execution.decision!.selection!.cards).not.toContain(g.refs.source!);
  expect(s.execution.decision!.selection!.cards).toContain(g.refs.other!);
  s = select(s, g.refs.other!);
  expect(s.execution.decision!.selection!.cards).toContain(g.refs.found!);
  expect(s.execution.decision!.selection!.cards).not.toContain(g.refs.wrong!);
  s = step(s, 'search', [g.refs.found!]);
  expect(s.cards[g.refs.found!]!.zone).toBe('hand');
});
test("Qui-Gon's Lightsaber enforces friendly non-Vehicle attachment and combined printed cost", () => {
  const p = board('qui-gon-jinn-s-lightsaber');
  p.players[0].ground = [{ card: 'qui-gon-jinn--the-negotiations-will-be-short', ref: 'host' }];
  p.players[1].ground = [
    { card: ids.marine, ref: 'a' },
    { card: 'wampa', ref: 'b' },
    { card: ids.trooper, ref: 'c' },
  ];
  const g = scenario(p);
  expect(
    g.state.execution.decision!.options.some(
      o => o.intent.kind === 'play' && o.intent.target === g.refs.a,
    ),
  ).toBe(false);
  let s = play(g.state, g.refs.source!, g.refs.host!);
  expect(s.execution.decision!.selection!.budget).toMatchObject({ stat: 'cost', max: 6 });
  expect(() => select(s, g.refs.a!, g.refs.b!, g.refs.c!)).toThrow();
  s = select(s, g.refs.a!, g.refs.b!);
  expect(s.cards[g.refs.a!]!.exhausted).toBe(true);
  expect(s.cards[g.refs.b!]!.exhausted).toBe(true);
});
test('Second Sister readies one resource for each discarded Force card, including a short deck', () => {
  const p = board('second-sister--seeking-the-holocron', false);
  p.players[0].deck = [{ card: 'force-slow', ref: 'force' }];
  p.players[0].resources = [
    { card: ids.marine, ref: 'r', exhausted: true },
    { card: ids.marine, ref: 'other', exhausted: true },
  ];
  const g = scenario(p);
  let s = step(attack(g.state, g.refs.source!), 'accept-effect');
  s = select(s, g.refs.r!);
  expect(s.cards[g.refs.r!]!.exhausted).toBe(false);
  expect(s.cards[g.refs.other!]!.exhausted).toBe(true);
  expect(s.cards[g.refs.force!]!.zone).toBe('discard');
});
test('Size Matters Not discounts and sets printed stats before ordinary modifiers', () => {
  const p = board('size-matters-not');
  p.players[0].ground = [{ card: 'jedi-guardian', ref: 'host' }];
  p.attachments = [{ card: 'experience', unit: 'host' }];
  const g = scenario(p);
  expect(
    playCost(g.state, g.state.cards[g.refs.source!]!, 0, undefined, g.state.cards[g.refs.host!]!),
  ).toBe(6);
  let s = play(g.state, g.refs.source!, g.refs.host!);
  expect(unitStats(s, s.cards[g.refs.host!]!)).toEqual({ power: 6, hp: 6 });
  blank(s, g.refs.host!);
  expect(unitStats(s, s.cards[g.refs.host!]!)).toEqual({ power: 6, hp: 6 });
  modifyUnit(s, s.cards[g.refs.source!]!, s.cards[g.refs.host!]!, {
    kind: 'modify',
    power: 0,
    hp: 0,
    printedPower: 8,
    printedHp: 8,
    duration: 'phase',
  });
  expect(unitStats(s, s.cards[g.refs.host!]!)).toEqual({ power: 9, hp: 9 });
  blank(s, g.refs.source!);
  reconcilePrintedStats(s);
  expect(unitStats(s, s.cards[g.refs.host!]!)).toEqual({ power: 9, hp: 9 });
});
for (const same of [false, true])
  test(`Vane transfers the selected Experience token, same host allowed: ${same}`, () => {
    const p = board('vane---i-live-to-serve');
    p.players[0].ground = [
      { card: ids.marine, ref: 'a' },
      { card: ids.marine, ref: 'b' },
    ];
    p.attachments = [
      { card: 'experience', unit: 'a', ref: 'exp' },
      { card: 'shield', unit: 'a', ref: 'shield' },
    ];
    const g = scenario(p);
    let s = play(g.state, g.refs.source!);
    expect(s.execution.decision!.selection!.cards).not.toContain(g.refs.shield!);
    s = target(select(s, g.refs.exp!), same ? g.refs.a! : g.refs.b!);
    expect(s.cards[g.refs.exp!]!.zone).toBe('set-aside');
    expect(tokens(s, g.refs.a!)).toBe(same ? 1 : 0);
    expect(tokens(s, g.refs.b!)).toBe(same ? 0 : 1);
  });
test('Tusken Tracker removes only Hidden from existing enemies and blocks later grants', () => {
  const p = board('tusken-tracker');
  p.players[1].ground = [{ card: 'dooku--it-is-too-late', ref: 'enemy' }];
  const g = scenario(p),
    s = play(g.state, g.refs.source!);
  expect(keywordNames(s, s.cards[g.refs.enemy!]!)).not.toContain('Hidden');
  modifyUnit(s, s.cards[g.refs.source!]!, s.cards[g.refs.enemy!]!, {
    kind: 'modify',
    power: 0,
    hp: 0,
    duration: 'phase',
    abilities: { keywords: ['Hidden', 'Sentinel'] },
  });
  expect(keywordNames(s, s.cards[g.refs.enemy!]!)).not.toContain('Hidden');
  expect(keywordNames(s, s.cards[g.refs.enemy!]!)).toContain('Sentinel');
  expect(effectiveAbilities(s, s.cards[g.refs.enemy!]!).triggers?.length).toBeGreaterThan(0);
  const later = addCard(s, 'bob', 'jedi-in-hiding', 'ground');
  expect(keywordNames(s, later)).toContain('Hidden');
  const restored = decodeState(encodeState(s));
  expect(keywordNames(restored, restored.cards[g.refs.enemy!]!)).not.toContain('Hidden');
});
test('Mythosaur grants Mandalorian to a deployed leader upgrade', () => {
  const p = board('mythosaur--folklore-awakened', false);
  p.players[0].leader = {
    card: 'luke-skywalker--hero-of-yavin',
    ref: 'leader',
    deployedAs: 'upgrade',
    attachedTo: 'ship',
  };
  p.players[0].space = [{ card: ids.fighter, ref: 'ship' }];
  const g = scenario(p);
  expect(cardTraits(g.state, g.state.cards[g.refs.leader!]!)).toContain('Mandalorian');
});
test('Two Marchion sources multiply after addition', () => {
  const p = board('marchion-ro--eye-of-the-nihil', false);
  p.players[0].ground!.push({ card: 'tusken-tracker', ref: 'unit' });
  const g = scenario(p);
  addCard(g.state, 'alice', 'marchion-ro--eye-of-the-nihil', 'ground');
  expect(effectiveAbilities(g.state, g.state.cards[g.refs.unit!]!).raid).toBe(8);
});
test('Two Oppo copies do not invent keywords without an independent source', () => {
  const p = board('oppo-rancisis--ancient-councilor', false);
  const g = scenario(p);
  const other = addCard(g.state, 'alice', 'oppo-rancisis--ancient-councilor', 'ground');
  expect(keywordNames(g.state, other)).not.toContain('Hidden');
});
test('Malakili keeps if-you-do effects when friendly Creature damage is prevented', () => {
  const p = board('malakili--loving-rancor-keeper', false);
  p.players[0].ground!.push(
    { card: 'dume--redeem-the-future', ref: 'host' },
    { card: ids.marine, ref: 'ally' },
  );
  p.attachments = [{ card: 'sith-holocron', unit: 'host' }];
  const g = scenario(p);
  let s = attack(g.state, g.refs.host!);
  s = target(s, g.refs.ally!);
  expect(s.cards[g.refs.ally!]!.damage).toBe(0);
  expect(s.cards[s.players.bob!.base]!.damage).toBe(5);
});

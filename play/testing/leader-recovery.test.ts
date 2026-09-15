import { expect, test } from 'bun:test';
import { advance, settle } from '../engine/advance.ts';
import { unitStats, unitKeywords, attachedUpgrades } from '../engine/attachments.ts';
import { decodeState, encodeState } from '../engine/checkpoint.ts';
import { move } from '../engine/state.ts';
import type { GameState, Intent, EngineInput, CardInstance } from '../engine/model.ts';
import type { CardEffect } from '../cards/definition.ts';
import { Projector } from '../projection/projector.ts';
import { scenario } from './scenario.ts';
import { choose, ids, position } from './helpers.ts';
const qira = 'qi-ra--i-alone-survived',
  moff = 'moff-gideon--indomitable-warlord',
  sabine = 'sabine-wren--bargaining-on-belief',
  dj = 'dj--need-a-lift-';
const step = (
  s: GameState,
  i: Intent['kind'] | ((i: Intent) => boolean),
  selected: string[] = [],
) => advance(s, choose(s, i, selected)).state;
const use = (s: GameState, id = 'leader-action') =>
  step(s, i => i.kind === 'use-ability' && i.abilityId === id);
const target = (s: GameState, id: string) => step(s, i => i.kind === 'target' && i.card === id);
const leader = (s: GameState) => s.cards[s.players.alice!.leader]!;
const view = (s: GameState, player?: string) =>
  new Projector(
    s.gameId,
    player ? { role: 'player', playerId: player } : { role: 'spectator' },
    'v'.repeat(32),
  ).project(s);
const shields = (s: GameState, card: CardInstance) =>
  attachedUpgrades(s, card).filter(c => c.cardId === 'shield');
function board(id: string, deployed = false) {
  const p = position();
  p.players[0].leader = { card: id, deployedAs: deployed ? 'unit' : null };
  p.players[0].resources = Array.from({ length: 12 }, () => ({ card: ids.marine }));
  return p;
}
function effects(s: GameState, e: CardEffect[], source: CardInstance = leader(s)) {
  s.execution.decision = null;
  s.execution.frames.unshift(
    ...e.map(effect => ({
      kind: 'effect' as const,
      playerId: source.controller,
      source: structuredClone(source),
      effect,
    })),
    { kind: 'flush-triggers' },
  );
  settle(s);
  return s;
}
function resume(s: GameState, input: EngineInput) {
  expect(decodeState(encodeState(s))).toEqual(s);
  const child = Bun.spawnSync(
    [process.execPath, new URL('./fixtures/resume.ts', import.meta.url).pathname],
    {
      stdin: new TextEncoder().encode(JSON.stringify({ state: encodeState(s), input })),
      stdout: 'pipe',
      stderr: 'pipe',
    },
  );
  expect(child.exitCode).toBe(0);
  expect(child.stderr.toString()).toBe('');
  expect(JSON.parse(child.stdout.toString())).toEqual(advance(s, input));
}
function attack(s: GameState, attacker = leader(s).instanceId, defender = s.players.bob!.base) {
  return step(s, i => i.kind === 'attack' && i.attacker === attacker && i.defender === defender);
}
for (const lethal of [false, true])
  test(`Qi'ra shields the chosen surviving friendly unit after damage (${lethal})`, () => {
    const p = board(qira);
    p.players[0].ground = [
      { card: ids.marine, damage: lethal ? 1 : 0, ref: 'unit' },
      { card: ids.marine, ref: 'other' },
    ];
    p.players[1].ground = [{ card: ids.marine, ref: 'enemy' }];
    const g = scenario(p);
    let s = use(g.state);
    expect(
      s.execution.decision!.options.some(
        o => o.intent.kind === 'target' && o.intent.card === g.refs.enemy,
      ),
    ).toBe(false);
    s = target(s, g.refs.unit!);
    expect(s.cards[g.refs.unit!]!.zone).toBe(lethal ? 'discard' : 'ground');
    expect(shields(s, s.cards[g.refs.unit!]!)).toHaveLength(lethal ? 0 : 1);
    expect(shields(s, s.cards[g.refs.other!]!)).toHaveLength(0);
  });
test("Qi'ra still creates a Shield when her damage is prevented", () => {
  const p = board(qira);
  p.players[0].ground = [{ card: ids.marine, ref: 'unit' }];
  p.attachments = [
    { card: 'shield', unit: 'unit', ref: 'one' },
    { card: 'shield', unit: 'unit', ref: 'two' },
  ];
  const g = scenario(p);
  let s = target(use(g.state), g.refs.unit!);
  resume(
    s,
    choose(s, i => i.kind === 'target' && i.card === g.refs.one),
  );
  s = target(s, g.refs.one!);
  expect(s.cards[g.refs.unit!]!.damage).toBe(0);
  expect(shields(s, s.cards[g.refs.unit!]!)).toHaveLength(2);
  expect(s.cards[g.refs.one!]!.zone).toBe('set-aside');
});
test("Qi'ra heals the whole board before one simultaneous half-HP damage event", () => {
  const p = board(qira);
  p.players[0].ground = [
    { card: ids.consular, damage: 6, ref: 'odd' },
    { card: ids.marine, damage: 2, ref: 'upgraded' },
  ];
  p.players[1].space = [{ card: ids.fighter, ref: 'small' }];
  p.attachments = [
    { card: 'academy-training', unit: 'upgraded' },
    { card: 'shield', unit: 'odd', ref: 'one' },
    { card: 'shield', unit: 'odd', ref: 'two' },
  ];
  const g = scenario(p);
  let s = use(g.state, 'deploy');
  expect(s.cards[g.refs.odd!]!.damage).toBe(0);
  expect(s.cards[g.refs.upgraded!]!.damage).toBe(0);
  expect(leader(s).damage).toBe(0);
  const frame = s.execution.frames[0]!;
  expect(frame.kind).toBe('damage');
  if (frame.kind !== 'damage') throw Error();
  expect(frame.assignments.find(a => a.target.instanceId === g.refs.odd)!.amount).toBe(3);
  expect(frame.assignments.find(a => a.target.instanceId === g.refs.upgraded)!.amount).toBe(2);
  resume(
    s,
    choose(s, i => i.kind === 'target' && i.card === g.refs.one),
  );
  s = target(s, g.refs.one!);
  expect(leader(s).damage).toBe(4);
  expect(unitStats(s, leader(s)).power).toBe(4);
  expect(s.cards[g.refs.odd!]!.damage).toBe(0);
  expect(s.cards[g.refs.upgraded!]!.damage).toBe(2);
  expect(s.cards[g.refs.small!]!.damage).toBe(0);
});
test('Moff Gideon takes only listed unconditional keywords from friendly Imperial discard cards', () => {
  const p = board(moff, true);
  p.players[0].discard = [
    { card: 'darth-vader--meet-your-destiny', ref: 'vader' },
    { card: 'flanking-tie-interceptor', ref: 'support' },
    { card: 'galen-erso--you-ll-never-win' },
  ];
  p.players[1].discard = [{ card: 'grand-inquisitor--you-re-right-to-be-afraid' }];
  const g = scenario(p);
  const s = g.state;
  expect([...unitKeywords(s, leader(s))].sort()).toEqual(['Shielded', 'Support']);
  expect(shields(s, leader(s))).toHaveLength(0);
  move(s, s.cards[g.refs.support!]!, 'hand');
  expect(unitKeywords(s, leader(s))).toEqual(['Shielded']);
  effects(s, [
    {
      kind: 'on-unit',
      target: 'source',
      operation: { kind: 'modify', power: 0, hp: 0, loseAbilities: true, duration: 'phase' },
    },
  ]);
  expect(unitKeywords(s, leader(s))).toEqual([]);
});
test('Moff Gideon can spend his front action with no Imperial defeat but cannot play a card', () => {
  const p = board(moff);
  p.players[0].hand = [{ card: ids.marine }];
  const s = use(scenario(p).state);
  expect(leader(s).exhausted).toBe(true);
  expect(s.players.alice!.hand).toHaveLength(1);
  expect(s.execution.decision!.kind).toBe('action');
});
for (const mine of [true, false])
  test(`Moff Gideon uses a friendly Imperial defeat this phase (${mine})`, () => {
    const p = board(moff);
    p.players[0].hand = [{ card: ids.marine, ref: 'played' }];
    p.players[mine ? 0 : 1].ground = [{ card: ids.trooper, ref: 'victim' }];
    const g = scenario(p);
    let s = effects(g.state, [{ kind: 'defeat-units', filter: {} }]);
    s = use(s);
    if (mine) {
      resume(s, choose(s, 'play'));
      s = step(s, 'play');
      expect(s.facts.findLast(f => f.type === 'played')!.amount).toBe(3);
      expect(s.cards[g.refs.played!]!.zone).toBe('ground');
    } else expect(s.cards[g.refs.played!]!.zone).toBe('hand');
  });
test('Sabine gives the opponent the unit choice before granting the next Shielded play', () => {
  const p = board(sabine);
  p.players[0].hand = [{ card: ids.marine, ref: 'played' }];
  p.players[1].ground = [
    { card: ids.marine, ref: 'enemy' },
    { card: ids.marine, ref: 'other' },
  ];
  const g = scenario(p);
  let s = use(g.state);
  expect(s.execution.decision!.playerId).toBe('bob');
  resume(
    s,
    choose(s, i => i.kind === 'target' && i.card === g.refs.enemy),
  );
  s = target(s, g.refs.enemy!);
  expect(
    attachedUpgrades(s, s.cards[g.refs.enemy!]!).filter(c => c.cardId === 'advantage'),
  ).toHaveLength(2);
  expect(attachedUpgrades(s, s.cards[g.refs.other!]!)).toHaveLength(0);
  s = step(s, 'pass');
  s = step(s, 'play');
  expect(shields(s, s.cards[g.refs.played!]!)).toHaveLength(1);
});
test('Sabine creates no next-play grant if the opponent has no unit', () => {
  const p = board(sabine);
  p.players[0].hand = [{ card: ids.marine, ref: 'played' }];
  const g = scenario(p);
  let s = use(g.state);
  s = step(s, 'pass');
  s = step(s, 'play');
  expect(shields(s, s.cards[g.refs.played!]!)).toHaveLength(0);
});
test('Sabine attack grant survives her defeat and does not apply to Pilot upgrade play', () => {
  const p = board(sabine, true);
  p.players[0].leader.damage = 4;
  p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
  p.players[0].space = [{ card: ids.fighter, ref: 'host' }];
  p.players[0].hand = [
    { card: 'clone-pilot', ref: 'pilot' },
    { card: ids.marine, ref: 'played' },
  ];
  const g = scenario(p);
  let s = attack(g.state, leader(g.state).instanceId, g.refs.enemy!);
  expect(leader(s).zone).toBe('base');
  s = step(s, 'pass');
  s = step(s, i => i.kind === 'play' && !!i.piloting);
  expect(shields(s, s.cards[g.refs.host!]!)).toHaveLength(0);
  s = step(s, 'pass');
  s = step(s, i => i.kind === 'play' && i.card === g.refs.played);
  expect(shields(s, s.cards[g.refs.played!]!)).toHaveLength(1);
});
function djPlay() {
  const p = board(dj);
  p.players[0].ground = [{ card: ids.consular, ref: 'guard' }];
  p.players[0].hand = [{ card: 'imperial-armored-commando', ref: 'played' }];
  const g = scenario(p);
  let s = target(use(g.state), g.refs.guard!);
  return { state: s, refs: g.refs };
}
test('DJ captures the played exact unit before Shielded resolves', () => {
  const g = djPlay();
  let s = g.state;
  resume(s, choose(s, 'play'));
  s = step(s, 'play');
  expect(s.cards[g.refs.played!]!.zone).toBe('captured');
  expect(s.cards[g.refs.played!]!.capturedBy!.instanceId).toBe(g.refs.guard!);
  expect(shields(s, s.cards[g.refs.played!]!)).toHaveLength(0);
  expect(s.facts.findLast(f => f.type === 'played')!.amount).toBe(7);
  expect(s.facts.find(f => f.type === 'captured')!.cards.map(c => c.instanceId)).toContain(
    g.refs.played!,
  );
});
for (const active of [true, false])
  test(`DJ rescued units enter ready only while his unit ability is active (${active})`, () => {
    const p = board(dj, active);
    p.players[1].ground = [{ card: ids.consular, ref: 'guard' }];
    p.captured = [{ card: ids.marine, guard: 'guard', owner: 'alice', ref: 'rescued' }];
    const g = scenario(p);
    const s = effects(g.state, [{ kind: 'defeat-units', filter: { controller: 'enemy' } }]);
    expect(s.cards[g.refs.rescued!]!.zone).toBe('ground');
    expect(s.cards[g.refs.rescued!]!.exhausted).toBe(!active);
    expect(s.facts.filter(f => f.type === 'played')).toHaveLength(0);
  });
test('DJ readies only friendly rescues and loses the aura when he loses abilities', () => {
  const p = board(dj, true);
  p.players[1].ground = [{ card: ids.consular, ref: 'guard' }];
  p.captured = [
    { card: ids.marine, guard: 'guard', owner: 'alice', ref: 'mine' },
    { card: ids.marine, guard: 'guard', owner: 'bob', ref: 'enemy' },
  ];
  const g = scenario(p);
  effects(g.state, [
    {
      kind: 'on-unit',
      target: 'source',
      operation: { kind: 'modify', power: 0, hp: 0, loseAbilities: true, duration: 'phase' },
    },
  ]);
  const s = effects(g.state, [{ kind: 'defeat-units', filter: { controller: 'enemy' } }]);
  expect(s.cards[g.refs.mine!]!.exhausted).toBe(true);
  expect(s.cards[g.refs.enemy!]!.exhausted).toBe(true);
});
test('DJ cannot choose a guard when no friendly unit exists and can decline the hidden play', () => {
  const p = board(dj);
  p.players[0].hand = [{ card: ids.marine }];
  let s = use(scenario(p).state);
  expect(s.players.alice!.hand).toHaveLength(1);
  expect(s.execution.decision!.kind).toBe('action');
  const g = djPlay();
  s = step(g.state, 'decline-effect');
  expect(s.cards[g.refs.played!]!.zone).toBe('hand');
});
test('DJ unit face does not ready an opposing rescue', () => {
  const p = board(dj, true);
  p.players[1].ground = [{ card: ids.consular, ref: 'guard' }];
  p.captured = [
    { card: ids.marine, guard: 'guard', owner: 'bob', ref: 'enemy' },
    { card: ids.marine, guard: 'guard', owner: 'alice', ref: 'mine' },
  ];
  const g = scenario(p);
  const s = effects(g.state, [{ kind: 'defeat-units', filter: { controller: 'enemy' } }]);
  expect(s.cards[g.refs.enemy!]!.exhausted).toBe(true);
  expect(s.cards[g.refs.mine!]!.exhausted).toBe(false);
});
test('A defeated DJ no longer readies his own rescued prisoners', () => {
  const p = board(dj, true);
  p.players[0].leader.ref = 'dj';
  p.captured = [{ card: ids.marine, guard: 'dj', owner: 'alice', ref: 'rescued' }];
  const g = scenario(p);
  const s = effects(g.state, [{ kind: 'defeat-units', filter: { controller: 'friendly' } }]);
  expect(leader(s).zone).toBe('base');
  expect(s.cards[g.refs.rescued!]!.exhausted).toBe(true);
});
test('Moff Gideon does not inherit a keyword from a non-Imperial discard card', () => {
  const p = board(moff, true);
  p.players[0].discard = [{ card: 'sabine-wren--spectre-five' }];
  const s = scenario(p).state;
  expect(unitKeywords(s, leader(s))).toEqual([]);
});
test('The opponent creates Sabine Advantages and can double them with their own Jerjerrod', () => {
  const p = board(sabine);
  p.players[0].ground = [{ card: 'moff-jerjerrod--we-shall-redouble-our-efforts', ref: 'mine' }];
  p.players[1].ground = [
    { card: 'moff-jerjerrod--we-shall-redouble-our-efforts', ref: 'theirs' },
    { card: ids.marine, ref: 'recipient' },
  ];
  const g = scenario(p);
  let s = target(use(g.state), g.refs.recipient!);
  expect(s.execution.decision!.playerId).toBe('bob');
  expect(
    s.execution.decision!.options.some(
      o => o.intent.kind === 'target' && o.intent.card === g.refs.mine,
    ),
  ).toBe(false);
  resume(
    s,
    choose(s, i => i.kind === 'target' && i.card === g.refs.theirs),
  );
  s = target(s, g.refs.theirs!);
  expect(s.cards[g.refs.theirs!]!.zone).toBe('discard');
  expect(s.cards[g.refs.mine!]!.zone).toBe('ground');
  expect(
    attachedUpgrades(s, s.cards[g.refs.recipient!]!).filter(c => c.cardId === 'advantage'),
  ).toHaveLength(4);
  expect(s.playModifiers).toHaveLength(1);
});
test('DJ preserves the captured source When Played ability but its Ambush cannot attack', () => {
  const p = board(dj);
  p.players[0].ground = [{ card: ids.consular, ref: 'guard' }];
  p.players[0].hand = [{ card: 'snub-fighter-squadron', ref: 'played' }];
  p.players[1].space = [{ card: ids.fighter, ref: 'target' }];
  const g = scenario(p);
  let s = step(target(use(g.state), g.refs.guard!), 'play');
  expect(s.cards[g.refs.played!]!.zone).toBe('captured');
  const batch = s.execution.frames[0]!;
  if (batch.kind !== 'trigger-batch') throw Error('Expected trigger batch');
  const whenPlayed = batch.triggers.find(t => t.abilityId === 'when-played')!;
  s = step(s, i => i.kind === 'trigger' && i.triggerId === whenPlayed.id);
  resume(
    s,
    choose(s, i => i.kind === 'target' && i.card === g.refs.target),
  );
  s = target(s, g.refs.target!);
  expect(s.cards[g.refs.target!]!.zone).toBe('discard');
  expect(s.execution.decision!.kind).toBe('action');
  expect(s.facts.filter(f => f.type === 'attacked')).toHaveLength(0);
});
for (const order of [
  ['source', 'chosen'],
  ['chosen', 'source'],
])
  test(`Simultaneous DJ and guard defeat leaves rescues exhausted (${order.join(',')})`, () => {
    const p = board(dj, true);
    p.players[1].ground = [{ card: ids.consular, ref: 'guard' }];
    p.captured = [{ card: ids.marine, guard: 'guard', owner: 'alice', ref: 'rescued' }];
    const g = scenario(p);
    let s = effects(g.state, [
      {
        kind: 'select-unit',
        filter: { controller: 'enemy' },
        bind: 'chosen',
        optional: false,
        effects: [{ kind: 'defeat-bound', targets: order }],
      },
    ]);
    resume(
      s,
      choose(s, i => i.kind === 'target' && i.card === g.refs.guard),
    );
    s = target(s, g.refs.guard!);
    expect(leader(s).zone).toBe('base');
    expect(s.cards[g.refs.guard!]!.zone).toBe('discard');
    expect(s.cards[g.refs.rescued!]!.zone).toBe('ground');
    expect(s.cards[g.refs.rescued!]!.exhausted).toBe(true);
  });

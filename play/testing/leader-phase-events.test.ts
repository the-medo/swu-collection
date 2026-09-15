import { expect, test } from 'bun:test';
import { advance, settle } from '../engine/advance.ts';
import { unitStats, attachedUpgrades } from '../engine/attachments.ts';
import { unitKeywords } from '../engine/attachments.ts';
import { decodeState, encodeState } from '../engine/checkpoint.ts';
import { reference, move } from '../engine/state.ts';
import { cardDefinition } from '../cards/registry.ts';
import type { GameState, Intent, EngineInput, CardInstance } from '../engine/model.ts';
import type { CardEffect } from '../cards/definition.ts';
import { Projector } from '../projection/projector.ts';
import { scenario } from './scenario.ts';
import { choose, ids, position } from './helpers.ts';
const boba = 'boba-fett--collecting-the-bounty',
  yoda = 'yoda--sensing-darkness',
  cassian = 'cassian-andor--dedicated-to-the-rebellion',
  pre = 'pre-vizsla--pursuing-the-throne',
  luthen = 'luthen-rael--don-t-you-want-to-fight-for-real-',
  hide = 'padm--amidala--what-do-you-have-to-hide-',
  anakin = 'anakin-skywalker--protect-her-at-all-costs',
  follow = 'padm--amidala--follow-my-lead';
const step = (
  s: GameState,
  i: Intent['kind'] | ((i: Intent) => boolean),
  selected: string[] = [],
) => advance(s, choose(s, i, selected)).state;
const use = (s: GameState, id = 'leader-action') =>
  step(s, i => i.kind === 'use-ability' && i.abilityId === id);
const target = (s: GameState, id: string) => step(s, i => i.kind === 'target' && i.card === id);
const leader = (s: GameState) => s.cards[s.players.alice!.leader]!;
const on = (
  target: string,
  operation: Extract<CardEffect, { kind: 'on-unit' }>['operation'],
): CardEffect => ({ kind: 'on-unit', target, operation });
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
function selected(
  s: GameState,
  filter: Extract<CardEffect, { kind: 'select-unit' }>['filter'],
  operation: Extract<CardEffect, { kind: 'on-unit' }>['operation'],
  source = leader(s),
) {
  return effects(
    s,
    [
      {
        kind: 'select-unit',
        filter,
        bind: 'chosen',
        optional: false,
        effects: [on('chosen', operation)],
      },
    ],
    source,
  );
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
function attack(s: GameState, attacker: string, defender = s.players.bob!.base) {
  return step(s, i => i.kind === 'attack' && i.attacker === attacker && i.defender === defender);
}
for (const operation of ['defeat', 'return-to-hand'] as const)
  test(`Boba reacts to enemy ${operation}, retaining the departing controller and exact copy`, () => {
    const p = board(boba);
    p.players[0].resources![0]!.exhausted = true;
    p.players[1].ground = [{ card: ids.marine, ref: 'enemy' }];
    const g = scenario(p);
    let s = target(selected(g.state, { controller: 'enemy' }, { kind: operation }), g.refs.enemy!);
    expect(s.phaseHistory.left[0]!.controller).toBe('bob');
    resume(s, choose(s, 'accept-effect'));
    s = step(s, 'accept-effect');
    s = step(s, 'accept-effect', [s.players.alice!.resources[0]!]);
    expect(leader(s).exhausted).toBe(true);
    expect(s.cards[s.players.alice!.resources[0]!]!.exhausted).toBe(false);
  });
test('Arena changes and control changes do not create unit departures', () => {
  const p = board(boba);
  p.players[1].ground = [{ card: ids.marine, ref: 'enemy' }];
  const g = scenario(p);
  move(g.state, g.state.cards[g.refs.enemy!]!, 'space');
  const s = target(
    selected(g.state, { controller: 'enemy' }, { kind: 'take-control', player: 'self' }),
    g.refs.enemy!,
  );
  expect(s.phaseHistory.left).toEqual([]);
  expect(s.execution.decision!.kind).toBe('action');
});
test('Boba unit readies up to two resources after surviving an attack that defeats an enemy', () => {
  const p = board(boba, true);
  p.players[1].ground = [{ card: ids.marine, ref: 'enemy' }];
  p.players[0].resources!.forEach(c => (c.exhausted = true));
  const g = scenario(p);
  let s = attack(g.state, leader(g.state).instanceId, g.refs.enemy!);
  expect(s.execution.decision!.selection!.max).toBe(2);
  resume(s, choose(s, 'accept-effect', s.players.alice!.resources.slice(0, 2)));
  s = step(s, 'accept-effect', s.players.alice!.resources.slice(0, 2));
  expect(s.players.alice!.resources.filter(id => !s.cards[id]!.exhausted)).toHaveLength(2);
});
for (const id of [yoda, anakin, follow])
  test(`${id} may pay exhaustion without qualifying history`, () => {
    const s = use(scenario(board(id)).state);
    expect(leader(s).exhausted).toBe(true);
    expect(s.execution.decision!.kind).toBe('action');
    expect(s.players.alice!.hand).toHaveLength(0);
  });
for (const place of ['top', 'bottom'])
  test(`Yoda draws then puts the selected exact hand copy on deck ${place}`, () => {
    const p = board(yoda);
    p.players[0].hand = [
      { card: ids.fighter, ref: 'selected' },
      { card: ids.fighter, ref: 'other' },
    ];
    p.players[1].ground = [{ card: ids.marine, ref: 'enemy' }];
    const g = scenario(p);
    let s = target(
      selected(g.state, { controller: 'enemy' }, { kind: 'return-to-hand' }),
      g.refs.enemy!,
    );
    s = use(s);
    expect(s.players.alice!.hand).toHaveLength(3);
    s = step(s, 'accept-effect', [g.refs.selected!]);
    resume(
      s,
      choose(s, i => i.kind === 'choose-mode' && i.mode === `deck-${place}`),
    );
    s = step(s, i => i.kind === 'choose-mode' && i.mode === `deck-${place}`);
    expect(s.players.alice!.deck[place === 'top' ? 0 : s.players.alice!.deck.length - 1]).toBe(
      g.refs.selected!,
    );
    expect(s.cards[g.refs.other!]!.zone).toBe('hand');
  });
test('Yoda chooses whether to mill without seeing the top card, then compares printed cost', () => {
  const p = board(yoda);
  p.players[0].deck = [{ card: ids.consular, ref: 'top' }];
  p.players[1].ground = [
    { card: ids.consular, ref: 'equal' },
    { card: ids.marine, ref: 'cheap' },
    { card: 'zeb-orrelios--fists-work-every-time', ref: 'expensive' },
  ];
  const g = scenario(p);
  let s = use(g.state, 'deploy');
  const altered = structuredClone(s);
  altered.cards[g.refs.top!]!.cardId = ids.fighter;
  const project = (s: GameState) =>
    new Projector(s.gameId, { role: 'player', playerId: 'alice' }, 'v'.repeat(32)).project(s);
  expect(project(s)).toEqual(project(altered));
  const declined = step(s, 'decline-effect');
  expect(declined.cards[g.refs.top!]!.zone).toBe('deck');
  resume(s, choose(s, 'accept-effect'));
  s = step(s, 'accept-effect');
  expect(
    s.execution
      .decision!.options.flatMap(o => (o.intent.kind === 'target' ? [o.intent.card] : []))
      .sort(),
  ).toEqual([g.refs.equal!, g.refs.cheap!].sort());
  s = target(s, g.refs.equal!);
  expect(s.cards[g.refs.equal!]!.zone).toBe('discard');
  expect(s.cards[g.refs.top!]!.zone).toBe('discard');
});
test('Cassian counts actual enemy base damage across events even when it is later healed', () => {
  const p = board(cassian);
  let s = scenario(p).state;
  s = effects(s, [
    { kind: 'damage-bases', targets: 'enemy', amount: 2 },
    { kind: 'heal-own-base', player: 'enemy', amount: 2 },
    { kind: 'damage-bases', targets: 'enemy', amount: 1 },
  ]);
  expect(s.cards[s.players.bob!.base]!.damage).toBe(1);
  expect(s.phaseHistory.enemyBaseDamage.alice).toBe(3);
  resume(
    s,
    choose(s, i => i.kind === 'use-ability' && i.abilityId === 'leader-action'),
  );
  s = use(s);
  expect(s.players.alice!.hand).toHaveLength(1);
});
test('Cassian pays resources and exhaustion ineffectively when only two damage was dealt', () => {
  let s = scenario(board(cassian)).state;
  s = effects(s, [{ kind: 'damage-bases', targets: 'enemy', amount: 2 }]);
  s = use(s);
  expect(leader(s).exhausted).toBe(true);
  expect(s.players.alice!.resources.filter(id => s.cards[id]!.exhausted)).toHaveLength(1);
  expect(s.players.alice!.hand).toHaveLength(0);
});
test('Cassian unit may decline base damage and draw on a later event only once that round', () => {
  let s = scenario(board(cassian, true)).state;
  const damage: CardEffect[] = [{ kind: 'damage-bases', targets: 'enemy', amount: 1 }];
  s = step(effects(s, damage), 'decline-effect');
  s = effects(s, damage);
  resume(s, choose(s, 'accept-effect'));
  s = step(s, 'accept-effect');
  s = effects(s, damage);
  expect(s.execution.decision!.kind).toBe('action');
  expect(s.players.alice!.hand).toHaveLength(1);
});
test('Pre Vizsla counts actual draws and the counter resets before the next action phase', () => {
  const p = board(pre);
  p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
  const g = scenario(p);
  let s = effects(g.state, [{ kind: 'draw-cards', amount: 3 }]);
  s = target(use(s), g.refs.enemy!);
  expect(s.cards[g.refs.enemy!]!.damage).toBe(3);
  while (s.round === 1)
    s = step(s, s.execution.decision!.kind === 'resource' ? 'resource' : 'pass', []);
  expect(s.phaseHistory.cardsDrawn).toEqual({});
  s = target(use(s), g.refs.enemy!);
  expect(s.cards[g.refs.enemy!]!.damage).toBe(3);
});
for (const count of [0, 3, 6])
  test(`Pre Vizsla unit hand thresholds (${count}) are live`, () => {
    const p = board(pre, true);
    p.players[0].hand = Array.from({ length: count }, () => ({ card: ids.marine }));
    const s = scenario(p).state;
    expect(unitKeywords(s, leader(s)).includes('Saboteur')).toBe(count >= 3);
    const d = cardDefinition(pre);
    if (d.kind !== 'leader') throw Error();
    expect(unitStats(s, leader(s)).power).toBe(d.faces.unit!.power + (count >= 6 ? 2 : 0));
  });
for (const deployed of [false, true])
  test(`Luthen reacts when a friendly attacker dies (${deployed})`, () => {
    const p = board(luthen, deployed);
    p.players[0].ground = [{ card: ids.marine, ref: 'attacker' }];
    p.players[1].ground = [{ card: ids.consular, ref: 'defender' }];
    const g = scenario(p);
    let s = attack(g.state, g.refs.attacker!, g.refs.defender!);
    resume(s, choose(s, 'accept-effect'));
    s = step(s, 'accept-effect');
    s = target(s, s.players.bob!.base);
    expect(s.cards[s.players.bob!.base]!.damage).toBe(deployed ? 2 : 1);
    expect(s.actionHistory).toBeNull();
  });
test('Luthen does not react to a defeated defender or a unit that attacked in an earlier action', () => {
  const p = board(luthen);
  p.players[0].ground = [{ card: ids.marine, ref: 'prior' }];
  p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
  const g = scenario(p);
  let s = attack(g.state, g.refs.prior!);
  expect(s.actionHistory).toBeNull();
  s = target(selected(s, { controller: 'friendly' }, { kind: 'defeat' }), g.refs.prior!);
  expect(s.execution.decision!.kind).toBe('action');
  expect(leader(s).exhausted).toBe(false);
});
for (const deployed of [false, true])
  test(`Padme observes one reveal for a whole hand (${deployed})`, () => {
    const p = board(hide, deployed);
    p.players[0].hand = [{ card: ids.marine }, { card: ids.marine }];
    p.players[1].ground = [{ card: ids.consular, ref: 'target' }];
    const g = scenario(p);
    let s = effects(g.state, [{ kind: 'reveal-hand', player: 'self', effects: [] }]);
    resume(s, choose(s, 'accept-effect'));
    s = step(s, 'accept-effect');
    s = target(s, g.refs.target!);
    expect(s.cards[g.refs.target!]!.damage).toBe(1);
    expect(s.execution.decision!.kind).toBe('action');
  });
test('Padme observes an opposing ability discarding multiple cards from her hand once', () => {
  const p = board(hide, true);
  p.players[0].hand = [
    { card: ids.marine, ref: 'one' },
    { card: ids.fighter, ref: 'two' },
  ];
  p.players[1].ground = [{ card: ids.consular, ref: 'target' }];
  const g = scenario(p);
  let s = effects(
    g.state,
    [
      {
        kind: 'inspect-zone',
        zone: 'hand',
        player: 'enemy',
        chooser: 'self',
        filter: {},
        min: 2,
        max: 2,
        bind: 'discard',
        group: 'discard',
        effects: [{ kind: 'move-cards', group: 'discard', from: 'hand', to: 'discard' }],
      },
    ],
    g.state.cards[g.state.players.bob!.leader]!,
  );
  s = step(s, 'accept-effect', [g.refs.one!, g.refs.two!]);
  s = step(s, 'accept-effect');
  s = target(s, g.refs.target!);
  expect(s.cards[g.refs.target!]!.damage).toBe(1);
  expect(s.execution.decision!.kind).toBe('action');
});
test('A revealed search draw is not a hand reveal for Padme', () => {
  const p = board(hide, true);
  p.players[0].deck = [{ card: ids.marine }];
  let s = scenario(p).state;
  s = effects(s, [{ kind: 'search-deck', count: 1, filter: 'unit', max: 1 }]);
  s = step(s, 'search', s.execution.decision!.selection!.cards);
  if (s.execution.random)
    s = advance(s, {
      type: 'random',
      gameId: s.gameId,
      expectedRevision: s.revision,
      requestId: s.execution.random.id,
      values: s.execution.random.bounds.map(() => 0),
    }).state;
  expect(s.players.alice!.hand).toHaveLength(1);
  expect(s.phaseHistory.cardsDrawn.alice).toBe(1);
  expect(s.execution.decision!.kind).toBe('action');
});
test('Anakin counts a departed friendly entry but gives the Shield to a surviving exact entrant', () => {
  const p = board(anakin);
  p.players[0].ground = [
    { card: ids.marine, ref: 'one' },
    { card: ids.marine, ref: 'two' },
  ];
  p.enteredThisPhase = ['one', 'two'];
  const g = scenario(p);
  let s = target(
    selected(g.state, { controller: 'friendly' }, { kind: 'return-to-hand' }),
    g.refs.one!,
  );
  s = use(s);
  expect(s.execution.decision!.options.map(o => o.intent)).toEqual([
    { kind: 'target', card: g.refs.two! },
  ]);
  resume(s, choose(s, 'target'));
  s = step(s, 'target');
  expect(attachedUpgrades(s, s.cards[g.refs.two!]!).map(c => c.cardId)).toEqual(['shield']);
  expect(s.phaseHistory.unitEntries).toHaveLength(2);
});
test('Anakin unit has Sentinel and shields another friendly entrant on attack', () => {
  const p = board(anakin, true);
  p.players[0].ground = [
    { card: 'clone-trooper', ref: 'entrant' },
    { card: ids.marine, ref: 'old' },
  ];
  p.enteredThisPhase = ['entrant'];
  const g = scenario(p);
  expect(unitKeywords(g.state, leader(g.state))).toContain('Sentinel');
  let s = attack(g.state, leader(g.state).instanceId);
  expect(s.execution.decision!.options.map(o => o.intent)).toEqual([
    { kind: 'target', card: g.refs.entrant! },
  ]);
  s = step(s, 'target');
  expect(attachedUpgrades(s, s.cards[g.refs.entrant!]!)).toHaveLength(1);
  expect(attachedUpgrades(s, s.cards[g.refs.old!]!)).toHaveLength(0);
});
test('Padme front forces an eligible exhausted entrant to attack a unit and excludes bases', () => {
  const p = board(follow);
  p.players[0].ground = [
    { card: ids.marine, exhausted: true, ref: 'one' },
    { card: ids.marine, exhausted: true, ref: 'two' },
  ];
  p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
  p.enteredThisPhase = ['one', 'two'];
  const g = scenario(p);
  let s = use(g.state);
  expect(s.execution.decision!.options.some(o => o.intent.kind === 'decline-effect')).toBe(false);
  s = target(s, g.refs.one!);
  expect(s.execution.decision!.options.map(o => o.intent)).toEqual([
    { kind: 'attack', attacker: g.refs.one!, defender: g.refs.enemy! },
  ]);
  resume(s, choose(s, 'attack'));
  s = step(s, 'attack');
  expect(s.cards[g.refs.enemy!]!.damage).toBe(3);
});
test('Padme attack-end can order an exhausted entrant after she herself is defeated', () => {
  const p = board(follow, true);
  const d = cardDefinition(follow);
  if (d.kind !== 'leader') throw Error();
  p.players[0].leader.damage = d.faces.unit!.hp - 1;
  p.players[0].ground = [{ card: ids.marine, exhausted: true, ref: 'entrant' }];
  p.players[1].ground = [
    { card: ids.consular, ref: 'enemy' },
    { card: ids.consular, ref: 'other' },
  ];
  p.enteredThisPhase = ['entrant'];
  const g = scenario(p);
  let s = attack(g.state, leader(g.state).instanceId, g.refs.enemy!);
  expect(leader(s).zone).toBe('base');
  s = step(s, 'accept-effect');
  s = target(s, g.refs.entrant!);
  resume(
    s,
    choose(s, i => i.kind === 'attack' && i.defender === g.refs.other),
  );
  s = step(s, i => i.kind === 'attack' && i.defender === g.refs.other);
  expect(s.cards[g.refs.other!]!.damage).toBe(3);
});

test('Luthen observes a defeat after combat has ended but before the same action finishes', () => {
  const p = board(luthen);
  p.players[0].ground = [{ card: ids.consular, ref: 'attacker' }];
  p.players[1].ground = [{ card: ids.marine, ref: 'defender' }];
  p.attachments = [
    { card: 'shield', unit: 'defender', owner: 'bob', ref: 'shield1' },
    { card: 'shield', unit: 'defender', owner: 'bob', ref: 'shield2' },
  ];
  const g = scenario(p);
  let s = attack(g.state, g.refs.attacker!, g.refs.defender!);
  // A resumable follow-up models an attack instruction that defeats its attacker afterwards.
  s.attacks[0]!.after = [
    {
      kind: 'effect',
      playerId: 'alice',
      source: structuredClone(leader(s)),
      bindings: { chosen: reference(s.cards[g.refs.attacker!]!) },
      effect: on('chosen', { kind: 'defeat' }),
    },
  ];
  resume(
    s,
    choose(s, i => i.kind === 'target' && i.card === g.refs.shield1),
  );
  s = target(s, g.refs.shield1!);
  expect(s.attacks).toHaveLength(0);
  expect(s.cards[g.refs.attacker!]!.zone).toBe('discard');
  s = step(s, 'accept-effect');
  s = target(s, s.players.bob!.base);
  expect(s.cards[s.players.bob!.base]!.damage).toBe(1);
  expect(s.actionHistory).toBeNull();
});
test('A captured enemy token leaves play and triggers Boba despite being set aside', () => {
  const p = board(boba);
  p.players[0].ground = [{ card: ids.marine, ref: 'guard' }];
  p.players[1].ground = [{ card: 'battle-droid', ref: 'enemy' }];
  const g = scenario(p);
  let s = effects(
    g.state,
    [
      {
        kind: 'select-unit',
        filter: { controller: 'enemy' },
        bind: 'chosen',
        optional: false,
        effects: [{ kind: 'capture-unit', guard: 'source', target: 'chosen' }],
      },
    ],
    g.state.cards[g.refs.guard!]!,
  );
  s = target(s, g.refs.enemy!);
  expect(s.cards[g.refs.enemy!]!.zone).toBe('set-aside');
  expect(s.phaseHistory.left).toHaveLength(1);
  s = step(s, 'decline-effect');
  expect(leader(s).exhausted).toBe(false);
});
test('Boba must survive his attack to ready resources', () => {
  const p = board(boba, true);
  const d = cardDefinition(boba);
  if (d.kind !== 'leader') throw Error();
  p.players[0].leader.damage = d.faces.unit!.hp - 1;
  p.players[1].ground = [{ card: ids.marine, ref: 'enemy' }];
  p.players[0].resources!.forEach(c => (c.exhausted = true));
  const g = scenario(p);
  const s = attack(g.state, leader(g.state).instanceId, g.refs.enemy!);
  expect(leader(s).zone).toBe('base');
  expect(s.execution.decision!.kind).toBe('action');
  expect(s.players.alice!.resources.every(id => s.cards[id]!.exhausted)).toBe(true);
});
test('Yoda cannot invent a discarded cost from an empty deck', () => {
  const p = board(yoda);
  p.players[0].deck = [];
  p.players[1].ground = [{ card: 'battle-droid', ref: 'zero' }];
  const g = scenario(p);
  const s = step(use(g.state, 'deploy'), 'accept-effect');
  expect(s.cards[g.refs.zero!]!.zone).toBe('ground');
  expect(s.cards[s.players.alice!.base]!.damage).toBe(0);
  expect(s.execution.decision!.kind).toBe('action');
});
test('Empty-deck fatigue is not a card drawn for Pre Vizsla', () => {
  const p = board(pre);
  p.players[0].deck = [];
  let s = scenario(p).state;
  s = effects(s, [{ kind: 'draw-cards', amount: 2 }]);
  expect(s.phaseHistory.cardsDrawn).toEqual({});
  expect(s.cards[s.players.alice!.base]!.damage).toBe(6);
});
test('Showing a hand card to choose Credit payment does not trigger Padme', () => {
  const p = board(hide, true);
  p.players[0].hand = [{ card: ids.fighter }];
  p.players[0].credits = ['credit'];
  const g = scenario(p);
  let s = step(g.state, 'play');
  s = step(s, 'accept-effect', [g.refs.credit!]);
  expect(s.execution.decision!.kind).toBe('action');
  expect(
    s.facts.some(f => f.type === 'triggered' && f.cards[0]?.instanceId === leader(s).instanceId),
  ).toBe(false);
});
test('Creating two unit tokens qualifies Anakin, but playing an attached Pilot does not count as a unit entry', () => {
  let s = scenario(board(anakin)).state;
  s = effects(s, [{ kind: 'create-unit', cardId: 'clone-trooper', count: 2 }]);
  expect(s.phaseHistory.unitEntries).toHaveLength(2);
  s = use(s);
  s = step(s, 'target');
  expect(s.ground.flatMap(id => attachedUpgrades(s, s.cards[id]!))).toHaveLength(1);
  const p = board(anakin);
  p.players[0].hand = [{ card: 'clone-pilot' }];
  p.players[0].space = [{ card: ids.fighter }];
  s = scenario(p).state;
  s = step(s, i => i.kind === 'play' && !!i.piloting);
  expect(s.phaseHistory.entered).toHaveLength(1);
  expect(s.phaseHistory.unitEntries).toHaveLength(0);
});

test('Cassian damage observers include abilities borrowed by Support and honor ability loss', () => {
  const p = board(cassian, true);
  p.players[0].ground = [{ card: ids.marine, ref: 'attacker' }];
  const g = scenario(p);
  let s = effects(g.state, [{ kind: 'support' }]);
  s = attack(s, g.refs.attacker!);
  expect(s.execution.frames[0]!.kind).toBe('trigger-batch');
  const batch = s.execution.frames[0]!;
  if (batch.kind !== 'trigger-batch') throw Error();
  expect(batch.triggers.map(t => t.source.instanceId).sort()).toEqual(
    [leader(s).instanceId, g.refs.attacker!].sort(),
  );
  while (s.execution.decision!.kind !== 'action') {
    const intent = s.execution.decision!.options.some(o => o.intent.kind === 'trigger')
      ? 'trigger'
      : 'accept-effect';
    s = step(s, intent);
  }
  expect(s.players.alice!.hand).toHaveLength(2);
  const blank = scenario(p);
  let denied = effects(blank.state, [
    {
      kind: 'modify-units',
      filter: { sameAs: 'source' },
      operation: { kind: 'modify', power: 0, hp: 0, loseAbilities: true, duration: 'phase' },
    },
    { kind: 'damage-bases', targets: 'enemy', amount: 1 },
  ]);
  expect(denied.execution.decision!.kind).toBe('action');
  expect(denied.players.alice!.hand).toHaveLength(0);
});

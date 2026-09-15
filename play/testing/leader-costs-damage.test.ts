import { expect, test } from 'bun:test';
import { advance, settle } from '../engine/advance.ts';
import { decodeState, encodeState } from '../engine/checkpoint.ts';
import { credits } from '../engine/credits.ts';
import type { GameState, Intent, EngineInput, CardInstance } from '../engine/model.ts';
import type { CardEffect } from '../cards/definition.ts';
import { scenario } from './scenario.ts';
import { choose, ids, position } from './helpers.ts';
const rex = 'rex--no-other-option',
  vane = 'vane--quarrelsome-pirate',
  han = 'han-solo--i-got-a-really-good-feeling',
  tobias = 'tobias-beckett--people-are-predictable',
  jabba = 'jabba-the-hutt--wonderful-human-being',
  jango = 'jango-fett--concealing-the-conspiracy';
const step = (
  s: GameState,
  i: Intent['kind'] | ((i: Intent) => boolean),
  selected: string[] = [],
) => advance(s, choose(s, i, selected)).state;
const use = (s: GameState, id = 'leader-action') =>
  step(s, i => i.kind === 'use-ability' && i.abilityId === id);
const target = (s: GameState, id: string) => step(s, i => i.kind === 'target' && i.card === id);
const leader = (s: GameState) => s.cards[s.players.alice!.leader]!;
function board(id: string, deployed = false) {
  const p = position();
  p.players[0].leader = { card: id, deployedAs: deployed ? 'unit' : null };
  p.players[0].resources = Array.from({ length: 12 }, () => ({ card: ids.marine }));
  return p;
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
function ownAttack(s: GameState, defender = s.players.bob!.base) {
  return step(
    s,
    i => i.kind === 'attack' && i.attacker === leader(s).instanceId && i.defender === defender,
  );
}
function selectObserve(s: GameState) {
  if (s.execution.frames[0]?.kind === 'trigger-batch') {
    const t = s.execution.frames[0].triggers.find(t => t.abilityId === 'observe')!;
    return step(s, i => i.kind === 'trigger' && i.triggerId === t.id);
  }
  return s;
}
test('Rex pays chosen enemy readiness and leader exhaustion atomically before granting an event discount', () => {
  const p = board(rex);
  p.players[1].ground = [
    { card: ids.marine, exhausted: true, ref: 'enemy' },
    { card: ids.marine, ref: 'ready' },
  ];
  p.players[0].hand = [{ card: 'resupply' }];
  const g = scenario(p);
  let s = use(g.state);
  expect(s.execution.decision!.selection!.cards).toEqual([g.refs.enemy!]);
  expect(leader(s).exhausted).toBe(false);
  expect(() => step(s, 'accept-effect', [g.refs.ready!])).toThrow();
  resume(s, choose(s, 'accept-effect', [g.refs.enemy!]));
  s = step(s, 'accept-effect', [g.refs.enemy!]);
  expect(leader(s).exhausted).toBe(true);
  expect(s.cards[g.refs.enemy!]!.exhausted).toBe(false);
  s = step(s, 'pass');
  s = step(s, 'play');
  expect(s.facts.find(f => f.type === 'played')!.amount).toBe(2);
});
test('Rex cannot pay with a ready enemy or one prevented from readying', () => {
  const p = board(rex);
  p.players[1].ground = [{ card: ids.marine, exhausted: true }];
  let s = scenario(p).state;
  s = effects(s, [
    {
      kind: 'modify-units',
      filter: { controller: 'enemy' },
      operation: { kind: 'modify', power: 0, hp: 0, cannotReady: true, duration: 'phase' },
    },
  ]);
  expect(
    s.execution.decision!.options.some(
      o => o.intent.kind === 'use-ability' && o.intent.abilityId === 'leader-action',
    ),
  ).toBe(false);
  p.players[1].ground[0]!.exhausted = false;
  s = scenario(p).state;
  expect(
    s.execution.decision!.options.some(
      o => o.intent.kind === 'use-ability' && o.intent.abilityId === 'leader-action',
    ),
  ).toBe(false);
});
for (const accept of [false, true])
  test(`Rex attack discounts only after a successful optional ready (${accept})`, () => {
    const p = board(rex, true);
    p.players[1].ground = [{ card: ids.marine, exhausted: true, ref: 'enemy' }];
    const g = scenario(p);
    let s = ownAttack(g.state);
    s = accept ? target(s, g.refs.enemy!) : step(s, 'decline-effect');
    expect(s.playModifiers).toHaveLength(accept ? 1 : 0);
    if (accept) expect(s.playModifiers[0]!.discount).toBe(2);
  });
test('Vane pays a friendly upgrade before choosing a base, including an upgrade on an enemy host', () => {
  const p = board(vane);
  p.players[1].ground = [{ card: ids.marine, ref: 'enemy' }];
  p.attachments = [{ card: 'academy-training', unit: 'enemy', owner: 'alice', ref: 'upgrade' }];
  const g = scenario(p);
  let s = use(g.state);
  expect(s.execution.decision!.selection!.cards).toEqual([g.refs.upgrade!]);
  resume(s, choose(s, 'accept-effect', [g.refs.upgrade!]));
  s = step(s, 'accept-effect', [g.refs.upgrade!]);
  s = target(s, s.players.bob!.base);
  expect(s.cards[g.refs.upgrade!]!.zone).toBe('discard');
  expect(s.cards[s.players.bob!.base]!.damage).toBe(2);
  expect(leader(s).exhausted).toBe(true);
});
test('Vane attack can decline sacrifice or damage only the defender or a base after paying', () => {
  const p = board(vane, true);
  p.players[0].ground = [{ card: ids.marine, ref: 'host' }];
  p.players[1].ground = [
    { card: ids.consular, ref: 'defender' },
    { card: ids.consular, ref: 'other' },
  ];
  p.attachments = [{ card: 'experience', unit: 'host', ref: 'upgrade' }];
  const g = scenario(p);
  const pending = ownAttack(g.state, g.refs.defender!);
  const declined = step(pending, 'accept-effect', []);
  expect(declined.cards[g.refs.upgrade!]!.zone).toBe('ground');
  let s = step(pending, 'accept-effect', [g.refs.upgrade!]);
  expect(
    s.execution
      .decision!.options.flatMap(o => (o.intent.kind === 'target' ? [o.intent.card] : []))
      .sort(),
  ).toEqual([s.players.alice!.base, s.players.bob!.base, g.refs.defender!].sort());
  resume(
    s,
    choose(s, i => i.kind === 'target' && i.card === g.refs.defender),
  );
  s = target(s, g.refs.defender!);
  expect(s.cards[g.refs.defender!]!.damage).toBe(5);
  expect(s.cards[g.refs.other!]!.damage).toBe(0);
});
for (const kind of ['unit', 'upgrade', 'credit', 'force'] as const)
  test(`Han front accepts a friendly ${kind} token as the chosen cost`, () => {
    const p = board(han);
    p.players[0].ground = [{ card: kind === 'unit' ? 'clone-trooper' : ids.marine, ref: 'host' }];
    p.players[1].ground = [{ card: ids.consular, ref: 'target' }];
    if (kind === 'upgrade') p.attachments = [{ card: 'experience', unit: 'host', ref: 'token' }];
    if (kind === 'credit') p.players[0].credits = ['token'];
    if (kind === 'force') p.players[0].force = true;
    const g = scenario(p);
    let s = use(g.state);
    const id =
      kind === 'unit'
        ? g.refs.host!
        : kind === 'force'
          ? s.execution.decision!.selection!.cards.find(id => s.cards[id]!.cardId === 'the-force')!
          : g.refs.token!;
    resume(s, choose(s, 'accept-effect', [id]));
    s = step(s, 'accept-effect', [id]);
    s = target(s, g.refs.target!);
    expect(s.cards[id]!.zone).toBe('set-aside');
    expect(s.cards[g.refs.target!]!.damage).toBe(1);
  });
test('Han defeats a selected token unit and its selected attached token exactly once each, plus Force and Credits', () => {
  const p = board(han, true);
  p.players[0].ground = [{ card: 'clone-trooper', ref: 'unit' }];
  p.players[0].force = true;
  p.players[0].credits = ['credit'];
  p.players[1].ground = [{ card: ids.consular, ref: 'target' }];
  p.attachments = [
    { card: 'experience', unit: 'unit', ref: 'selected' },
    { card: 'shield', unit: 'unit', ref: 'unselected' },
  ];
  const g = scenario(p);
  let s = selectObserve(ownAttack(g.state));
  const force = s.execution.decision!.selection!.cards.find(
    id => s.cards[id]!.cardId === 'the-force',
  )!;
  const selected = [g.refs.unit!, g.refs.selected!, g.refs.credit!, force];
  resume(s, choose(s, 'accept-effect', selected));
  s = step(s, 'accept-effect', selected);
  s = target(s, g.refs.target!);
  expect(s.cards[g.refs.target!]!.damage).toBe(4);
  for (const id of [...selected, g.refs.unselected!]) expect(s.cards[id]!.zone).toBe('set-aside');
});
test('Han may defeat no tokens and cannot choose enemy tokens', () => {
  const p = board(han, true);
  p.players[1].ground = [{ card: 'clone-trooper', ref: 'enemy' }];
  const g = scenario(p);
  let s = selectObserve(ownAttack(g.state));
  expect(s.execution.decision!.selection!.cards).toEqual([]);
  expect(() => step(s, 'accept-effect', [g.refs.enemy!])).toThrow();
  s = step(s, 'accept-effect', []);
  if (s.execution.decision!.kind === 'effect') s = target(s, g.refs.enemy!);
  expect(s.cards[g.refs.enemy!]!.damage).toBe(0);
});
test('Tobias gives control of the chosen unit to the opponent and creates one Credit', () => {
  const p = board(tobias);
  p.players[0].ground = [{ card: ids.marine, ref: 'given' }];
  const g = scenario(p);
  let s = use(g.state);
  resume(s, choose(s, 'target'));
  s = step(s, 'target');
  expect(s.cards[g.refs.given!]!).toMatchObject({
    owner: 'alice',
    controller: 'bob',
    zone: 'ground',
  });
  expect(credits(s, 'alice')).toHaveLength(1);
});
test('Tobias deployment selects owned enemy-controlled units without selecting the opponent owned unit', () => {
  const p = board(tobias);
  p.players[0].ground = [
    { card: ids.marine, controller: 'bob', ref: 'one' },
    { card: ids.marine, controller: 'bob', ref: 'two' },
  ];
  p.players[1].ground = [{ card: ids.marine, ref: 'enemy' }];
  const g = scenario(p);
  let s = use(g.state, 'deploy');
  expect(s.execution.decision!.selection!.cards).toEqual([g.refs.one!, g.refs.two!]);
  resume(s, choose(s, 'accept-effect', [g.refs.two!]));
  s = step(s, 'accept-effect', [g.refs.two!]);
  expect(s.cards[g.refs.two!]!.zone).toBe('discard');
  expect(s.cards[g.refs.one!]!.zone).toBe('ground');
  expect(s.players.alice!.hand).toHaveLength(1);
  expect(credits(s, 'alice')).toHaveLength(1);
});
for (const damage of [1, 3])
  test(`Jabba front has the selected damaged unit deal ${damage === 3 ? 2 : 1} damage (${damage})`, () => {
    const p = board(jabba);
    p.players[0].ground = [{ card: ids.consular, damage, ref: 'dealer' }];
    p.players[1].ground = [{ card: ids.marine, ref: 'target' }];
    const g = scenario(p);
    let s = use(g.state);
    s = target(s, g.refs.dealer!);
    resume(s, choose(s, 'target'));
    s = target(s, g.refs.target!);
    const fact = s.facts.filter(f => f.type === 'damage').at(-1)!;
    expect(fact.cards[0]!.instanceId).toBe(g.refs.dealer!);
    expect(s.cards[g.refs.target!]!.damage).toBe(damage === 3 ? 2 : 1);
  });
test('Jabba retaliation uses the amount actually dealt to the surviving unit, not its total damage', () => {
  const p = board(jabba, true);
  p.players[0].ground = [{ card: ids.consular, damage: 1, ref: 'ally' }];
  p.players[1].ground = [{ card: ids.consular, ref: 'target' }];
  const g = scenario(p);
  let s = effects(g.state, [
    { kind: 'damage-units', filter: { controller: 'friendly', otherThan: 'source' }, amount: 2 },
  ]);
  s = step(s, 'accept-effect');
  resume(s, choose(s, 'target'));
  s = target(s, g.refs.target!);
  expect(s.cards[g.refs.ally!]!.damage).toBe(3);
  expect(s.cards[g.refs.target!]!.damage).toBe(2);
  expect(s.facts.filter(f => f.type === 'damage').at(-1)!.cards[0]!.instanceId).toBe(g.refs.ally!);
});
for (const prevents of [false, true])
  test(`Jabba does not retaliate for a defeated or Shield-protected ally (${prevents})`, () => {
    const p = board(jabba, true);
    p.players[0].ground = [{ card: ids.marine, ref: 'ally' }];
    if (prevents) p.attachments = [{ card: 'shield', unit: 'ally' }];
    const g = scenario(p);
    const s = effects(g.state, [
      { kind: 'damage-units', filter: { controller: 'friendly', otherThan: 'source' }, amount: 3 },
    ]);
    expect(s.execution.decision!.kind).toBe('action');
  });
for (const deployed of [false, true])
  test(`Jango observes friendly unit ability damage and exhausts the exact enemy (${deployed})`, () => {
    const p = board(jango, deployed);
    p.players[0].ground = [{ card: ids.marine, ref: 'dealer' }];
    p.players[1].ground = [
      { card: ids.consular, ref: 'enemy' },
      { card: ids.consular, ref: 'other' },
    ];
    const g = scenario(p);
    let s = effects(
      g.state,
      [
        {
          kind: 'damage-units',
          filter: { controller: 'enemy', name: 'Consular Security Force', damaged: true },
          amount: 1,
        },
      ],
      g.state.cards[g.refs.dealer!]!,
    );
    expect(s.execution.decision!.kind).toBe('action');
    g.state.cards[g.refs.enemy!]!.damage = 1;
    s = effects(
      g.state,
      [{ kind: 'damage-units', filter: { controller: 'enemy', damaged: true }, amount: 1 }],
      g.state.cards[g.refs.dealer!]!,
    );
    resume(s, choose(s, 'accept-effect'));
    s = step(s, 'accept-effect');
    expect(s.cards[g.refs.enemy!]!.exhausted).toBe(true);
    expect(s.cards[g.refs.other!]!.exhausted).toBe(false);
  });
test('Jango observes combat damage even when the friendly dealer is defeated', () => {
  const p = board(jango);
  p.players[0].ground = [{ card: ids.marine, ref: 'dealer' }];
  p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
  const g = scenario(p);
  let s = step(
    g.state,
    i => i.kind === 'attack' && i.attacker === g.refs.dealer && i.defender === g.refs.enemy,
  );
  expect(s.cards[g.refs.dealer!]!.zone).toBe('discard');
  s = step(s, 'accept-effect');
  expect(s.cards[g.refs.enemy!]!.exhausted).toBe(true);
});
test('Jango ignores damage from his non-unit leader face and prevented unit damage', () => {
  for (const shield of [false, true]) {
    const p = board(jango);
    p.players[0].ground = [{ card: ids.marine, ref: 'dealer' }];
    p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
    if (shield) p.attachments = [{ card: 'shield', unit: 'enemy', owner: 'bob' }];
    const g = scenario(p);
    const s = effects(
      g.state,
      [{ kind: 'damage-units', filter: { controller: 'enemy' }, amount: 1 }],
      shield ? g.state.cards[g.refs.dealer!]! : leader(g.state),
    );
    expect(s.execution.decision!.kind).toBe('action');
    expect(leader(s).exhausted).toBe(false);
  }
});

test('Vane can pay an upgrade defeat replaced by Luke returning as a unit', () => {
  const p = board(vane);
  p.players[0].space = [{ card: ids.fighter, ref: 'host' }];
  p.attachments = [{ card: 'luke-skywalker--you-still-with-me-', unit: 'host', ref: 'pilot' }];
  const g = scenario(p);
  let s = step(use(g.state), 'accept-effect', [g.refs.pilot!]);
  resume(s, choose(s, 'accept-effect'));
  s = step(s, 'accept-effect');
  s = target(s, s.players.bob!.base);
  expect(s.cards[g.refs.pilot!]!.zone).toBe('ground');
  expect(s.cards[g.refs.pilot!]!.attachedTo).toBeNull();
  expect(s.cards[s.players.bob!.base]!.damage).toBe(2);
  expect(leader(s).exhausted).toBe(true);
});
test('Tobias does not receive a Credit when attempted control change defeats a leader-status unit', () => {
  const p = board(tobias);
  p.players[0].ground = [{ card: 'sabine-wren--i-learned-the-hard-way', ref: 'given' }];
  p.attachments = [{ card: 'the-darksaber--icon-of-leadership', unit: 'given' }];
  const g = scenario(p);
  const s = target(use(g.state), g.refs.given!);
  expect(s.cards[g.refs.given!]!.zone).toBe('discard');
  expect(credits(s, 'alice')).toHaveLength(0);
});
test('Jabba may decline without spending the round limit and cannot retaliate twice after accepting', () => {
  const p = board(jabba, true);
  p.players[0].ground = [{ card: ids.consular, ref: 'ally' }];
  p.players[1].ground = [{ card: ids.consular, ref: 'target' }];
  const g = scenario(p);
  const hit: CardEffect[] = [
    { kind: 'damage-units', filter: { controller: 'friendly', otherThan: 'source' }, amount: 1 },
  ];
  let s = step(effects(g.state, hit), 'decline-effect');
  s = step(effects(s, hit), 'accept-effect');
  s = target(s, g.refs.target!);
  s = effects(s, hit);
  expect(s.execution.decision!.kind).toBe('action');
  expect(s.cards[g.refs.ally!]!.damage).toBe(3);
  expect(s.cards[g.refs.target!]!.damage).toBe(1);
});
test('Jango unit captures his reaction before simultaneous lethal damage removes him', () => {
  const p = board(jango, true);
  p.players[0].leader.damage = 6;
  p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
  const g = scenario(p);
  let s = ownAttack(g.state, g.refs.enemy!);
  expect(leader(s).zone).toBe('base');
  resume(s, choose(s, 'accept-effect'));
  s = step(s, 'accept-effect');
  expect(s.cards[g.refs.enemy!]!.exhausted).toBe(true);
});

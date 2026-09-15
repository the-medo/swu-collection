import { expect, test } from 'bun:test';
import { advance, settle } from '../engine/advance.ts';
import { unitStats, attachedUpgrades } from '../engine/attachments.ts';
import { decodeState, encodeState } from '../engine/checkpoint.ts';
import { move, reference } from '../engine/state.ts';
import type { GameState, Intent, EngineInput, CardInstance } from '../engine/model.ts';
import type { CardEffect } from '../cards/definition.ts';
import { scenario } from './scenario.ts';
import { choose, ids, position } from './helpers.ts';
const enfys = 'enfys-nest--until-we-can-go-no-higher',
  gar = 'gar-saxon--viceroy-of-mandalore';
const step = (
  s: GameState,
  i: Intent['kind'] | ((i: Intent) => boolean),
  selected: string[] = [],
) => advance(s, choose(s, i, selected)).state;
const target = (s: GameState, id: string) => step(s, i => i.kind === 'target' && i.card === id);
const leader = (s: GameState) => s.cards[s.players.alice!.leader]!;
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
  expect(child.exitCode, child.stderr.toString()).toBe(0);
  expect(child.stderr.toString()).toBe('');
  expect(JSON.parse(child.stdout.toString())).toEqual(advance(s, input));
}
function attack(s: GameState, attacker: string, defender = s.players.bob!.base) {
  return step(s, i => i.kind === 'attack' && i.attacker === attacker && i.defender === defender);
}
function repeated(deployed = false) {
  const p = board(enfys, deployed);
  p.players[0].ground = [{ card: 'sabine-wren--spectre-five', ref: 'attacker' }];
  return scenario(p);
}
for (const deployed of [false, true])
  for (const accept of [false, true])
    test(`Enfys may repeat one explicit On Attack ability (${deployed}, ${accept})`, () => {
      const p = board(enfys, deployed);
      p.players[0].ground = [{ card: 'cloud-rider-veteran', ref: 'attacker' }];
      const g = scenario(p);
      let s = target(attack(g.state, g.refs.attacker!), g.state.players.bob!.base);
      resume(s, choose(s, accept ? 'accept-effect' : 'decline-effect'));
      s = step(s, accept ? 'accept-effect' : 'decline-effect');
      if (accept) s = target(s, s.players.bob!.base);
      expect(s.cards[s.players.bob!.base]!.damage).toBe(accept ? 5 : 3);
      if (!deployed) expect(leader(s).exhausted).toBe(accept);
    });
for (const deployed of [false, true])
  test(`Enfys does not repeat generated Restore or Saboteur abilities (${deployed})`, () => {
    const p = board(enfys, deployed);
    p.players[0].base.damage = 5;
    p.players[0].ground = [{ card: 'jabba-the-hutt--eminence-of-tatooine', ref: 'attacker' }];
    const g = scenario(p);
    const s = attack(g.state, g.refs.attacker!);
    expect(s.execution.decision!.kind).toBe('action');
    expect(s.cards[s.players.alice!.base]!.damage).toBe(3);
    expect(s.usedAttackAbilities).toHaveLength(0);
  });
for (const deployed of [false, true])
  test(`Gar Saxon gives every friendly upgraded unit one power (${deployed})`, () => {
    const p = board(gar, deployed);
    p.players[0].ground = [
      { card: ids.marine, ref: 'unit' },
      { card: ids.marine, ref: 'plain' },
    ];
    p.players[1].ground = [{ card: ids.marine, ref: 'enemy' }];
    p.attachments = [
      { card: 'shield', unit: 'unit' },
      { card: 'shield', unit: 'enemy' },
    ];
    const g = scenario(p);
    expect(unitStats(g.state, g.state.cards[g.refs.unit!]!).power).toBe(4);
    expect(unitStats(g.state, g.state.cards[g.refs.plain!]!).power).toBe(3);
    expect(unitStats(g.state, g.state.cards[g.refs.enemy!]!).power).toBe(3);
  });
function garDefeat(card = 'academy-training', owner = 'alice', deployed = true) {
  const p = board(gar, deployed);
  p.players[0].space = [{ card: ids.fighter, ref: 'host' }];
  p.attachments = [{ card, unit: 'host', owner, ref: 'upgrade' }];
  const g = scenario(p);
  const s = effects(g.state, [
    { kind: 'defeat-units', filter: { controller: 'friendly', arena: 'space' } },
  ]);
  return { state: s, refs: g.refs };
}
for (const owner of ['alice', 'bob'])
  test(`Gar returns the selected attached upgrade to its printed owner (${owner})`, () => {
    const g = garDefeat('academy-training', owner);
    let s = g.state;
    expect(s.cards[g.refs.host!]!.zone).toBe('discard');
    resume(
      s,
      choose(s, i => i.kind === 'target' && i.card === g.refs.upgrade),
    );
    s = target(s, g.refs.upgrade!);
    expect(s.cards[g.refs.upgrade!]!.zone).toBe('hand');
    expect(s.players[owner]!.hand).toContain(g.refs.upgrade!);
  });
test('Gar front has no defeat-return ability', () => {
  const g = garDefeat('academy-training', 'alice', false);
  expect(g.state.execution.decision!.kind).toBe('action');
  expect(g.state.cards[g.refs.upgrade!]!.zone).toBe('discard');
});
test('Gar can return a Pilot unit that was attached as an upgrade', () => {
  const g = garDefeat('clone-pilot');
  const s = target(g.state, g.refs.upgrade!);
  expect(s.cards[g.refs.upgrade!]!.zone).toBe('hand');
  expect(s.cards[g.refs.upgrade!]!.attachedTo).toBeNull();
});
test('Gar cannot return a defeated Shield token', () => {
  const g = garDefeat('shield');
  expect(g.state.execution.decision!.kind).toBe('action');
  expect(g.state.cards[g.refs.upgrade!]!.zone).toBe('set-aside');
});
test('Gar may decline the return', () => {
  const g = garDefeat();
  const s = step(g.state, 'decline-effect');
  expect(s.cards[g.refs.upgrade!]!.zone).toBe('discard');
});
test('Gar cannot return an upgrade which left the discard pile and returned later', () => {
  const g = garDefeat();
  const s = g.state;
  move(s, s.cards[g.refs.upgrade!]!, 'hand');
  move(s, s.cards[g.refs.upgrade!]!, 'discard');
  s.execution.decision = null;
  settle(s);
  expect(s.execution.decision!.kind).toBe('action');
  expect(s.cards[g.refs.upgrade!]!.zone).toBe('discard');
});
test('Gar retains a simultaneously defeated friendly unit ability after his own defeat', () => {
  const p = board(gar, true);
  p.players[0].ground = [{ card: ids.marine, ref: 'host' }];
  p.attachments = [{ card: 'academy-training', unit: 'host', ref: 'upgrade' }];
  const g = scenario(p);
  let s = effects(g.state, [{ kind: 'defeat-units', filter: { controller: 'friendly' } }]);
  expect(leader(s).zone).toBe('base');
  resume(
    s,
    choose(s, i => i.kind === 'target' && i.card === g.refs.upgrade),
  );
  s = target(s, g.refs.upgrade!);
  expect(s.cards[g.refs.upgrade!]!.zone).toBe('hand');
});
test('Gar numeric aura remains on a blanked unit but its granted return ability is lost', () => {
  const p = board(gar, true);
  p.players[0].ground = [{ card: ids.marine, ref: 'host' }];
  p.attachments = [{ card: 'academy-training', unit: 'host', ref: 'upgrade' }];
  const g = scenario(p);
  let s = effects(g.state, [
    {
      kind: 'modify-units',
      filter: { controller: 'friendly', otherThan: 'source' },
      operation: { kind: 'modify', power: 0, hp: 0, loseAbilities: true, duration: 'phase' },
    },
  ]);
  expect(unitStats(s, s.cards[g.refs.host!]!).power).toBe(6);
  s = effects(s, [
    { kind: 'defeat-units', filter: { controller: 'friendly', otherThan: 'source' } },
  ]);
  expect(s.execution.decision!.kind).toBe('action');
  expect(s.cards[g.refs.upgrade!]!.zone).toBe('discard');
});
test('Gar departure metadata rejects invented attachments and repeated references', () => {
  const g = garDefeat();
  for (const kind of ['duplicate', 'wrong-host']) {
    const invalid = structuredClone(g.state);
    const departure = invalid.departedUnits.find(d => d.reference.instanceId === g.refs.host)!;
    if (kind === 'duplicate') departure.upgrades.push(departure.upgrades[0]!);
    else departure.upgrades[0] = structuredClone(leader(invalid));
    expect(() => decodeState(encodeState(invalid))).toThrow();
  }
});
for (const deployed of [false, true])
  test(`Enfys cannot repeat a second attack after spending her face limit (${deployed})`, () => {
    const p = board(enfys, deployed);
    p.players[0].ground = [
      { card: 'cloud-rider-veteran', ref: 'one' },
      { card: 'cloud-rider-veteran', ref: 'two' },
    ];
    const g = scenario(p);
    let s = target(attack(g.state, g.refs.one!), g.state.players.bob!.base);
    s = step(s, 'accept-effect');
    s = target(s, s.players.bob!.base);
    s = step(s, 'pass');
    s = target(attack(s, g.refs.two!), s.players.bob!.base);
    expect(s.execution.decision!.kind).toBe('action');
    expect(s.cards[s.players.bob!.base]!.damage).toBe(8);
  });
test('Declining Enfys preserves the unit limit for a later attack', () => {
  const p = board(enfys, true);
  p.players[0].ground = [
    { card: 'cloud-rider-veteran', ref: 'one' },
    { card: 'cloud-rider-veteran', ref: 'two' },
  ];
  const g = scenario(p);
  let s = target(attack(g.state, g.refs.one!), g.state.players.bob!.base);
  s = step(s, 'decline-effect');
  expect(s.roundHistory.triggerUses).toHaveLength(0);
  s = step(s, 'pass');
  s = target(attack(s, g.refs.two!), s.players.bob!.base);
  s = step(s, 'accept-effect');
  s = target(s, s.players.bob!.base);
  expect(s.roundHistory.triggerUses).toHaveLength(1);
  expect(s.cards[s.players.bob!.base]!.damage).toBe(8);
});
test('Enfys can repeat again in the next round', () => {
  const p = board(enfys, true);
  p.players[0].ground = [{ card: 'cloud-rider-veteran', ref: 'one' }];
  const g = scenario(p);
  let s = target(attack(g.state, g.refs.one!), g.state.players.bob!.base);
  s = target(step(s, 'accept-effect'), s.players.bob!.base);
  while (s.round === 1 || s.execution.decision!.kind === 'resource')
    s = step(s, s.execution.decision!.kind === 'resource' ? 'resource' : 'pass', []);
  s = target(attack(s, g.refs.one!), s.players.bob!.base);
  resume(s, choose(s, 'accept-effect'));
  s = target(step(s, 'accept-effect'), s.players.bob!.base);
  expect(s.cards[s.players.bob!.base]!.damage).toBe(10);
});
for (const count of [1, 2])
  test(`Enfys front pays its complete cost with Credits (${count})`, () => {
    const p = board(enfys);
    p.players[0].resources!.forEach(c => (c.exhausted = true));
    p.players[0].credits = Array.from({ length: count }, (_, n) => `credit-${n}`);
    p.players[0].ground = [{ card: 'cloud-rider-veteran', ref: 'one' }];
    const g = scenario(p);
    let s = target(attack(g.state, g.refs.one!), g.state.players.bob!.base);
    if (count === 2) {
      s = step(s, 'accept-effect');
      const selected = p.players[0].credits!.map(k => g.refs[k]!);
      resume(s, choose(s, 'accept-effect', selected));
      s = step(s, 'accept-effect', selected);
      s = target(s, s.players.bob!.base);
      expect(selected.map(id => s.cards[id]!.zone)).toEqual(['set-aside', 'set-aside']);
    }
    expect(leader(s).exhausted).toBe(count === 2);
    expect(s.execution.decision!.kind).toBe('action');
  });
test('Declining an optional original On Attack ability does not trigger Enfys', () => {
  const p = board(enfys, true);
  p.players[0].ground = [{ card: 'dryden-vos--i-get-all-worked-up', ref: 'dryden' }];
  const g = scenario(p);
  const s = step(attack(g.state, g.refs.dryden!), 'decline-effect');
  expect(s.usedAttackAbilities).toHaveLength(0);
  expect(s.execution.decision!.kind).toBe('action');
});
test('Enfys repeats a Support-borrowed On Attack ability with the attacking copy as its source', () => {
  const p = board(enfys, true);
  p.players[0].ground = [
    { card: ids.marine, ref: 'one' },
    { card: ids.marine, ref: 'other' },
  ];
  p.players[0].hand = [{ card: 'migs-mayfeld--how-about-a-toast-', ref: 'migs' }];
  p.players[1].ground = [{ card: ids.consular, ref: 'defender' }];
  const g = scenario(p);
  let s = step(g.state, 'play');
  s = attack(s, g.refs.one!, g.refs.defender!);
  expect(s.cards[g.refs.defender!]!.damage).toBe(1);
  resume(s, choose(s, 'accept-effect'));
  s = step(s, 'accept-effect');
  expect(s.cards[g.refs.defender!]!.damage).toBe(5);
  expect(s.usedAttackAbilities[0]!.source.instanceId).toBe(g.refs.one!);
  expect(s.usedAttackAbilities[0]!.abilities.some(o => o.card.instanceId === g.refs.migs)).toBe(
    true,
  );
});
test('Gar cannot return Luke when his upgrade defeat is replaced by entering as a unit', () => {
  const g = garDefeat('luke-skywalker--you-still-with-me-');
  let s = g.state;
  expect(s.execution.frames[0]!.kind).toBe('upgrade-defeat');
  resume(s, choose(s, 'accept-effect'));
  s = step(s, 'accept-effect');
  expect(s.cards[g.refs.upgrade!]!.zone).toBe('ground');
  expect(s.execution.decision!.kind).toBe('action');
});
test('Gar can return Luke if his controller declines the upgrade defeat replacement', () => {
  const g = garDefeat('luke-skywalker--you-still-with-me-');
  let s = step(g.state, 'decline-effect');
  resume(
    s,
    choose(s, i => i.kind === 'target' && i.card === g.refs.upgrade),
  );
  s = target(s, g.refs.upgrade!);
  expect(s.cards[g.refs.upgrade!]!.zone).toBe('hand');
});
test('Gar returns only the selected duplicate among upgrades on the defeated unit', () => {
  const p = board(gar, true);
  p.players[0].ground = [
    { card: ids.marine, ref: 'one' },
    { card: ids.marine, ref: 'two' },
  ];
  p.attachments = [
    { card: 'academy-training', unit: 'one', ref: 'attached' },
    { card: 'academy-training', unit: 'two', ref: 'other' },
  ];
  const g = scenario(p);
  let s = effects(g.state, [
    {
      kind: 'select-unit',
      filter: { controller: 'friendly', otherThan: 'source' },
      bind: 'chosen',
      optional: false,
      effects: [{ kind: 'on-unit', target: 'chosen', operation: { kind: 'defeat' } }],
    },
  ]);
  s = target(s, g.refs.one!);
  expect(
    s.execution.decision!.options.some(
      o => o.intent.kind === 'target' && o.intent.card === g.refs.other,
    ),
  ).toBe(false);
  s = target(s, g.refs.attached!);
  expect(s.cards[g.refs.attached!]!.zone).toBe('hand');
  expect(s.cards[g.refs.other!]!.attachedTo!.instanceId).toBe(g.refs.two!);
});
test('Gar grants the return to his own upgraded unit face', () => {
  const p = board(gar, true);
  p.players[0].leader.ref = 'gar';
  p.attachments = [{ card: 'academy-training', unit: 'gar', ref: 'upgrade' }];
  const g = scenario(p);
  let s = effects(g.state, [{ kind: 'defeat-units', filter: { controller: 'friendly' } }]);
  resume(
    s,
    choose(s, i => i.kind === 'target' && i.card === g.refs.upgrade),
  );
  s = target(s, g.refs.upgrade!);
  expect(leader(s).zone).toBe('base');
  expect(s.cards[g.refs.upgrade!]!.zone).toBe('hand');
});
test('Enfys recovery rejects a forged remembered ability index or controller', () => {
  const p = board(enfys);
  p.players[0].ground = [{ card: 'cloud-rider-veteran', ref: 'one' }];
  const g = scenario(p);
  const s = target(attack(g.state, g.refs.one!), g.state.players.bob!.base);
  const invalid = structuredClone(s);
  const f = invalid.execution.frames[0]!;
  if (f.kind !== 'effect') throw Error();
  f.values!['used-attack'] = 999;
  expect(() => decodeState(encodeState(invalid))).toThrow();
  const other = structuredClone(s);
  other.usedAttackAbilities[0]!.playerId = 'bob';
  expect(() => decodeState(encodeState(other))).toThrow();
});

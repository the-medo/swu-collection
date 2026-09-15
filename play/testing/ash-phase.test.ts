import { expect, test } from 'bun:test';
import { advance } from '../engine/advance.ts';
import { attachedUpgrades, unitStats } from '../engine/attachments.ts';
import { effectiveAbilities } from '../engine/effective-abilities.ts';
import { encodeState, decodeState } from '../engine/checkpoint.ts';
import { playCost } from '../engine/state.ts';
import type { GameState, Intent, EngineInput } from '../engine/model.ts';
import { choose, ids, position } from './helpers.ts';
import { scenario } from './scenario.ts';
const raw = (
  s: GameState,
  p: Intent['kind'] | ((i: Intent) => boolean),
  selection: string[] = [],
) => advance(s, choose(s, p, selection)).state;
function ordered(s: GameState): GameState {
  while (s.execution.decision?.kind === 'trigger') s = raw(s, 'trigger');
  return s;
}
const step = (
  s: GameState,
  p: Intent['kind'] | ((i: Intent) => boolean),
  selection: string[] = [],
) => ordered(raw(s, p, selection));
const target = (s: GameState, card: string) => step(s, i => i.kind === 'target' && i.card === card);
const attack = (s: GameState, attacker: string, defender: string) =>
  step(s, i => i.kind === 'attack' && i.attacker === attacker && i.defender === defender);
const tokens = (s: GameState, id: string) =>
  attachedUpgrades(s, s.cards[id]!).filter(c => c.cardId === 'advantage').length;
const ready = (s: GameState) =>
  s.players.alice!.resources.filter(id => !s.cards[id]!.exhausted).length;
const created = (s: GameState) =>
  Object.values(s.cards).filter(
    c => c.zone === 'ground' && c.controller === 'alice' && c.cardId === 'mandalorian',
  ).length;
function board(card: string) {
  const p = position();
  p.players[0].hand = [{ card, ref: 'source' }];
  p.players[0].resources = Array.from({ length: 20 }, () => ({ card: ids.marine }));
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
  expect(JSON.parse(child.stdout.toString())).toEqual(advance(s, input));
}
test('Baylan notices enemy base damage even when that enemy damaged their own base', () => {
  const p = board('baylan-skoll--fallen-jedi');
  p.activePlayer = 'bob';
  const { state, refs } = scenario(p);
  let s = step(
    state,
    i =>
      i.kind === 'use-ability' &&
      i.card === state.players.bob!.leader &&
      i.abilityId === 'damage-bases',
  );
  expect(s.phaseHistory.basesDamaged).toContain('bob');
  s = step(s, 'play');
  s = target(s, refs.source!);
  expect(tokens(s, refs.source!)).toBe(1);
});
test('Baylan can exhaust after a friendly Shield was defeated, without needing enemy base damage', () => {
  const p = board('baylan-skoll--fallen-jedi');
  p.activePlayer = 'bob';
  p.players[0].ground = [{ card: ids.consular, ref: 'ally' }];
  p.players[1].ground = [
    { card: ids.marine, ref: 'attacker' },
    { card: ids.consular, ref: 'target' },
  ];
  p.attachments = [{ card: 'shield', unit: 'ally' }];
  const { state, refs } = scenario(p);
  let s = attack(state, refs.attacker!, refs.ally!);
  expect(s.phaseHistory.upgradesDefeated).toEqual(['alice']);
  s = step(s, 'play');
  expect(tokens(s, refs.source!)).toBe(0);
  s = target(s, refs.target!);
  expect(s.cards[refs.target!]!.exhausted).toBe(true);
});
test('Baylan has neither reward before its phase conditions have happened', () => {
  const { state, refs } = scenario(board('baylan-skoll--fallen-jedi'));
  const s = step(state, 'play');
  expect(s.execution.decision!.kind).toBe('action');
  expect(tokens(s, refs.source!)).toBe(0);
});
function defeatPosition(event = 'fateful-goodbye', leader = false) {
  const p = board(event);
  p.activePlayer = 'bob';
  p.players[0].ground = [{ card: 'captain-pellaeon--plotting-from-the-shadows', ref: 'captain' }];
  if (leader) p.players[0].leader.deployedAs = 'unit';
  else p.players[0].ground.push({ card: ids.trooper, ref: 'victim' });
  p.players[1].ground = [{ card: 'wookiee-chieftain', ref: 'attacker' }];
  p.attachments = [{ card: 'experience', unit: 'attacker', owner: 'bob' }];
  return p;
}
for (const leader of [false, true])
  test(`Fateful Goodbye distributes ${leader ? 5 : 3} tokens only among friendly units after a departure`, () => {
    const { state, refs } = scenario(defeatPosition('fateful-goodbye', leader));
    let s = attack(state, refs.attacker!, leader ? state.players.alice!.leader : refs.victim!);
    expect(s.phaseHistory.left[0]!.leaderUnit).toBe(leader);
    expect(effectiveAbilities(s, s.cards[refs.captain!]!).raid ?? 0).toBe(leader ? 3 : 0);
    s = step(s, 'play');
    const amount = leader ? 5 : 3;
    expect(s.execution.decision!.selection!.min).toBe(amount);
    expect(s.execution.decision!.selection!.max).toBe(amount);
    expect(s.execution.decision!.selection!.cards).not.toContain(refs.attacker!);
    resume(s, choose(s, 'accept-effect', Array(amount).fill(refs.captain!)));
    s = step(s, 'accept-effect', Array(amount).fill(refs.captain!));
    expect(tokens(s, refs.captain!)).toBe(amount);
  });
test('Fateful Goodbye does nothing before any friendly unit leaves', () => {
  const { state } = scenario(board('fateful-goodbye'));
  expect(step(state, 'play').execution.decision!.kind).toBe('action');
});
test('Pellaeon gains Raid only from a defeated leader, and the recorded leader role survives losing Darksaber', () => {
  const p = position();
  p.activePlayer = 'bob';
  p.players[0].ground = [
    { card: 'captain-pellaeon--plotting-from-the-shadows', ref: 'captain' },
    { card: 'gar-saxon--coveting-power', ref: 'victim', damage: 3 },
  ];
  p.players[1].ground = [{ card: ids.consular, ref: 'attacker' }];
  p.attachments = [{ card: 'the-darksaber--icon-of-leadership', unit: 'victim' }];
  const { state, refs } = scenario(p);
  let s = attack(state, refs.attacker!, refs.victim!);
  expect(s.phaseHistory.defeated.find(c => c.instanceId === refs.victim)!.leaderUnit).toBe(true);
  expect(effectiveAbilities(s, s.cards[refs.captain!]!).raid).toBe(3);
  s = attack(s, refs.captain!, s.players.bob!.base);
  expect(s.cards[s.players.bob!.base]!.damage).toBe(5);
});
test('Galvanized Leap distinguishes damage this phase from old damage and Shield prevention', () => {
  for (const shield of [false, true]) {
    const p = board('galvanized-leap');
    p.activePlayer = 'bob';
    p.players[0].ground = [
      { card: ids.consular, ref: 'target', exhausted: true },
      { card: ids.consular, ref: 'old', damage: 1, exhausted: true },
    ];
    p.players[1].ground = [{ card: ids.marine, ref: 'attacker' }];
    if (shield) p.attachments = [{ card: 'shield', unit: 'target' }];
    const { state, refs } = scenario(p);
    let s = attack(state, refs.attacker!, refs.target!);
    s = step(s, 'play');
    expect(
      s.execution.decision!.options.some(
        o => o.intent.kind === 'target' && o.intent.card === refs.old,
      ),
    ).toBe(false);
    if (shield) expect(s.cards[refs.target!]!.exhausted).toBe(true);
    else {
      resume(
        s,
        choose(s, i => i.kind === 'target' && i.card === refs.target),
      );
      s = target(s, refs.target!);
      expect(s.cards[refs.target!]!.exhausted).toBe(false);
    }
  }
});
test('Greef pays his action cost even with no prior base attack; an actual attack enables the token', () => {
  for (const attacked of [false, true]) {
    const p = position();
    p.activePlayer = attacked ? 'bob' : 'alice';
    p.players[0].ground = [{ card: 'greef-karga--introductions-are-in-order', ref: 'greef' }];
    p.players[0].resources = Array.from({ length: 2 }, () => ({ card: ids.marine }));
    p.players[1].space = [{ card: ids.fighter, ref: 'attacker' }];
    const { state, refs } = scenario(p);
    let s = attacked ? attack(state, refs.attacker!, state.players.alice!.base) : state;
    s = step(s, i => i.kind === 'use-ability' && i.card === refs.greef);
    expect(created(s)).toBe(attacked ? 1 : 0);
    expect(ready(s)).toBe(1);
    expect(s.cards[refs.greef!]!.exhausted).toBe(true);
  }
});
for (const arena of ['ground', 'space'] as const)
  test(`Kachirho Militia reacts only to enemy ground attacks on its base (${arena})`, () => {
    const p = position();
    p.activePlayer = 'bob';
    p.players[0].ground = [{ card: 'kachirho-militia', ref: 'militia', exhausted: true }];
    p.players[1][arena] = [
      { card: arena === 'ground' ? ids.consular : ids.fighter, ref: 'attacker' },
    ];
    const { state, refs } = scenario(p);
    const s = attack(state, refs.attacker!, state.players.alice!.base);
    expect(s.cards[refs.militia!]!.exhausted).toBe(arena === 'space');
  });
test('Kachirho cannot ready a second time in the round', () => {
  const p = position();
  p.activePlayer = 'bob';
  p.players[0].ground = [{ card: 'kachirho-militia', ref: 'militia', exhausted: true }];
  p.players[1].ground = [
    { card: ids.marine, ref: 'first' },
    { card: ids.marine, ref: 'second' },
  ];
  const { state, refs } = scenario(p);
  let s = attack(state, refs.first!, state.players.alice!.base);
  s = attack(s, refs.militia!, s.players.bob!.base);
  s = attack(s, refs.second!, s.players.alice!.base);
  expect(s.cards[refs.militia!]!.exhausted).toBe(true);
});
for (const pay of [false, true])
  test(`The Conflict Within taxes a readied unit and exhausts it if payment is declined (${pay})`, () => {
    const p = board('galvanized-leap');
    p.activePlayer = 'bob';
    p.players[0].ground = [{ card: ids.consular, ref: 'host', exhausted: true }];
    p.players[1].ground = [{ card: ids.marine, ref: 'attacker' }];
    p.attachments = [{ card: 'the-conflict-within', unit: 'host', owner: 'bob' }];
    const g = scenario(p);
    let s = attack(g.state, g.refs.attacker!, g.refs.host!);
    s = target(step(s, 'play'), g.refs.host!);
    expect(s.cards[g.refs.host!]!.exhausted).toBe(false);
    const before = ready(s);
    const input = choose(s, pay ? 'accept-effect' : 'decline-effect');
    resume(s, input);
    s = ordered(advance(s, input).state);
    expect(ready(s)).toBe(before - (pay ? 3 : 0));
    expect(s.cards[g.refs.host!]!.exhausted).toBe(!pay);
  });
test('Regroup readies resources before Conflict payments, and an unaffordable payment exhausts its unit', () => {
  const p = position();
  p.players[0].ground = [
    { card: ids.consular, ref: 'one', exhausted: true },
    { card: ids.consular, ref: 'two', exhausted: true },
  ];
  p.players[0].resources = Array.from({ length: 3 }, () => ({ card: ids.marine, exhausted: true }));
  p.attachments = [
    { card: 'the-conflict-within', unit: 'one', owner: 'bob' },
    { card: 'the-conflict-within', unit: 'two', owner: 'bob' },
  ];
  const { state, refs } = scenario(p);
  let s = step(step(state, 'pass'), 'pass');
  while (s.execution.decision!.kind === 'resource') s = step(s, 'resource', []);
  expect(s.phase).toBe('regroup');
  expect(ready(s)).toBe(3);
  resume(s, choose(s, 'accept-effect'));
  s = step(s, 'accept-effect');
  expect(ready(s)).toBe(0);
  expect([s.cards[refs.one!]!.exhausted, s.cards[refs.two!]!.exhausted].sort()).toEqual([
    false,
    true,
  ]);
  expect(s.phase).toBe('action');
});
test('Pit Droid Team discounts only the first upgrade on another friendly host in each phase', () => {
  const p = board('bokken-saber');
  p.players[0].hand!.push({ card: 'bokken-saber', ref: 'second' });
  p.players[0].ground = [
    { card: 'pit-droid-team', ref: 'pit' },
    { card: ids.consular, ref: 'host' },
  ];
  p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
  const { state, refs } = scenario(p);
  const original = state.cards[refs.source!]!;
  const normal = playCost(state, original, 0, undefined, state.cards[refs.pit!]!);
  expect(playCost(state, original, 0, undefined, state.cards[refs.host!]!)).toBe(normal - 1);
  expect(playCost(state, original, 0, undefined, state.cards[refs.enemy!]!)).toBe(normal);
  let s = step(state, i => i.kind === 'play' && i.card === refs.source && i.target === refs.host);
  s = step(s, 'pass');
  expect(playCost(s, s.cards[refs.second!]!, 0, undefined, s.cards[refs.host!]!)).toBe(normal);
  resume(
    s,
    choose(s, i => i.kind === 'play' && i.card === refs.second && i.target === refs.host),
  );
});
test('Playing an upgrade on Pit Droid Team itself does not consume its discount', () => {
  const p = board('bokken-saber');
  p.players[0].hand!.push({ card: 'bokken-saber', ref: 'second' });
  p.players[0].ground = [
    { card: 'pit-droid-team', ref: 'pit' },
    { card: ids.consular, ref: 'host' },
  ];
  const { state, refs } = scenario(p);
  const expected = playCost(
    state,
    state.cards[refs.source!]!,
    0,
    undefined,
    state.cards[refs.host!]!,
  );
  let s = step(state, i => i.kind === 'play' && i.card === refs.source && i.target === refs.pit);
  s = step(s, 'pass');
  expect(playCost(s, s.cards[refs.second!]!, 0, undefined, s.cards[refs.host!]!)).toBe(expected);
});
test('Pit Droid Team’s discount resets with the next phase', () => {
  const p = board('bokken-saber');
  p.players[0].hand!.push({ card: 'bokken-saber', ref: 'next' });
  p.players[0].ground = [
    { card: 'pit-droid-team', ref: 'pit' },
    { card: ids.consular, ref: 'host' },
  ];
  const { state, refs } = scenario(p);
  const expected = playCost(
    state,
    state.cards[refs.next!]!,
    0,
    undefined,
    state.cards[refs.host!]!,
  );
  let s = step(state, i => i.kind === 'play' && i.card === refs.source && i.target === refs.host);
  expect(playCost(s, s.cards[refs.next!]!, 0, undefined, s.cards[refs.host!]!)).toBe(expected + 1);
  while (s.round === 1)
    s = step(s, s.execution.decision!.kind === 'resource' ? 'resource' : 'pass', []);
  expect(playCost(s, s.cards[refs.next!]!, 0, undefined, s.cards[refs.host!]!)).toBe(expected);
});
test('Phase damage history rejects an invented or duplicate incarnation', () => {
  const p = board('galvanized-leap');
  p.activePlayer = 'bob';
  p.players[0].ground = [{ card: ids.consular, ref: 'host', exhausted: true }];
  p.players[1].ground = [{ card: ids.marine, ref: 'attacker' }];
  const { state, refs } = scenario(p);
  const s = attack(state, refs.attacker!, refs.host!);
  const duplicate = structuredClone(s);
  duplicate.phaseHistory.damagedUnits.push(duplicate.phaseHistory.damagedUnits[0]!);
  expect(() => decodeState(encodeState(duplicate))).toThrow('Invalid unit damage history');
  const unknown = structuredClone(s);
  unknown.phaseHistory.damagedUnits[0]!.incarnation = 999;
  expect(() => decodeState(encodeState(unknown))).toThrow('Invalid phase reference history');
});

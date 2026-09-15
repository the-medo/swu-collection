import { expect, test } from 'bun:test';
import { advance } from '../engine/advance.ts';
import { attachedUpgrades, unitStats } from '../engine/attachments.ts';
import { encodeState, decodeState } from '../engine/checkpoint.ts';
import { effectSchema, type GameState, type Intent } from '../engine/model.ts';
import { scenario } from './scenario.ts';
import { choose, ids, position } from './helpers.ts';

const blade = 'blade-of-talzin--a-gift-of-shadows';
const axe = 'axe-woves--accomplished-warrior';
const purrgil = 'heroic-purrgil';
const liberty = 'liberty--draw-their-fire-';
const pong = 'pong-krell--it-s-treason--then';
const resources = (n = 20) => Array.from({ length: n }, () => ({ card: ids.marine }));
const step = (
  s: GameState,
  i: Intent['kind'] | ((i: Intent) => boolean),
  selections: string[] = [],
) => advance(s, choose(s, i, selections)).state;
const target = (s: GameState, card: string) => step(s, i => i.kind === 'target' && i.card === card);
const attack = (s: GameState, attacker: string, defender: string) =>
  step(s, i => i.kind === 'attack' && i.attacker === attacker && i.defender === defender);
const upgrades = (s: GameState, id: string) => attachedUpgrades(s, s.cards[id]!).map(c => c.cardId);
function resume(s: GameState, input: ReturnType<typeof choose>) {
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
function playFixture(card: string) {
  const p = position();
  p.players[0].hand = [{ card, ref: 'played' }];
  p.players[0].resources = resources();
  return p;
}
function finishTriggers(s: GameState) {
  for (let n = 0; n < 10 && s.execution.decision?.kind === 'trigger'; n++) s = step(s, 'trigger');
  return s;
}

test('Blade of Talzin returns after its friendly Night host leaves, using the original host traits and controller', () => {
  for (const card of ['morgan-elsbeth--life-abandoned', ids.consular]) {
    const p = playFixture('get-lost');
    p.players[0].ground = [{ card, ref: 'host' }];
    p.attachments = [{ card: blade, unit: 'host', ref: 'blade' }];
    const { state, refs } = scenario(p);
    let after = finishTriggers(target(step(state, 'play'), refs.host!));
    // Morgan's separate defeated trigger may optionally weaken another unit.
    if (after.execution.decision?.kind === 'effect') after = step(after, 'decline-effect');
    after = finishTriggers(after);
    expect(after.cards[refs.host!]!.zone).toBe('discard');
    expect(after.cards[refs.blade!]!.zone).toBe(card === ids.consular ? 'discard' : 'hand');
  }
});

test('Blade does not return from another player discard or from an enemy Night host', () => {
  for (const stolen of [false, true]) {
    const p = playFixture('get-lost');
    p.players[stolen ? 0 : 1].ground = [{ card: 'morgan-elsbeth--life-abandoned', ref: 'host' }];
    p.attachments = [{ card: blade, unit: 'host', ref: 'blade', owner: stolen ? 'bob' : 'alice' }];
    const { state, refs } = scenario(p);
    if (stolen) state.cards[refs.blade!]!.controller = 'alice';
    let after = finishTriggers(target(step(state, 'play'), refs.host!));
    if (after.execution.decision?.kind === 'effect') after = step(after, 'decline-effect');
    after = finishTriggers(after);
    expect(after.cards[refs.blade!]!.zone).toBe('discard');
  }
});

test('Axe counts every token and ordinary upgrade, and removing a Shield can cause immediate HP defeat', () => {
  const p = playFixture(axe);
  const g = scenario(p);
  const played = step(g.state, 'play');
  expect(upgrades(played, g.refs.played!)).toEqual(['shield']);
  expect(unitStats(played, played.cards[g.refs.played!]!)).toMatchObject({ power: 3, hp: 3 });
  const b = playFixture('open-fire');
  b.players[1].ground = [{ card: axe, ref: 'axe', damage: 2 }];
  b.attachments = [{ card: 'shield', unit: 'axe' }];
  const s = scenario(b);
  const after = target(step(s.state, 'play'), s.refs.axe!);
  expect(after.cards[s.refs.axe!]!.zone).toBe('discard');
  const c = position();
  c.players[0].ground = [{ card: axe, ref: 'axe' }];
  c.attachments = [
    { card: 'experience', unit: 'axe' },
    { card: 'preparation', unit: 'axe' },
  ];
  const ready = scenario(c);
  expect(unitStats(ready.state, ready.state.cards[ready.refs.axe!]!)).toMatchObject({
    power: 7,
    hp: 6,
  });
});

test('Heroic Purrgil gains two power only during an Ambush attack, preserved through Shield choice recovery', () => {
  const p = playFixture(purrgil);
  p.players[1].space = [{ card: 'mercenary-fleet', ref: 'defender' }];
  const g = scenario(p);
  const after = target(step(g.state, 'play'), g.refs.defender!);
  expect(after.cards[g.refs.defender!]!.damage).toBe(5);
  p.attachments = [
    { card: 'shield', unit: 'defender' },
    { card: 'shield', unit: 'defender' },
  ];
  const shielded = scenario(p);
  const pending = target(step(shielded.state, 'play'), shielded.refs.defender!);
  expect(pending.attacks.at(-1)!.ambush).toBe(true);
  expect(unitStats(pending, pending.cards[shielded.refs.played!]!).power).toBe(5);
  resume(pending, choose(pending, 'target'));
  const corrupted = structuredClone(pending);
  delete (corrupted.attacks[0] as Partial<(typeof corrupted.attacks)[0]>).ambush;
  expect(() => decodeState(encodeState(corrupted))).toThrow();
  const b = position();
  b.players[0].space = [{ card: purrgil, ref: 'purrgil' }];
  const normal = scenario(b);
  expect(
    attack(normal.state, normal.refs.purrgil!, normal.state.players.bob!.base).cards[
      normal.state.players.bob!.base
    ]!.damage,
  ).toBe(3);
});

test('8D8 excludes itself, spends exhaustion, and still searches after a Shield replaces friendly damage', () => {
  const p = position();
  p.players[0].ground = [
    { card: '8d8--daimyo-s-majordomo', ref: 'droid' },
    { card: ids.consular, ref: 'ally' },
  ];
  p.attachments = [{ card: 'shield', unit: 'ally' }];
  const g = scenario(p);
  const choice = step(g.state, i => i.kind === 'use-ability' && i.abilityId === 'find-unit');
  expect(choice.execution.decision!.options.map(o => o.intent)).toEqual([
    { kind: 'target', card: g.refs.ally! },
  ]);
  const pending = target(choice, g.refs.ally!);
  expect(pending.cards[g.refs.droid!]!.exhausted).toBe(true);
  expect(pending.cards[g.refs.ally!]!.damage).toBe(0);
  expect(pending.execution.frames[0]!.kind).toBe('search');
  expect(pending.execution.decision!.selection!.cards).toHaveLength(5);
  resume(pending, choose(pending, 'search', [pending.execution.decision!.selection!.cards[0]!]));
});

test('Liberty returns all upgrades costing at most four, including enemy-owned upgrades and tokens', () => {
  const p = playFixture(liberty);
  p.players[1].ground = [{ card: 'morgan-elsbeth--life-abandoned', ref: 'host', exhausted: true }];
  p.attachments = [
    { card: 'preparation', unit: 'host', owner: 'alice', ref: 'own' },
    { card: blade, unit: 'host', owner: 'bob', ref: 'enemy' },
    { card: 'shield', unit: 'host', ref: 'shield' },
  ];
  const g = scenario(p);
  const pending = step(g.state, 'play');
  resume(
    pending,
    choose(pending, i => i.kind === 'target' && i.card === g.refs.host),
  );
  const after = target(pending, g.refs.host!);
  expect(after.execution.decision!.playerId).toBe('bob');
  expect(after.cards[g.refs.own!]!.zone).toBe('hand');
  expect(after.players.alice!.hand).toContain(g.refs.own!);
  expect(after.players.bob!.hand).toContain(g.refs.enemy!);
  expect(after.cards[g.refs.shield!]!.zone).toBe('set-aside');
  expect(upgrades(after, g.refs.host!)).toEqual([]);
});

test('R5 lends upgrade removal to a Support attacker and removes every defender upgrade before damage', () => {
  const p = playFixture('r5-d4--built-for-adventure');
  p.players[0].ground = [{ card: ids.consular, ref: 'holder' }];
  p.players[1].ground = [{ card: ids.consular, ref: 'defender' }];
  p.attachments = [
    { card: 'shield', unit: 'defender' },
    { card: 'shield', unit: 'defender' },
    { card: 'durasteel-plating', unit: 'defender' },
  ];
  const g = scenario(p);
  const pending = step(g.state, 'play');
  const input = choose(
    pending,
    i => i.kind === 'attack' && i.attacker === g.refs.holder && i.defender === g.refs.defender,
  );
  resume(pending, input);
  const after = advance(pending, input).state;
  expect(upgrades(after, g.refs.defender!)).toEqual([]);
  expect(after.cards[g.refs.defender!]!.damage).toBe(3);
});

test('Pong uses his postcombat Grit power against remaining HP and requires surviving the attack', () => {
  const p = position();
  p.players[0].ground = [{ card: pong, ref: 'pong', damage: 3 }];
  p.players[1].ground = [
    { card: ids.consular, ref: 'defender' },
    { card: ids.consular, ref: 'other' },
  ];
  const g = scenario(p);
  const pending = attack(g.state, g.refs.pong!, g.refs.defender!);
  expect(unitStats(pending, pending.cards[g.refs.pong!]!).power).toBe(8);
  expect(
    pending.execution.decision!.options.some(
      o => o.intent.kind === 'target' && o.intent.card === g.refs.other,
    ),
  ).toBe(true);
  resume(
    pending,
    choose(pending, i => i.kind === 'target' && i.card === g.refs.other),
  );
  const after = target(pending, g.refs.other!);
  expect(after.cards[g.refs.other!]!.zone).toBe('discard');
  p.players[0].ground![0]!.damage = 8;
  const lethal = scenario(p);
  const ended = attack(lethal.state, lethal.refs.pong!, lethal.refs.defender!);
  expect(ended.cards[lethal.refs.pong!]!.zone).toBe('discard');
  expect(ended.execution.decision!.playerId).toBe('bob');
});

test('The Desolation of Hoth chooses zero, one or two distinct eligible enemies before simultaneous defeat', () => {
  const p = playFixture('the-desolation-of-hoth');
  p.players[0].ground = [{ card: ids.marine, ref: 'own' }];
  p.players[1].ground = [
    { card: ids.marine, ref: 'first' },
    { card: ids.marine, ref: 'second' },
    { card: ids.consular, ref: 'expensive' },
  ];
  const g = scenario(p);
  const first = step(g.state, 'play');
  expect(first.execution.decision!.options.map(o => o.intent)).toEqual([
    { kind: 'target', card: g.refs.first! },
    { kind: 'target', card: g.refs.second! },
    { kind: 'decline-effect' },
  ]);
  expect(step(first, 'decline-effect').cards[g.refs.first!]!.zone).toBe('ground');
  const second = target(first, g.refs.first!);
  expect(second.cards[g.refs.first!]!.zone).toBe('ground');
  expect(second.execution.decision!.options.map(o => o.intent)).toEqual([
    { kind: 'target', card: g.refs.second! },
    { kind: 'decline-effect' },
  ]);
  resume(second, choose(second, 'target'));
  const both = target(second, g.refs.second!);
  expect(both.cards[g.refs.first!]!.zone).toBe('discard');
  expect(both.cards[g.refs.second!]!.zone).toBe('discard');
  const one = step(second, 'decline-effect');
  expect(one.cards[g.refs.first!]!.zone).toBe('discard');
  expect(one.cards[g.refs.second!]!.zone).toBe('ground');
});

test('automatic all-upgrade effects cannot declare a conflicting finite maximum', () => {
  expect(() =>
    effectSchema.parse({
      kind: 'select-upgrades',
      filter: {},
      min: 'all',
      max: 1,
      bind: 'upgrades',
      effects: [],
    }),
  ).toThrow();
});

test('Liberty uses printed Pilot cost and keeps upgrades costing more than four', () => {
  const p = playFixture(liberty);
  p.players[1].space = [{ card: 'millennium-falcon--get-out-and-push', ref: 'host' }];
  p.attachments = [
    { card: 'han-solo--has-his-moments', unit: 'host', ref: 'pilot' },
    { card: 'independent-smuggler', unit: 'host', ref: 'cheap' },
    { card: 'craving-power', unit: 'host', ref: 'expensive' },
  ];
  const g = scenario(p);
  const after = target(step(g.state, 'play'), g.refs.host!);
  expect(after.cards[g.refs.host!]!.exhausted).toBe(true);
  expect(upgrades(after, g.refs.host!)).toEqual(['han-solo--has-his-moments', 'craving-power']);
  expect(after.players.bob!.hand).toContain(g.refs.cheap!);
});

test('Pong cannot defeat a unit whose remaining HP equals his power', () => {
  const p = position();
  p.players[0].ground = [{ card: pong, ref: 'pong' }];
  p.players[1].ground = [
    { card: 'storm-raider', ref: 'equal' },
    { card: ids.marine, ref: 'low', damage: 2 },
  ];
  const g = scenario(p);
  const pending = attack(g.state, g.refs.pong!, g.state.players.bob!.base);
  expect(pending.execution.decision!.options.map(o => o.intent)).toEqual([
    { kind: 'target', card: g.refs.low! },
    { kind: 'decline-effect' },
  ]);
});

test('Blade returns when its Night host is bounced, without healing or replaying that host', () => {
  const p = playFixture('far-far-away');
  p.players[0].ground = [{ card: 'morgan-elsbeth--life-abandoned', ref: 'host', damage: 2 }];
  p.attachments = [{ card: blade, unit: 'host', ref: 'blade' }];
  const g = scenario(p);
  const after = target(step(g.state, 'play'), g.refs.host!);
  expect(after.cards[g.refs.host!]!.zone).toBe('hand');
  expect(after.cards[g.refs.blade!]!.zone).toBe('hand');
});

test('R5 attacking a base does not remove unrelated upgrades from either arena', () => {
  const p = position();
  p.players[0].ground = [{ card: 'r5-d4--built-for-adventure', ref: 'r5' }];
  p.players[1].ground = [{ card: ids.consular, ref: 'unit' }];
  p.attachments = [{ card: 'shield', unit: 'unit' }];
  const g = scenario(p);
  const after = attack(g.state, g.refs.r5!, g.state.players.bob!.base);
  expect(upgrades(after, g.refs.unit!)).toEqual(['shield']);
  expect(after.cards[after.players.bob!.base]!.damage).toBe(3);
});

import { expect, test } from 'bun:test';
import { advance } from '../engine/advance.ts';
import { decodeState, encodeState } from '../engine/checkpoint.ts';
import { unitStats } from '../engine/attachments.ts';
import { effectiveAbilities } from '../engine/effective-abilities.ts';
import { modifyUnit } from '../engine/lasting.ts';
import type { GameState, Intent } from '../engine/model.ts';
import { Projector } from '../projection/projector.ts';
import { gameViewSchema } from '../view/parse.ts';
import { scenario } from './scenario.ts';
import { choose, ids, position } from './helpers.ts';
const step = (s: GameState, i: Intent['kind'] | ((i: Intent) => boolean)) =>
  advance(s, choose(s, i)).state;
const target = (s: GameState, id: string) => step(s, i => i.kind === 'target' && i.card === id);
const attack = (s: GameState, a: string, d = s.players.bob!.base) =>
  step(s, i => i.kind === 'attack' && i.attacker === a && i.defender === d);
const mode = (s: GameState, m: string) => step(s, i => i.kind === 'choose-mode' && i.mode === m);
const stranger = 'the-stranger--no-survivors',
  babu = 'babu-frik--heyyy-',
  vents = 'flash-the-vents',
  out = 'one-way-out';
function board(event = vents, attacker: string = ids.marine, defender: string = ids.consular) {
  const p = position();
  p.players[0].resources = Array.from({ length: 20 }, () => ({ card: ids.marine }));
  p.players[0].hand = [{ card: event, ref: 'event' }];
  p.players[0].ground = [{ card: attacker, ref: 'attacker' }];
  p.players[1].ground = [{ card: defender, ref: 'defender' }];
  return p;
}
function modified(g: ReturnType<typeof scenario>) {
  return target(step(g.state, 'play'), g.refs.attacker!);
}
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

test('Flash the Vents adds power and Overwhelm, then defeats the exact attacker after base damage', () => {
  const g = scenario(board(vents, ids.consular, ids.marine));
  const s = attack(modified(g), g.refs.attacker!, g.refs.defender!);
  expect(s.cards[s.players.bob!.base]!.damage).toBe(2);
  expect(s.cards[g.refs.attacker!]!.zone).toBe('discard');
  expect(s.cards[g.refs.defender!]!.zone).toBe('discard');
  expect(s.facts.findIndex(f => f.type === 'attack-ended')).toBeLessThan(
    s.facts.findLastIndex(f => f.type === 'defeated'),
  );
});
test('Flash ignores earlier base damage by that unit and expires its bonus without this attack damaging a base', () => {
  const g = scenario(board(vents, ids.consular, ids.consular));
  g.state.phaseHistory.baseDamageSources.push({ ...g.state.cards[g.refs.attacker!]! });
  const s = attack(modified(g), g.refs.attacker!, g.refs.defender!);
  expect(s.cards[g.refs.attacker!]!.zone).toBe('ground');
  expect(unitStats(s, s.cards[g.refs.attacker!]!).power).toBe(3);
  expect(s.cards[s.players.bob!.base]!.damage).toBe(0);
});
test('Flash counts Sabine’s ability base damage even when a Shield prevents all combat damage', () => {
  const p = board();
  p.players[0].ground = [];
  p.players[0].leader = {
    card: ids.leader,
    ref: 'attacker',
    deployedAs: 'unit',
    abilityUses: { deploy: 1 },
  };
  p.attachments = [{ card: 'shield', unit: 'defender' }];
  const g = scenario(p);
  const s = attack(modified(g), g.refs.attacker!, g.refs.defender!);
  expect(s.cards[s.players.bob!.base]!.damage).toBe(1);
  expect(s.cards[g.refs.defender!]!.damage).toBe(0);
  expect(s.cards[g.refs.attacker!]!).toMatchObject({
    zone: 'base',
    deployedAs: null,
    exhausted: true,
  });
});
test('Flash lets attack-end triggers return the attacker before its defeat instruction', () => {
  const p = board(vents, ids.consular);
  p.players[0].ground!.push({ card: 'anakin-skywalker--prescient-podracer', ref: 'anakin' });
  const g = scenario(p),
    pending = attack(modified(g), g.refs.attacker!);
  expect(pending.cards[g.refs.attacker!]!.zone).toBe('ground');
  resume(
    pending,
    choose(pending, i => i.kind === 'choose-mode' && i.mode === 'return-attacker'),
  );
  const s = mode(pending, 'return-attacker');
  expect(s.cards[g.refs.attacker!]!.zone).toBe('hand');
  expect(
    s.facts.some(f => f.type === 'defeated' && f.cards.some(c => c.instanceId === g.refs.attacker)),
  ).toBe(false);
});
test('Flash does not defeat its attacker when the entire Overwhelm packet is prevented', () => {
  const p = board(vents, ids.consular, ids.marine);
  p.attachments = [
    { card: 'shield', unit: 'defender', ref: 'one' },
    { card: 'shield', unit: 'defender', ref: 'two' },
  ];
  const g = scenario(p),
    pending = attack(modified(g), g.refs.attacker!, g.refs.defender!);
  resume(
    pending,
    choose(pending, i => i.kind === 'target' && i.card === g.refs.two),
  );
  const s = target(pending, g.refs.two!);
  expect(s.cards[s.players.bob!.base]!.damage).toBe(0);
  expect(s.cards[g.refs.attacker!]!.zone).toBe('ground');
});
test('mandatory modified attacks select only ready friendly units', () => {
  for (const event of [vents, out]) {
    const p = board(event);
    p.players[0].ground![0]!.exhausted = true;
    const g = scenario(p);
    const s = step(g.state, 'play');
    expect(s.execution.decision!.kind).toBe('action');
    expect(s.facts.some(f => f.type === 'attacked')).toBe(false);
  }
});

test('The Stranger may take the defender’s hit first and then use the new Grit power', () => {
  const g = scenario(board(vents, stranger, ids.marine));
  const pending = attack(g.state, g.refs.attacker!, g.refs.defender!);
  expect(pending.execution.frames[0]!.kind).toBe('combat-order');
  expect(pending.execution.decision!.playerId).toBe('alice');
  const view = new Projector(
    pending.gameId,
    { role: 'player', playerId: 'alice' },
    'v'.repeat(32),
  ).project(pending);
  expect(gameViewSchema.safeParse(view).success).toBe(true);
  resume(
    pending,
    choose(pending, i => i.kind === 'choose-mode' && i.mode === 'defender-first'),
  );
  const s = mode(pending, 'defender-first');
  expect(s.cards[g.refs.attacker!]!.damage).toBe(3);
  expect(s.cards[g.refs.defender!]!.zone).toBe('discard');
  expect(s.facts.filter(f => f.type === 'damage').map(f => f.amount)).toEqual([3, 4]);
});
test('The Stranger can retain simultaneous damage and does not receive power from damage dealt simultaneously', () => {
  const g = scenario(board(vents, stranger, ids.marine));
  const s = mode(attack(g.state, g.refs.attacker!, g.refs.defender!), 'simultaneous');
  expect(s.cards[g.refs.defender!]!).toMatchObject({ zone: 'ground', damage: 1 });
  expect(s.cards[g.refs.attacker!]!.damage).toBe(3);
});
test('The Stranger deals no response if the first hit defeats him', () => {
  const p = board(vents, stranger, ids.marine);
  p.players[0].ground![0]!.damage = 4;
  const g = scenario(p),
    s = mode(attack(g.state, g.refs.attacker!, g.refs.defender!), 'defender-first');
  expect(s.cards[g.refs.attacker!]!.zone).toBe('discard');
  expect(s.cards[g.refs.defender!]!.damage).toBe(0);
});
test('The Stranger’s first-hit Shield choice suspends with combat response pending and unchanged Grit', () => {
  const p = board(vents, stranger, ids.marine);
  p.attachments = [
    { card: 'shield', unit: 'attacker', ref: 'one' },
    { card: 'shield', unit: 'attacker', ref: 'two' },
  ];
  const g = scenario(p),
    pending = mode(attack(g.state, g.refs.attacker!, g.refs.defender!), 'defender-first');
  expect(pending.execution.frames.some(f => f.kind === 'combat-response')).toBe(true);
  resume(
    pending,
    choose(pending, i => i.kind === 'target' && i.card === g.refs.one),
  );
  const s = target(pending, g.refs.one!);
  expect(s.cards[g.refs.attacker!]!.damage).toBe(0);
  expect(s.cards[g.refs.defender!]!.damage).toBe(1);
});
test('The Stranger cannot choose combat order while defending, attacking a base, or with his abilities lost', () => {
  for (const context of ['defend', 'base', 'blank']) {
    const p = board(vents, stranger, ids.marine);
    if (context === 'defend') p.activePlayer = 'bob';
    const g = scenario(p);
    if (context === 'blank')
      modifyUnit(
        g.state,
        g.state.cards[g.state.players.alice!.leader]!,
        g.state.cards[g.refs.attacker!]!,
        { kind: 'modify', power: 0, hp: 0, duration: 'phase', loseAbilities: true },
      );
    const s =
      context === 'defend'
        ? attack(g.state, g.refs.defender!, g.refs.attacker!)
        : attack(
            g.state,
            g.refs.attacker!,
            context === 'base' ? g.state.players.bob!.base : g.refs.defender!,
          );
    expect(s.execution.decision!.kind).toBe('action');
  }
});
test('The Stranger’s Ambush offers the same combat-order choice', () => {
  const p = board(vents, stranger, ids.marine);
  p.players[0].ground = [];
  p.players[0].hand = [{ card: stranger, ref: 'stranger' }];
  const g = scenario(p);
  const pending = target(step(g.state, 'play'), g.refs.defender!);
  expect(pending.attacks[0]!.ambush).toBe(true);
  const s = mode(pending, 'defender-first');
  expect(s.cards[g.refs.stranger!]!).toMatchObject({ zone: 'ground', damage: 3, exhausted: true });
});
test('competing first and last combat abilities offer both sequential orders and validate the captured source', () => {
  const g = scenario(board(vents, stranger, ids.consular));
  modifyUnit(
    g.state,
    g.state.cards[g.state.players.alice!.leader]!,
    g.state.cards[g.refs.attacker!]!,
    { kind: 'modify', power: 0, hp: 0, duration: 'phase', abilities: { firstCombatDamage: true } },
  );
  const pending = attack(g.state, g.refs.attacker!, g.refs.defender!);
  expect(pending.execution.decision!.options.map(o => o.intent)).toEqual([
    { kind: 'choose-mode', mode: 'attacker-first' },
    { kind: 'choose-mode', mode: 'defender-first' },
  ]);
  const corrupt = structuredClone(pending);
  const f = corrupt.execution.frames[0]!;
  if (f.kind !== 'combat-order') throw new Error('Missing order');
  f.source.incarnation--;
  expect(() => decodeState(encodeState(corrupt))).toThrow();
  expect(mode(pending, 'attacker-first').cards[g.refs.defender!]!.damage).toBe(1);
});

function babuGame() {
  const p = board(vents, 'astromech-pilot');
  p.players[0].ground!.push({ card: babu, ref: 'babu' });
  return scenario(p);
}
const activate = (g: ReturnType<typeof scenario>) =>
  step(g.state, i => i.kind === 'use-ability' && i.card === g.refs.babu);
test('Babu exhausts to attack with a ready Droid using remaining HP while its power stays unchanged', () => {
  const g = babuGame();
  g.state.cards[g.refs.attacker!]!.damage = 1;
  const pending = target(activate(g), g.refs.attacker!);
  expect(pending.cards[g.refs.babu!]!.exhausted).toBe(true);
  resume(
    pending,
    choose(pending, i => i.kind === 'attack' && i.defender === pending.players.bob!.base),
  );
  const s = attack(pending, g.refs.attacker!);
  expect(s.cards[s.players.bob!.base]!.damage).toBe(2);
  expect(unitStats(s, s.cards[g.refs.attacker!]!).power).toBe(1);
});
test('Babu can decline, and his selection excludes enemy, exhausted and non-Droid units', () => {
  const g = babuGame();
  g.state.cards[g.refs.attacker!]!.exhausted = true;
  const s = activate(g);
  expect(s.execution.decision!.kind).toBe('action');
  expect(s.cards[g.refs.babu!]!.exhausted).toBe(true);
  expect(s.facts.some(f => f.type === 'attacked')).toBe(false);
  const h = babuGame(),
    choice = activate(h);
  expect(choice.execution.decision!.options.map(o => o.intent)).toEqual([
    { kind: 'target', card: h.refs.attacker! },
    { kind: 'decline-effect' },
  ]);
  expect(step(choice, 'decline-effect').cards[h.refs.attacker!]!.exhausted).toBe(false);
});
test('Babu changes only the attacker’s combat amount and the attack still obeys Shield prevention', () => {
  const g = babuGame();
  const p = board(vents, 'astromech-pilot', ids.marine);
  p.players[0].ground!.push({ card: babu, ref: 'babu' });
  p.attachments = [{ card: 'shield', unit: 'defender' }];
  const h = scenario(p),
    s = attack(target(activate(h), h.refs.attacker!), h.refs.attacker!, h.refs.defender!);
  expect(s.cards[h.refs.defender!]!.damage).toBe(0);
  expect(s.cards[h.refs.attacker!]!.zone).toBe('discard');
  const done = attack(target(activate(g), g.refs.attacker!), g.refs.attacker!);
  expect(done.cards[done.players.bob!.base]!.damage).toBe(3);
});

test('One Way Out blanks the defender before On Defense triggers and restores its abilities after the attack', () => {
  const p = board(out, ids.consular, 'chirrut--mwe--blind--but-not-deaf');
  p.players[1].force = true;
  const g = scenario(p),
    s = attack(modified(g), g.refs.attacker!, g.refs.defender!);
  expect(s.execution.decision!.kind).toBe('action');
  expect(s.cards[g.refs.defender!]!.damage).toBe(4);
  expect(s.cards[g.refs.attacker!]!.damage).toBe(3);
  expect(effectiveAbilities(s, s.cards[g.refs.defender!]!).keywords).toContain('Sentinel');
  expect(s.facts.some(f => f.type === 'force-used')).toBe(false);
});
test('One Way Out suppresses When Defeated but leaves direct Shield upgrade abilities working', () => {
  for (const shield of [true, false]) {
    const p = board(out, ids.consular, 'superlaser-technician');
    if (shield) p.attachments = [{ card: 'shield', unit: 'defender' }];
    const g = scenario(p),
      s = attack(modified(g), g.refs.attacker!, g.refs.defender!);
    expect(s.execution.decision!.kind).toBe('action');
    expect(s.cards[g.refs.defender!]!.zone).toBe(shield ? 'ground' : 'discard');
    expect(s.cards[s.players.bob!.base]!.damage).toBe(shield ? 0 : 3);
  }
});

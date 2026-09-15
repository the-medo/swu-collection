import { modifyUnit } from '../engine/lasting.ts';
import { effectFrames } from '../engine/triggers.ts';
import type { CardEffect } from '../cards/definition.ts';
import { expect, test } from 'bun:test';
import { advance, settle } from '../engine/advance.ts';
import { attachedUpgrades, unitStats } from '../engine/attachments.ts';
import { decodeState, encodeState } from '../engine/checkpoint.ts';
import { conditionMatches } from '../engine/conditions.ts';
import { effectiveAbilities, supportOrigins } from '../engine/effective-abilities.ts';
import type { GameState, Intent } from '../engine/model.ts';
import { Projector } from '../projection/projector.ts';
import { scenario } from './scenario.ts';
import { choose, ids, position } from './helpers.ts';

const resources = () => Array.from({ length: 12 }, () => ({ card: ids.marine }));
function step(
  s: GameState,
  i: Intent['kind'] | ((i: Intent) => boolean),
  selections: string[] = [],
) {
  return advance(s, choose(s, i, selections)).state;
}
const target = (s: GameState, card: string) => step(s, i => i.kind === 'target' && i.card === card);
function playCard(card: string) {
  const p = position();
  p.players[0].hand = [{ card, ref: 'played' }];
  p.players[0].resources = resources();
  return p;
}
function resume(s: GameState, input: ReturnType<typeof choose>) {
  const child = Bun.spawnSync(
    [process.execPath, new URL('./fixtures/resume.ts', import.meta.url).pathname],
    {
      stdin: new TextEncoder().encode(JSON.stringify({ state: encodeState(s), input })),
      stdout: 'pipe',
      stderr: 'pipe',
    },
  );
  expect(child.stderr.toString()).toBe('');
  expect(child.exitCode).toBe(0);
  expect(JSON.parse(child.stdout.toString())).toEqual(advance(s, input));
}
function trigger(s: GameState, id: string) {
  const f = s.execution.frames[0];
  if (f?.kind !== 'trigger-batch') throw new Error('Expected trigger batch');
  const t = f.triggers.find(t => t.abilityId === id)!;
  return step(s, i => i.kind === 'trigger' && i.triggerId === t.id);
}
const upgrades = (s: GameState, id: string) => attachedUpgrades(s, s.cards[id]!).map(c => c.cardId);
function nextRound(s: GameState) {
  const round = s.round;
  for (let n = 0; n < 40 && s.round === round; n++) {
    const d = s.execution.decision!;
    const option =
      d.options.find(o => o.intent.kind === 'pass') ??
      d.options.find(o => o.intent.kind === 'decline-effect') ??
      d.options[0]!;
    s = step(s, i => i === option.intent, d.selection?.cards.slice(0, d.selection.min) ?? []);
  }
  expect(s.round).toBe(round + 1);
  return s;
}

const oggdo = 'oggdo-bogdo--bogano-brute',
  keeper = 'rancor-keeper',
  hera = 'hera-syndulla--renegade-general',
  mothers = 'the-great-mothers--with-strange-magicks',
  firstLight = 'first-light--threatening-elegance',
  shin = 'shin-hati-s-fiend-fighter--compact-and-agile',
  migs = 'migs-mayfeld--how-about-a-toast-';
const play = (s: GameState, card: string) => step(s, i => i.kind === 'play' && i.card === card);
const attack = (s: GameState, attacker: string, defender: string) =>
  step(s, i => i.kind === 'attack' && i.attacker === attacker && i.defender === defender);
function effects(s: GameState, effects: CardEffect[]) {
  const state = structuredClone(s);
  state.execution.decision = null;
  state.execution.frames = [
    ...effectFrames('alice', state.cards[state.players.alice!.leader]!, effects),
    { kind: 'flush-triggers' },
    { kind: 'action' },
  ];
  settle(state);
  return state;
}
const mode = (s: GameState, mode: string) =>
  step(s, i => i.kind === 'choose-mode' && i.mode === mode);

test('Oggdo requires damage for normal and granted attacks, then heals after defeating the defender', () => {
  const p = position();
  p.players[0].ground = [{ card: oggdo, ref: 'oggdo' }];
  p.players[1].ground = [{ card: ids.marine, ref: 'defender' }];
  const pristine = scenario(p);
  expect(pristine.state.execution.decision!.options.some(o => o.intent.kind === 'attack')).toBe(
    false,
  );
  p.players[0].ground[0]!.damage = 1;
  const { state, refs } = scenario(p);
  const done = attack(state, refs.oggdo!, refs.defender!);
  expect(done.cards[refs.defender!]!.zone).toBe('discard');
  expect(done.cards[refs.oggdo!]!.damage).toBe(2);
  expect(done.attacks).toHaveLength(0);
  expect(decodeState(encodeState(done))).toEqual(done);
  const baseAttack = attack(state, refs.oggdo!, state.players.bob!.base);
  expect(baseAttack.cards[refs.oggdo!]!.damage).toBe(1);
});

test('Oggdo does not heal out of lethal combat damage and can heal after a defender dies before combat', () => {
  const p = position();
  p.players[0].ground = [{ card: oggdo, ref: 'oggdo', damage: 2 }];
  p.players[1].ground = [{ card: ids.marine, ref: 'defender' }];
  const lethal = scenario(p),
    dead = attack(lethal.state, lethal.refs.oggdo!, lethal.refs.defender!);
  expect(dead.cards[lethal.refs.oggdo!]!.zone).toBe('discard');
  p.players[0].hand = [{ card: migs, ref: 'migs' }];
  p.players[0].resources = resources();
  p.players[1].ground = [{ card: ids.fighter, ref: 'defender', movedArena: true }];
  const s = scenario(p);
  const support = play(s.state, s.refs.migs!);
  const healed = attack(support, s.refs.oggdo!, s.refs.defender!);
  expect(healed.cards[s.refs.defender!]!.zone).toBe('discard');
  expect(healed.cards[s.refs.oggdo!]!.damage).toBe(0);
  const noDamage = structuredClone(p);
  noDamage.players[0].ground![0]!.damage = 0;
  const q = scenario(noDamage);
  expect(
    play(q.state, q.refs.migs!).execution.decision!.options.some(
      o => o.intent.kind === 'attack' && o.intent.attacker === q.refs.oggdo,
    ),
  ).toBe(false);
});

test('Rancor Keeper chooses zero, one or both bases and uses its trigger only once across simultaneous surviving units', () => {
  const p = position();
  p.players[0].ground = [
    { card: keeper, ref: 'keeper' },
    { card: ids.marine, ref: 'one' },
    { card: ids.marine, ref: 'two' },
  ];
  const { state, refs } = scenario(p);
  let s = effects(state, [{ kind: 'damage-units', amount: 1, filter: { controller: 'friendly' } }]);
  expect(s.execution.frames[0]!.kind).toBe('trigger-batch');
  s = step(s, 'trigger');
  s = step(s, 'accept-effect');
  expect(s.execution.decision!.selection).toEqual({
    cards: [s.players.alice!.base, s.players.bob!.base],
    min: 0,
    max: 2,
  });
  resume(s, choose(s, 'accept-effect', [s.players.alice!.base, s.players.bob!.base]));
  const both = step(s, 'accept-effect', [s.players.alice!.base, s.players.bob!.base]);
  expect(both.cards[both.players.alice!.base]!.damage).toBe(1);
  expect(both.cards[both.players.bob!.base]!.damage).toBe(1);
  expect(both.execution.frames[0]!.kind).toBe('action');
  expect(both.roundHistory.triggerUses).toHaveLength(1);
  const none = step(s, 'accept-effect');
  expect(none.cards[none.players.bob!.base]!.damage).toBe(0);
  expect(none.roundHistory.triggerUses).toHaveLength(1);
  const again = effects(both, [
    { kind: 'damage-units', filter: { name: 'Battlefield Marine' }, amount: 1 },
  ]);
  expect(again.execution.frames[0]!.kind).toBe('action');
  expect(again.cards[again.players.bob!.base]!.damage).toBe(1);
  expect(again.roundHistory.triggerUses).toHaveLength(1);
  const round = nextRound(both);
  expect(round.roundHistory.triggerUses).toHaveLength(0);
  const next = effects(round, [
    { kind: 'damage-units', amount: 1, filter: { controller: 'friendly' } },
  ]);
  expect(next.execution.frames[0]!.kind).toBe('trigger-batch');
});

test('Rancor Keeper observes another survivor even when the Keeper dies in the same damage event', () => {
  const p = position();
  p.players[0].ground = [
    { card: keeper, ref: 'keeper', damage: 2 },
    { card: ids.consular, ref: 'survivor' },
  ];
  const { state, refs } = scenario(p);
  let s = effects(state, [{ kind: 'damage-units', amount: 2, filter: { controller: 'friendly' } }]);
  expect(s.cards[refs.keeper!]!.zone).toBe('discard');
  expect(s.cards[refs.survivor!]!.zone).toBe('ground');
  s = step(s, 'accept-effect');
  resume(s, choose(s, 'accept-effect', [s.players.bob!.base]));
  expect(step(s, 'accept-effect', [s.players.bob!.base]).cards[s.players.bob!.base]!.damage).toBe(
    1,
  );
});

test('Prevented, zero and lethal damage do not produce a surviving-unit trigger', () => {
  for (const kind of ['shield', 'zero', 'lethal']) {
    const p = position();
    p.players[0].ground = [
      { card: keeper, ref: 'keeper' },
      { card: ids.marine, ref: 'unit' },
    ];
    if (kind === 'shield') p.attachments = [{ card: 'shield', unit: 'unit' }];
    const { state, refs } = scenario(p);
    const s = effects(state, [
      {
        kind: 'damage-units',
        amount: kind === 'zero' ? 0 : 3,
        filter: { name: 'Battlefield Marine' },
      },
    ]);
    expect(s.execution.frames[0]!.kind).toBe('action');
    expect(s.roundHistory.triggerUses).toHaveLength(0);
    expect(s.cards[refs.keeper!]!.zone).toBe('ground');
  }
});

test('Each Rancor Keeper copy has its own round limit', () => {
  const p = position();
  p.players[0].ground = [
    { card: keeper, ref: 'one' },
    { card: keeper, ref: 'two' },
    { card: ids.consular, ref: 'unit' },
  ];
  const { state } = scenario(p);
  let s = effects(state, [
    { kind: 'damage-units', amount: 1, filter: { name: 'Consular Security Force' } },
  ]);
  s = step(s, 'trigger');
  s = step(s, 'accept-effect');
  s = step(s, 'accept-effect', [s.players.bob!.base]);
  s = step(s, 'accept-effect');
  s = step(s, 'accept-effect', [s.players.bob!.base]);
  expect(s.cards[s.players.bob!.base]!.damage).toBe(2);
  expect(s.roundHistory.triggerUses).toHaveLength(2);
});

test('Hera heals actual base combat damage, including Overwhelm after she dies, but not ability damage', () => {
  const p = position();
  p.players[0].base.damage = 10;
  p.players[0].ground = [{ card: hera, ref: 'hera', damage: 3 }];
  p.attachments = [{ card: 'academy-training', unit: 'hera' }];
  p.players[1].ground = [{ card: ids.marine, ref: 'defender' }];
  const { state, refs } = scenario(p);
  modifyUnit(state, state.cards[refs.hera!]!, state.cards[refs.hera!]!, {
    kind: 'modify',
    power: 0,
    hp: 0,
    abilities: { keywords: ['Overwhelm'] },
    duration: 'phase',
  });
  state.execution.decision = null;
  settle(state);
  const done = attack(state, refs.hera!, refs.defender!);
  expect(done.cards[refs.hera!]!.zone).toBe('discard');
  expect(done.cards[done.players.bob!.base]!.damage).toBe(2);
  expect(done.cards[done.players.alice!.base]!.damage).toBe(8);
  const base = attack(state, refs.hera!, state.players.bob!.base);
  expect(base.cards[base.players.alice!.base]!.damage).toBe(5);
  const q = position();
  q.players[0].base.damage = 10;
  q.players[0].ground = [{ card: hera, ref: 'hera' }];
  q.players[0].hand = [{ card: migs, ref: 'migs' }];
  q.players[0].resources = resources();
  const other = scenario(q);
  const finished = attack(
    play(other.state, other.refs.migs!),
    other.refs.hera!,
    other.state.players.bob!.base,
  );
  expect(finished.cards[finished.players.bob!.base]!.damage).toBe(3);
  expect(finished.cards[finished.players.alice!.base]!.damage).toBe(7);
});

test('The Great Mothers lend their attack-end ability through Support, even if the borrower dies in combat', () => {
  const p = playCard(mothers);
  p.players[0].ground = [{ card: ids.marine, ref: 'borrower' }];
  p.players[1].ground = [{ card: ids.consular, ref: 'defender' }];
  const { state, refs } = scenario(p);
  const done = attack(play(state, refs.played!), refs.borrower!, refs.defender!);
  expect(done.cards[refs.borrower!]!.zone).toBe('discard');
  expect(done.cards[refs.defender!]!.zone).toBe('discard');
  expect(done.cards[refs.played!]!.zone).toBe('ground');
  expect(decodeState(encodeState(done))).toEqual(done);
});

test('The Great Mothers do not defeat a Shielded defender or a leader that survives combat', () => {
  const p = playCard(mothers);
  p.players[0].ground = [{ card: ids.marine, ref: 'borrower' }];
  p.players[1].ground = [{ card: ids.consular, ref: 'defender' }];
  p.attachments = [{ card: 'shield', unit: 'defender' }];
  const s = scenario(p),
    done = attack(play(s.state, s.refs.played!), s.refs.borrower!, s.refs.defender!);
  expect(done.cards[s.refs.defender!]!.zone).toBe('ground');
  expect(done.cards[s.refs.defender!]!.damage).toBe(0);
  const q = structuredClone(p);
  q.attachments = [];
  q.players[1].ground = [];
  q.players[1].leader.deployedAs = 'unit';
  q.players[1].leader.ref = 'leader';
  const l = scenario(q);
  const againstLeader = attack(play(l.state, l.refs.played!), l.refs.borrower!, l.refs.leader!);
  expect(againstLeader.cards[l.refs.leader!]!.deployedAs).toBe('unit');
  expect(againstLeader.cards[l.refs.leader!]!.damage).toBe(3);
});

test('First Light queues attack-end drawing with combat defeat triggers, and recovery retains its outcome', () => {
  const p = position();
  p.players[0].space = [{ card: firstLight, ref: 'ship', damage: 6 }];
  p.players[1].space = [{ card: shin, ref: 'defender' }];
  p.players[1].ground = [{ card: ids.marine, ref: 'ally' }];
  const { state, refs } = scenario(p);
  let s = attack(state, refs.ship!, refs.defender!);
  expect(s.cards[refs.ship!]!.zone).toBe('discard');
  expect(s.cards[refs.defender!]!.zone).toBe('discard');
  expect(s.execution.decision!.kind).toBe('trigger-player');
  resume(
    s,
    choose(s, i => i.kind === 'trigger-player' && i.playerId === 'alice'),
  );
  s = step(s, i => i.kind === 'trigger-player' && i.playerId === 'alice');
  s = mode(s, 'draw');
  expect(s.players.alice!.hand).toHaveLength(1);
  s = target(s, refs.ally!);
  expect(upgrades(s, refs.ally!)).toEqual(['advantage', 'advantage']);
});

test("Shin Hati's Fiend Fighter offers two or three Advantage only after non-combat defeat, and can decline", () => {
  const p = playCard('open-fire');
  p.players[0].space = [{ card: shin, ref: 'ship' }];
  p.players[1].ground = [{ card: ids.marine, ref: 'ally' }];
  const { state, refs } = scenario(p);
  const s = target(play(state, refs.played!), refs.ship!);
  expect(step(s, 'decline-effect').execution.frames[0]!.kind).toBe('action');
  const choosing = target(s, refs.ally!);
  resume(
    choosing,
    choose(choosing, i => i.kind === 'choose-mode' && i.mode === 'give-three'),
  );
  expect(upgrades(mode(choosing, 'give-two'), refs.ally!)).toHaveLength(2);
  expect(upgrades(mode(choosing, 'give-three'), refs.ally!)).toHaveLength(3);
});

test('Borrowed triggers with the same local ability ID retain distinct effects and recover independently', () => {
  const p = playCard(migs);
  p.players[0].hand!.push({ card: ids.marine, ref: 'discard' });
  p.players[0].ground = [{ card: 'merrin--alone-with-the-dead', ref: 'merrin' }];
  p.players[1].ground = [{ card: ids.consular, ref: 'defender' }];
  const { state, refs } = scenario(p);
  let s = attack(play(state, refs.played!), refs.merrin!, refs.defender!);
  const frame = s.execution.frames[0];
  if (frame?.kind !== 'trigger-batch') throw new Error('Expected borrowed triggers');
  expect(frame.triggers).toHaveLength(2);
  expect(new Set(frame.triggers.map(t => t.abilityId)).size).toBe(2);
  expect(frame.triggers[0]!.abilityId).toBe('on-attack');
  expect(frame.triggers[1]!.abilityId).toMatch(/^g[0-9]+-on-attack$/);
  const borrowed = frame.triggers[1]!;
  resume(
    s,
    choose(s, i => i.kind === 'trigger' && i.triggerId === borrowed.id),
  );
  s = step(s, i => i.kind === 'trigger' && i.triggerId === borrowed.id);
  expect(s.cards[refs.defender!]!.damage).toBe(1);
  s = step(s, 'accept-effect', [refs.discard!]);
  s = target(s, refs.defender!);
  expect(s.cards[refs.defender!]!.damage).toBe(5);
  expect(s.cards[refs.merrin!]!.damage).toBe(3);
});

test('Combat replacement recovery retains attack outcomes and rejects forged combat context', () => {
  const p = position();
  p.players[0].ground = [{ card: mothers, ref: 'attacker' }];
  p.players[1].ground = [
    { card: ids.consular, ref: 'defender' },
    { card: ids.marine, ref: 'other' },
  ];
  p.attachments = [
    { card: 'shield', unit: 'defender', ref: 'one' },
    { card: 'shield', unit: 'defender', ref: 'two' },
  ];
  const { state, refs } = scenario(p);
  const pending = attack(state, refs.attacker!, refs.defender!);
  expect(pending.execution.frames[0]!.kind).toBe('damage');
  resume(
    pending,
    choose(pending, i => i.kind === 'target' && i.card === refs.two),
  );
  const done = target(pending, refs.two!);
  expect(done.cards[refs.defender!]!.damage).toBe(0);
  expect(done.cards[refs.defender!]!.zone).toBe('ground');
  const wrongAttack = structuredClone(pending);
  const f = wrongAttack.execution.frames[0];
  if (f?.kind !== 'damage') throw new Error('Missing damage frame');
  f.combatAttackId = 'invented';
  expect(() => decodeState(encodeState(wrongAttack))).toThrow('Invalid combat damage continuation');
  const forged = structuredClone(pending);
  forged.attacks[0]!.combatDamage.push({
    source: forged.attacks[0]!.attacker,
    target: { instanceId: refs.other!, cardId: ids.marine, incarnation: 1, visibility: 0 },
    amount: 3,
  });
  expect(() => decodeState(encodeState(forged))).toThrow('Invalid combat damage target');
});

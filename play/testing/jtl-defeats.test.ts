import { attachPilot } from '../engine/pilot-conversion.ts';
import { expect, test } from 'bun:test';
import { settle } from '../engine/advance.ts';
import { encodeState, decodeState } from '../engine/checkpoint.ts';
import { isUpgrade } from '../engine/roles.ts';
import { isUnit, reattachmentTargets } from '../engine/attachments.ts';
import { move, reference } from '../engine/state.ts';
import type { CardEffect } from '../cards/definition.ts';
import type { GameState } from '../engine/model.ts';
import { scenario } from './scenario.ts';
import {
  board,
  play,
  target,
  blank,
  tokens,
  options,
  step,
  refresh,
  drain,
  ids,
  attack,
  stats,
} from './jtl-helpers.ts';
const l3 = 'l3-37--get-out-of-my-seat',
  caster = 'shadow-caster--just-business';
function effects(s: GameState, ...e: CardEffect[]) {
  s.execution.decision = null;
  s.execution.frames.unshift(
    ...e.map(effect => ({
      kind: 'effect' as const,
      playerId: 'alice',
      source: structuredClone(s.cards[s.players.alice!.leader]!),
      effect,
    })),
    { kind: 'flush-triggers' },
  );
  settle(s);
  return drain(s);
}
function l3Board() {
  const p = board(l3, false);
  p.players[0].space = [
    { card: 'munificent-frigate', ref: 'host' },
    { card: 'munificent-frigate', ref: 'occupied' },
  ];
  p.players[1].space = [{ card: 'munificent-frigate', ref: 'enemy' }];
  p.attachments = [{ card: 'bb-8--happy-beeps', unit: 'occupied' }];
  return p;
}
const defeatGround: CardEffect = {
  kind: 'defeat-units',
  filter: { controller: 'friendly', arena: 'ground' },
};
test('L3 replaces defeat by attaching to a friendly unpiloted Vehicle and clears damage/upgrades', () => {
  const p = l3Board();
  p.players[0].ground![0]!.damage = 2;
  p.attachments!.push({ card: 'experience', unit: 'source', ref: 'upgrade' });
  const g = scenario(p);
  let s = effects(g.state, defeatGround);
  expect(
    options(s)
      .filter(i => i.kind === 'target')
      .map(i => i.card),
  ).toEqual([g.refs.host!]);
  expect(decodeState(encodeState(s))).toEqual(s);
  const inc = s.cards[g.refs.source!]!.incarnation;
  s = target(s, g.refs.host!);
  expect(isUpgrade(s, s.cards[g.refs.source!]!)).toBe(true);
  expect(s.cards[g.refs.source!]!.damage).toBe(0);
  expect(s.cards[g.refs.source!]!.incarnation).toBe(inc);
  expect(s.cards[g.refs.upgrade!]!.zone).toBe('set-aside');
  expect(stats(s, g.refs.host!)).toEqual({ power: 7, hp: 10 });
  expect(s.phaseHistory.defeated.some(c => c.instanceId === g.refs.source)).toBe(false);
  expect(s.phaseHistory.played).toHaveLength(0);
});
test('L3 can decline the replacement, and ability loss removes the choice', () => {
  const g = scenario(l3Board());
  const s = step(effects(g.state, defeatGround), 'decline-effect');
  expect(s.cards[g.refs.source!]!.zone).toBe('discard');
  const b = scenario(l3Board());
  blank(b.state, b.refs.source!);
  const t = effects(b.state, defeatGround);
  expect(t.cards[b.refs.source!]!.zone).toBe('discard');
});
test('L3 without an eligible host is defeated normally and ordinary Piloting has its printed cost', () => {
  const p = board(l3, false),
    g = scenario(p);
  const s = effects(g.state, defeatGround);
  expect(s.cards[g.refs.source!]!.zone).toBe('discard');
  const q = board(l3);
  q.players[0].space = [{ card: 'munificent-frigate', ref: 'host' }];
  const h = scenario(q);
  const t = play(h.state, h.refs.source!, h.refs.host!);
  expect(isUpgrade(t, t.cards[h.refs.source!]!)).toBe(true);
  // Sabine/red base provide Heroism but not Vigilance: 3 + 2 aspect penalty.
  expect(t.cards[h.refs.source!]!.resourcesPaid).toBe(5);
});
test('Simultaneous defeat waits for L3’s choice, then defeats a chosen host and its new upgrade', () => {
  const g = scenario(l3Board());
  let s = effects(g.state, { kind: 'defeat-units', filter: { controller: 'friendly' } });
  expect(s.cards[g.refs.host!]!.zone).toBe('space');
  expect(s.phaseHistory.defeated).toHaveLength(0);
  s = target(s, g.refs.host!);
  expect(s.cards[g.refs.host!]!.zone).toBe('discard');
  expect(s.cards[g.refs.source!]!.zone).toBe('discard');
  expect(s.phaseHistory.defeated.some(c => c.instanceId === g.refs.source)).toBe(false);
  expect(s.phaseHistory.defeated.some(c => c.instanceId === g.refs.host)).toBe(true);
});
test('L3’s conversion waits for an attached Luke replacement before simultaneous deaths commit', () => {
  const p = l3Board();
  p.players[0].ground!.push({ card: ids.marine, ref: 'other' });
  p.players[0].ground!.push({ card: 'luke-skywalker--you-still-with-me-', ref: 'luke' });
  const g = scenario(p);
  attachPilot(
    g.state,
    g.state.cards[g.refs.luke!]!,
    g.state.cards[g.refs.source!]!,
    g.state.cards[g.refs.luke!]!,
  );
  let s = target(effects(g.state, defeatGround), g.refs.host!);
  expect(s.execution.frames[0]!.kind).toBe('upgrade-defeat');
  expect(s.cards[g.refs.other!]!.zone).toBe('ground');
  expect(decodeState(encodeState(s))).toEqual(s);
  s = step(s, 'accept-effect');
  expect(isUpgrade(s, s.cards[g.refs.source!]!)).toBe(true);
  expect(isUnit(s, s.cards[g.refs.luke!]!)).toBe(true);
  expect(s.cards[g.refs.other!]!.zone).toBe('discard');
});
test('L3 replaces lethal combat damage without being recorded as a defeated defender', () => {
  const p = l3Board();
  p.players[1].ground = [{ card: 'jedi-guardian', ref: 'attacker' }];
  p.activePlayer = 'bob';
  const g = scenario(p);
  let s = attack(g.state, g.refs.attacker!, g.refs.source!);
  expect(s.execution.decision!.kind).toBe('replacement');
  s = target(s, g.refs.host!);
  expect(isUpgrade(s, s.cards[g.refs.source!]!)).toBe(true);
  expect(s.phaseHistory.defeated.some(c => c.instanceId === g.refs.source)).toBe(false);
});
function shadeBoard() {
  const p = board(caster, false);
  p.players[0].ground = [{ card: 'deceptive-shade', ref: 'victim' }];
  return p;
}
test('Shadow Caster may repeat a defeated unit’s ability or decline', () => {
  for (const accept of [true, false]) {
    const g = scenario(shadeBoard());
    let s = effects(g.state, defeatGround);
    s = step(s, accept ? 'accept-effect' : 'decline-effect');
    expect(s.playModifiers).toHaveLength(accept ? 2 : 1);
    expect(s.playModifiers.every(m => m.phaseAbilities?.keywords?.includes('Ambush'))).toBe(true);
  }
});
test('Shadow Caster repeats all printed and upgrade-granted When Defeated abilities', () => {
  const p = shadeBoard();
  p.attachments = [{ card: 'grim-valor', unit: 'victim' }];
  p.players[1].ground = [
    { card: ids.marine, ref: 'one' },
    { card: ids.marine, ref: 'two' },
  ];
  const g = scenario(p);
  let s = effects(g.state, defeatGround);
  // The first trigger batch is ordered by the active player; select exhaust targets
  // whenever Grim Valor is next, and accept Shadow Caster once.
  let count = 0;
  for (let n = 0; n < 12 && s.execution.decision?.kind !== 'action'; n++) {
    if (options(s).some(i => i.kind === 'target'))
      s = target(s, count++ ? g.refs.two! : g.refs.one!);
    else s = step(s, 'accept-effect');
  }
  expect(count).toBe(2);
  expect(s.playModifiers).toHaveLength(2);
  expect(s.cards[g.refs.one!]!.exhausted).toBe(true);
  expect(s.cards[g.refs.two!]!.exhausted).toBe(true);
});
test('Shadow Caster observes simultaneous defeats even when it leaves in that event', () => {
  const g = scenario(shadeBoard());
  let s = effects(g.state, { kind: 'defeat-units', filter: { controller: 'friendly' } });
  for (let n = 0; n < 4 && s.execution.decision?.kind !== 'action'; n++)
    s = step(s, 'accept-effect');
  expect(s.playModifiers).toHaveLength(2);
  expect(s.cards[g.refs.source!]!.zone).toBe('discard');
});
test('Shadow Caster does not repeat a blanked victim or observe an enemy defeat', () => {
  const g = scenario(shadeBoard());
  blank(g.state, g.refs.victim!);
  let s = effects(g.state, defeatGround);
  s = step(s, 'accept-effect');
  expect(s.playModifiers).toHaveLength(0);
  const p = board(caster, false);
  p.players[1].ground = [{ card: 'deceptive-shade', ref: 'enemy' }];
  const h = scenario(p),
    t = effects(h.state, { kind: 'defeat-units', filter: { controller: 'enemy' } });
  expect(t.execution.decision!.kind).toBe('action');
  expect(t.playModifiers).toHaveLength(1);
});
test('Shadow Caster retains the combat context when repeating Paz Vizsla', () => {
  const p = board(caster, false);
  p.players[0].ground = [{ card: 'paz-vizsla--for-a-brighter-future', ref: 'victim', damage: 6 }];
  p.players[1].ground = [{ card: ids.marine, ref: 'attacker' }];
  p.activePlayer = 'bob';
  const g = scenario(p);
  let s = attack(g.state, g.refs.attacker!, g.refs.victim!);
  s = step(s, 'accept-effect');
  expect(s.ground.filter(id => s.cards[id]!.cardId === 'mandalorian')).toHaveLength(0);
});
test('L3’s replaced defeat pays Exploit without pretending she was defeated', () => {
  const p = l3Board();
  p.players[0].hand = [{ card: 'battle-droid-legion', ref: 'legion' }];
  p.players[0].credits = ['credit1'];
  const g = scenario(p);
  let s = play(g.state, g.refs.legion!);
  s = step(s, 'accept-effect', [g.refs.source!]);
  expect(s.execution.decision!.kind).toBe('replacement');
  expect(decodeState(encodeState(s))).toEqual(s);
  s = target(s, g.refs.host!);
  // Keep the Credit: the ordinary resources can pay the discounted play.
  if (s.execution.frames[0]!.kind === 'credit-payment') {
    expect(decodeState(encodeState(s))).toEqual(s);
    s = step(s, 'accept-effect');
  }
  expect(isUpgrade(s, s.cards[g.refs.source!]!)).toBe(true);
  expect(isUnit(s, s.cards[g.refs.legion!]!)).toBe(true);
  expect(s.phaseHistory.defeated.some(c => c.instanceId === g.refs.source)).toBe(false);
});
test('Shadow Caster’s captured ability stays on the old incarnation when the physical card returns', () => {
  const g = scenario(shadeBoard());
  let s = effects(g.state, defeatGround);
  const old = s.cards[g.refs.victim!]!.incarnation;
  move(s, s.cards[g.refs.victim!]!, 'hand');
  move(s, s.cards[g.refs.victim!]!, 'ground');
  blank(s, g.refs.victim!);
  s = step(s, 'accept-effect');
  expect(s.playModifiers).toHaveLength(2);
  expect(s.playModifiers.every(m => m.source.incarnation === old)).toBe(true);
  expect(s.cards[g.refs.victim!]!.incarnation).toBeGreaterThan(old);
});
test('A pending L3 replacement rejects an invented incarnation in its defeat group', () => {
  const g = scenario(l3Board());
  const s = effects(g.state, defeatGround);
  const bad = structuredClone(s),
    f = bad.execution.frames.find(f => f.kind === 'unit-defeat')!;
  if (f.kind !== 'unit-defeat') throw Error('Expected defeat');
  f.cards[0]!.incarnation++;
  expect(() => decodeState(encodeState(bad))).toThrow();
});

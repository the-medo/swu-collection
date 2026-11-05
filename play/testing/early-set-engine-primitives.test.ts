import { expect, test } from 'bun:test';
import { advance } from '../engine/advance.ts';
import {
  abilities,
  attack,
  board,
  choose,
  damage,
  defeat,
  effects,
  ids,
  play,
  position,
  resources,
  resume,
  scenario,
  stats,
  step,
  target,
  targets,
  tokens,
} from './early-set-completion-helpers.ts';
import type { GameState } from '../engine/model.ts';
const mode = (s: GameState, id: string) => step(s, i => i.kind === 'choose-mode' && i.mode === id);
const playedCost = (s: GameState, id: string) =>
  s.facts.findLast(f => f.type === 'played' && f.cards.some(c => c.instanceId === id))!.amount;

test('Caught in the Crossfire snapshots both powers and deals simultaneous damage from the chosen units', () => {
  const p = board('caught-in-the-crossfire', true);
  p.players[1].ground = [
    { card: ids.marine, ref: 'first' },
    { card: ids.marine, ref: 'second' },
  ];
  p.players[1].space = [{ card: ids.fighter, ref: 'space' }];
  const g = scenario(p),
    pending = target(play(g.state, g.refs.card!), g.refs.first!);
  expect(targets(pending)).toEqual([g.refs.second!]);
  resume(
    pending,
    choose(pending, i => i.kind === 'target' && i.card === g.refs.second),
  );
  const s = target(pending, g.refs.second!);
  expect(s.cards[g.refs.first!]!.zone).toBe('discard');
  expect(s.cards[g.refs.second!]!.zone).toBe('discard');
  const damageFacts = s.facts.filter(f => f.type === 'damage');
  expect(damageFacts.map(f => f.cards[0]!.instanceId).sort()).toEqual(
    [g.refs.first!, g.refs.second!].sort(),
  );
  expect(s.facts.findIndex(f => f.type === 'defeated')).toBeGreaterThan(
    s.facts.findLastIndex(f => f.type === 'damage'),
  );
});
test('Unlimited Power assigns 4/3/2/1 to four distinct units before any damage is dealt', () => {
  const p = board('unlimited-power', true);
  p.players[1].ground = Array.from({ length: 4 }, (_, i) => ({
    card: ids.consular,
    ref: `target${i}`,
  }));
  const g = scenario(p);
  let s = play(g.state, g.refs.card!);
  for (let i = 0; i < 4; i++) {
    expect(s.cards[g.refs.target0!]!.damage).toBe(0);
    if (i) expect(targets(s)).not.toContain(g.refs.target0!);
    s = target(s, g.refs[`target${i}`]!);
  }
  for (let i = 0; i < 4; i++) expect(s.cards[g.refs[`target${i}`]!]!.damage).toBe(4 - i);
});
test('Unlimited Power does as much as possible with only two units', () => {
  const p = board('unlimited-power', true);
  p.players[0].ground = [{ card: ids.consular, ref: 'first' }];
  p.players[1].ground = [{ card: ids.consular, ref: 'second' }];
  const g = scenario(p),
    s = target(target(play(g.state, g.refs.card!), g.refs.first!), g.refs.second!);
  expect(s.cards[g.refs.first!]!.damage).toBe(4);
  expect(s.cards[g.refs.second!]!.damage).toBe(3);
});
test('The Chaos of War damages both bases simultaneously, including a mutual defeat', () => {
  const p = board('the-chaos-of-war', true);
  p.players[0].hand!.push({ card: ids.marine }, { card: ids.marine });
  p.players[1].hand = [{ card: ids.fighter }, { card: ids.fighter }];
  p.players[0].base.damage = 28;
  p.players[1].base.damage = 28;
  const g = scenario(p),
    s = play(g.state, g.refs.card!);
  expect(damage(s)).toBe(30);
  expect(damage(s, 'alice')).toBe(30);
  expect(s.result?.winner).toBeNull();
});
test('Obi-Wan’s Aethersprite deals different simultaneous amounts and may decline', () => {
  const p = board('obi-wan-s-aethersprite--this-is-why-i-hate-flying', true);
  p.players[1].space = [{ card: 'red-three--unstoppable', ref: 'enemy' }];
  const g = scenario(p),
    pending = play(g.state, g.refs.card!);
  const s = target(mode(pending, 'resolve'), g.refs.enemy!);
  expect(s.cards[g.refs.card!]!.damage).toBe(1);
  expect(s.cards[g.refs.enemy!]!.damage).toBe(2);
  expect(mode(pending, 'decline').cards[g.refs.card!]!.damage).toBe(0);
});
test('Palpatine’s Return evaluates the Force discount consistently for admission and payment', () => {
  const p = board('palpatine-s-return', true);
  p.players[0].discard = [
    { card: 'supreme-leader-snoke--shadow-ruler', ref: 'force' },
    { card: 'at-st', ref: 'ordinary' },
  ];
  const g = scenario(p),
    pending = play(g.state, g.refs.card!);
  resume(
    pending,
    choose(pending, i => i.kind === 'play' && i.card === g.refs.force),
  );
  const a = play(pending, g.refs.force!),
    b = play(pending, g.refs.ordinary!);
  expect(playedCost(a, g.refs.force!)).toBe(4);
  expect(playedCost(b, g.refs.ordinary!)).toBe(2);
});
test('Barriss counts actual healing earlier in the phase and the exact incarnation', () => {
  const p = board('barriss-offee--unassuming-apprentice');
  p.players[0].ground!.push(
    { card: ids.consular, damage: 2, ref: 'patient' },
    { card: ids.marine, ref: 'healthy' },
  );
  const g = scenario(p);
  let s = effects(g.state, [{ kind: 'heal-units', filter: { controller: 'friendly' }, amount: 2 }]);
  expect(stats(s, g.refs.patient!).power).toBe(4);
  expect(stats(s, g.refs.healthy!).power).toBe(3);
  s = effects(
    s,
    [{ kind: 'on-unit', target: 'source', operation: { kind: 'return-to-hand' } }],
    g.refs.patient!,
  );
  s = play(s, g.refs.patient!);
  expect(stats(s, g.refs.patient!).power).toBe(3);
});
test('Boba Disintegrator distinguishes units that entered this round from older units', () => {
  for (const fresh of [false, true]) {
    const p = board('boba-fett--disintegrator');
    p.activePlayer = fresh ? 'bob' : 'alice';
    p.players[1].resources = resources();
    p.players[1][fresh ? 'hand' : 'ground'] = [
      { card: ids.consular, exhausted: true, ref: 'enemy' },
    ];
    const g = scenario(p);
    let s = fresh ? play(g.state, g.refs.enemy!) : g.state;
    if (fresh) expect(s.cards[g.refs.enemy!]!.enteredRound).toBe(1);
    s = attack(s, g.refs.card!, g.refs.enemy!);
    expect(s.cards[g.refs.enemy!]!.damage).toBe(fresh ? 3 : 6);
  }
});
test('Osi Sobeck uses resources actually paid after Exploit, not his printed cost', () => {
  const p = board('osi-sobeck--warden-of-the-citadel', true);
  p.players[0].ground = [{ card: 'battle-droid', ref: 'sacrifice' }];
  p.players[1].ground = [
    { card: 'at-st', ref: 'too-expensive' },
    { card: ids.marine, ref: 'cheap' },
  ];
  const g = scenario(p),
    payment = play(g.state, g.refs.card!);
  const pending = step(payment, 'accept-effect', [g.refs.sacrifice!]);
  expect(targets(pending)).toContain(g.refs.cheap!);
  expect(targets(pending)).not.toContain(g.refs['too-expensive']!);
  const s = target(pending, g.refs.cheap!);
  expect(s.cards[g.refs.cheap!]!.zone).toBe('captured');
  expect(playedCost(s, g.refs.card!)).toBe(s.cards[g.refs.card!]!.resourcesPaid!);
});
test('Vanguard Ace counts other cards played and includes the event that plays it', () => {
  const p = board('vanguard-ace', true);
  const g = scenario(p);
  expect(tokens(play(g.state, g.refs.card!), g.refs.card!)).toBe(0);
  p.players[0].hand!.push({ card: 'timely-intervention', ref: 'event' });
  const h = scenario(p);
  let s = play(play(h.state, h.refs.event!), h.refs.card!);
  if (s.execution.decision?.kind !== 'action') s = step(s, 'decline-effect');
  expect(tokens(s, h.refs.card!)).toBe(1);
});
test('Kanan mills one card per friendly Spectre and heals for distinct discarded aspects', () => {
  const p = board('kanan-jarrus--revealed-jedi');
  p.players[0].ground!.push({ card: 'chopper--metal-menace' });
  p.players[0].base.damage = 6;
  p.players[1].deck = [{ card: ids.marine }, { card: ids.consular }, ...p.players[1].deck!];
  const g = scenario(p),
    pending = attack(g.state, g.refs.card!);
  const s = step(pending, 'accept-effect');
  expect(s.players.bob!.discard).toHaveLength(2);
  expect(damage(s, 'alice')).toBe(3);
});
test('Bendu discounts only cards with neither Heroism nor Villainy', () => {
  const p = board('bendu--the-one-in-the-middle');
  p.players[0].hand = [
    { card: '97th-legion--keeping-the-peace-on-sullust', ref: 'neutral' },
    { card: ids.marine, ref: 'hero' },
    { card: ids.trooper, ref: 'villain' },
  ];
  const g = scenario(p),
    s = attack(g.state, g.refs.card!);
  const next = step(s, 'pass');
  for (const ref of ['neutral', 'hero', 'villain']) {
    const t = play(next, g.refs[ref]!);
    expect(playedCost(t, g.refs[ref]!)).toBe(ref === 'neutral' ? 5 : ref === 'hero' ? 2 : 3);
  }
});
test('In Defense of Kamino and Pyrrhic Assault retain their granted defeat abilities after serialization', () => {
  for (const id of ['in-defense-of-kamino', 'pyrrhic-assault']) {
    const p = board(id, true);
    p.players[0].ground = [{ card: 'clone-trooper', ref: 'ally' }];
    p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
    const g = scenario(p);
    let s = play(g.state, g.refs.card!);
    if (id === 'in-defense-of-kamino') expect(abilities(s, g.refs.ally!).restore).toBe(2);
    s = defeat(s, g.refs.ally!);
    if (id === 'pyrrhic-assault') {
      resume(
        s,
        choose(s, i => i.kind === 'target' && i.card === g.refs.enemy),
      );
      s = target(s, g.refs.enemy!);
      expect(s.cards[g.refs.enemy!]!.damage).toBe(2);
    } else
      expect(
        Object.values(s.cards).filter(c => c.zone === 'ground' && c.cardId === 'clone-trooper'),
      ).toHaveLength(1);
  }
});

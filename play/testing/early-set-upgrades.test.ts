import { expect, test } from 'bun:test';
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
  use,
} from './early-set-completion-helpers.ts';
import type { GameState } from '../engine/model.ts';
const attachPlay = (s: GameState, card: string, host: string) =>
  step(s, i => i.kind === 'play' && i.card === card && i.target === host);
function upgrading(id: string) {
  const p = board(id, true);
  p.players[0].ground = [{ card: ids.consular, ref: 'host' }];
  p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
  return p;
}
function attached(id: string, host = ids.consular as string) {
  const p = position();
  p.players[0].resources = resources();
  p.players[0].ground = [{ card: host, ref: 'host' }];
  p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
  p.attachments = [{ card: id, unit: 'host', ref: 'upgrade' }];
  return p;
}
for (const id of ['perilous-position', 'twice-the-pride'])
  test(`${id}: its play effect applies to the attached unit`, () => {
    const g = scenario(upgrading(id)),
      s = attachPlay(g.state, g.refs.card!, g.refs.enemy!);
    expect(s.cards[g.refs.card!]!.attachedTo?.instanceId).toBe(g.refs.enemy!);
    if (id === 'perilous-position') expect(s.cards[g.refs.enemy!]!.exhausted).toBe(true);
    else expect(s.cards[g.refs.enemy!]!.damage).toBe(2);
  });
test('Old Access Codes checks the unit count when its play effect resolves', () => {
  for (const extra of [false, true]) {
    const p = upgrading('old-access-codes');
    if (extra) p.players[1].ground!.push({ card: ids.marine });
    const g = scenario(p),
      s = attachPlay(g.state, g.refs.card!, g.refs.host!);
    expect(s.players.alice!.hand).toHaveLength(extra ? 1 : 0);
  }
});
for (const [upgrade, leader, kind] of [
  ['mace-windu-s-lightsaber', 'mace-windu--vaapad-form-master', 'draw'],
  ['luke-s-lightsaber', 'luke-skywalker--faithful-friend', 'heal'],
  ['vader-s-lightsaber', 'darth-vader--dark-lord-of-the-sith', 'damage'],
] as const)
  test(`${upgrade}: applies its special ability only to its named host`, () => {
    const p = upgrading(upgrade);
    p.players[0].leader = { card: leader, deployedAs: 'unit', damage: 2, ref: 'leader' };
    const g = scenario(p);
    let s = attachPlay(g.state, g.refs.card!, g.refs.leader!);
    if (kind === 'draw') expect(s.players.alice!.hand).toHaveLength(2);
    if (kind === 'heal') {
      expect(s.cards[g.refs.leader!]!.damage).toBe(0);
      expect(tokens(s, g.refs.leader!, 'shield')).toBe(1);
    }
    if (kind === 'damage') {
      s = target(s, g.refs.enemy!);
      expect(s.cards[g.refs.enemy!]!.damage).toBe(4);
    }
    const other = attachPlay(g.state, g.refs.card!, g.refs.host!);
    expect(other.players.alice!.hand).toHaveLength(0);
    expect(tokens(other, g.refs.host!, 'shield')).toBe(0);
    expect(other.execution.decision!.kind).toBe('action');
  });
test('Mandalorian Armor shields a Mandalorian, and cannot attach to a Vehicle', () => {
  const p = upgrading('mandalorian-armor');
  p.players[0].leader.deployedAs = 'unit';
  p.players[0].space = [{ card: ids.fighter, ref: 'vehicle' }];
  const g = scenario(p);
  expect(
    g.state.execution.decision!.options.some(
      o =>
        o.intent.kind === 'play' &&
        o.intent.card === g.refs.card &&
        o.intent.target === g.refs.vehicle,
    ),
  ).toBe(false);
  expect(
    tokens(
      attachPlay(g.state, g.refs.card!, g.state.players.alice!.leader),
      g.state.players.alice!.leader,
      'shield',
    ),
  ).toBe(1);
  expect(tokens(attachPlay(g.state, g.refs.card!, g.refs.host!), g.refs.host!, 'shield')).toBe(0);
});
test('Nameless Valor can attach only to token units and grants Overwhelm', () => {
  const p = upgrading('nameless-valor');
  p.players[0].ground!.push({ card: 'clone-trooper', ref: 'token' });
  const g = scenario(p);
  expect(
    g.state.execution
      .decision!.options.filter(o => o.intent.kind === 'play' && o.intent.card === g.refs.card)
      .map(o => (o.intent.kind === 'play' ? o.intent.target : null)),
  ).toEqual([g.refs.token!]);
  expect(
    abilities(attachPlay(g.state, g.refs.card!, g.refs.token!), g.refs.token!).keywords,
  ).toContain('Overwhelm');
});
test('Snapshot Reflexes attacks with its host, while Ahsoka’s lightsaber may attack with a different unit', () => {
  const g = scenario(upgrading('snapshot-reflexes'));
  let s = attachPlay(g.state, g.refs.card!, g.refs.host!);
  s = attack(s, g.refs.host!);
  expect(damage(s)).toBe(4);
  const p = upgrading('ahsoka-s-padawan-lightsaber');
  p.players[0].leader = { card: 'ahsoka-tano--snips', deployedAs: 'unit', ref: 'ahsoka' };
  const h = scenario(p);
  let t = attachPlay(h.state, h.refs.card!, h.refs.ahsoka!);
  t = target(t, h.refs.host!);
  t = attack(t, h.refs.host!);
  expect(damage(t)).toBe(3);
  expect(t.cards[h.refs.ahsoka!]!.exhausted).toBe(false);
});
test('Hold-out Blaster deals its damage from the attached unit', () => {
  const g = scenario(upgrading('hold-out-blaster')),
    s = target(attachPlay(g.state, g.refs.card!, g.refs.host!), g.refs.enemy!);
  expect(s.cards[g.refs.enemy!]!.damage).toBe(1);
  expect(s.facts.some(f => f.type === 'damage' && f.cards[0]?.instanceId === g.refs.host)).toBe(
    true,
  );
});
test('On Top of Things protects its host for the phase, with the printed Sentinel exception', () => {
  const g = scenario(upgrading('on-top-of-things'));
  let s = attachPlay(g.state, g.refs.card!, g.refs.host!);
  expect(
    s.execution.decision!.options.some(
      o => o.intent.kind === 'attack' && o.intent.defender === g.refs.host,
    ),
  ).toBe(false);
  s = effects(
    s,
    [
      {
        kind: 'on-unit',
        target: 'source',
        operation: {
          kind: 'modify',
          power: 0,
          hp: 0,
          duration: 'phase',
          abilities: { keywords: ['Sentinel'] },
        },
      },
    ],
    g.refs.host!,
  );
  expect(
    s.execution.decision!.options.some(
      o => o.intent.kind === 'attack' && o.intent.defender === g.refs.host,
    ),
  ).toBe(true);
});
test('Vambrace Flamethrower divides three damage only among enemy ground units', () => {
  const p = attached('vambrace-flamethrower');
  p.players[1].space = [{ card: ids.fighter, ref: 'space' }];
  const g = scenario(p),
    pending = attack(g.state, g.refs.host!);
  expect(pending.execution.decision!.selection!.cards).toEqual([g.refs.enemy!]);
  const s = step(pending, 'accept-effect', [g.refs.enemy!, g.refs.enemy!, g.refs.enemy!]);
  expect(s.cards[g.refs.enemy!]!.damage).toBe(3);
});
test('Vambrace Grappleshot exhausts its unit defender before combat', () => {
  const g = scenario(attached('vambrace-grappleshot')),
    s = attack(g.state, g.refs.host!, g.refs.enemy!);
  expect(s.cards[g.refs.enemy!]!.exhausted).toBe(true);
});
test('Smuggling Compartment requires a Vehicle and readies a resource on attack', () => {
  const p = attached('smuggling-compartment', 'at-st');
  p.players[0].resources = resources(2).map(r => ({ ...r, exhausted: true }));
  const g = scenario(p),
    pending = attack(g.state, g.refs.host!);
  const r = g.state.players.alice!.resources[0]!;
  const s = step(pending, 'accept-effect', [r]);
  expect(s.cards[r]!.exhausted).toBe(false);
  const q = upgrading('smuggling-compartment'),
    h = scenario(q);
  expect(
    h.state.execution.decision!.options.some(
      o => o.intent.kind === 'play' && o.intent.card === h.refs.card,
    ),
  ).toBe(false);
});
test('Armed to the Teeth gives another friendly unit its phase bonus', () => {
  const p = attached('armed-to-the-teeth');
  p.players[0].ground!.push({ card: ids.marine, ref: 'ally' });
  const g = scenario(p),
    pending = attack(g.state, g.refs.host!);
  expect(targets(pending)).toEqual([g.refs.ally!]);
  const s = target(pending, g.refs.ally!);
  expect(stats(s, g.refs.ally!).power).toBe(5);
  expect(damage(s)).toBe(stats(g.state, g.refs.host!).power);
});
for (const [upgrade, token] of [
  ['clone-cohort', 'clone-trooper'],
  ['droid-cohort', 'battle-droid'],
] as const)
  test(`${upgrade}: its host’s defeat creates the printed token`, () => {
    const g = scenario(attached(upgrade)),
      s = defeat(g.state, g.refs.host!);
    expect(
      Object.values(s.cards).filter(
        c => c.zone === 'ground' && c.cardId === token && c.controller === 'alice',
      ),
    ).toHaveLength(1);
    if (upgrade === 'clone-cohort') expect(abilities(g.state, g.refs.host!).raid).toBe(2);
  });
test('Strategic Acumen pays host exhaustion and discounts a unit play', () => {
  const p = attached('strategic-acumen');
  p.players[0].hand = [{ card: ids.marine, ref: 'unit' }];
  const g = scenario(p),
    pending = step(g.state, i => i.kind === 'use-ability' && i.card === g.refs.host);
  expect(pending.cards[g.refs.host!]!.exhausted).toBe(true);
  const s = play(pending, g.refs.unit!);
  expect(s.cards[g.refs.unit!]!.zone).toBe('ground');
  expect(
    s.facts.find(f => f.type === 'played' && f.cards[0]?.instanceId === g.refs.unit)?.amount,
  ).toBe(1);
});
for (const [upgrade, kind] of [
  ['fallen-lightsaber', 'damage'],
  ['jedi-lightsaber', 'weaken'],
  ['general-s-blade', 'discount'],
] as const)
  test(`${upgrade}: the granted attack ability requires the host’s Force or Jedi trait`, () => {
    const p = attached(upgrade);
    p.players[0].ground!.push({ card: 'luke-skywalker--jedi-knight', ref: 'jedi' });
    p.attachments![0]!.unit = 'jedi';
    const g = scenario(p);
    let s = attack(
      g.state,
      g.refs.jedi!,
      kind === 'weaken' ? g.refs.enemy! : g.state.players.bob!.base,
    );
    if (kind === 'damage') expect(s.cards[g.refs.enemy!]!.damage).toBe(1);
    if (kind === 'weaken') expect(s.cards[g.refs.jedi!]!.damage).toBe(1);
    if (kind === 'discount') expect(s.playModifiers.some(m => m.discount === 2)).toBe(true);
    const h = scenario(attached(upgrade)),
      noTrait = attack(h.state, h.refs.host!);
    expect(noTrait.cards[h.refs.enemy!]!.damage).toBe(0);
    expect(noTrait.playModifiers).toHaveLength(0);
  });
test('For the Republic discounts only with three Republic units and Restore requires Coordinate', () => {
  for (const n of [2, 3]) {
    const p = upgrading('for-the-republic');
    p.players[0].ground = Array.from({ length: n }, (_, i) => ({
      card: 'clone-trooper',
      ref: `clone${i}`,
    }));
    p.players[0].base.damage = 5;
    const g = scenario(p);
    let s = attachPlay(g.state, g.refs.card!, g.refs.clone0!);
    const cost = s.facts.find(
      f => f.type === 'played' && f.cards[0]?.instanceId === g.refs.card,
    )!.amount;
    expect(cost).toBe(n === 3 ? 3 : 5);
    s = attack(step(s, 'pass'), g.refs.clone0!);
    expect(damage(s, 'alice')).toBe(n === 3 ? 3 : 5);
  }
});
for (const id of ['price-on-your-head', 'public-enemy', 'wanted', 'rich-reward'])
  test(`${id}: the opponent collects the host’s bounty`, () => {
    const p = position();
    p.players[0].resources = resources(3).map(r => ({ ...r, exhausted: true }));
    p.players[0].ground = [{ card: ids.consular, ref: 'ally' }];
    p.players[1].ground = [{ card: ids.marine, ref: 'host' }];
    p.attachments = [{ card: id, unit: 'host', owner: 'alice' }];
    const g = scenario(p);
    let s = step(defeat(g.state, g.refs.host!), 'accept-effect');
    if (id === 'price-on-your-head') {
      expect(s.players.alice!.resources).toHaveLength(4);
      expect(s.players.bob!.resources).toHaveLength(0);
    }
    if (id === 'public-enemy') {
      s = target(s, g.refs.ally!);
      expect(tokens(s, g.refs.ally!, 'shield')).toBe(1);
    }
    if (id === 'wanted') {
      s = step(s, 'accept-effect', s.players.alice!.resources.slice(0, 2));
      expect(s.players.alice!.resources.filter(i => !s.cards[i]!.exhausted)).toHaveLength(2);
    }
    if (id === 'rich-reward') {
      s = step(s, 'accept-effect', [g.refs.ally!]);
      expect(tokens(s, g.refs.ally!)).toBe(1);
    }
  });

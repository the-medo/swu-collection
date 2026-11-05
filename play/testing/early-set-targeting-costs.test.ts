import { expect, test } from 'bun:test';
import { advance } from '../engine/advance.ts';
import { playCost } from '../engine/state.ts';
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
  resources,
  resume,
  scenario,
  stats,
  step,
  target,
  tokens,
} from './early-set-completion-helpers.ts';
import type { GameState } from '../engine/model.ts';
const ready = (s: GameState, id: string) =>
  effects(s, [{ kind: 'on-unit', target: 'source', operation: { kind: 'ready' } }], id);

test('Corner the Prey snapshots defender damage when the attack begins', () => {
  const p = board('corner-the-prey', true);
  p.players[0].ground = [{ card: ids.marine, ref: 'attacker' }];
  p.players[1].ground = [{ card: ids.consular, damage: 2, ref: 'defender' }];
  const g = scenario(p);
  const s = attack(
    target(play(g.state, g.refs.card!), g.refs.attacker!),
    g.refs.attacker!,
    g.refs.defender!,
  );
  expect(s.cards[g.refs.defender!]!.zone).toBe('discard');
});
test('Swoop Down attacks across arenas and applies ground-only modifiers before combat', () => {
  const p = board('swoop-down', true);
  p.players[0].space = [{ card: 'red-three--unstoppable', ref: 'attacker' }];
  p.players[1].ground = [{ card: ids.consular, ref: 'ground' }];
  const g = scenario(p);
  const pending = target(play(g.state, g.refs.card!), g.refs.attacker!);
  expect(
    pending.execution.decision!.options.some(
      o => o.intent.kind === 'attack' && o.intent.defender === g.refs.ground,
    ),
  ).toBe(true);
  resume(
    pending,
    choose(pending, i => i.kind === 'attack' && i.defender === g.refs.ground),
  );
  const s = attack(pending, g.refs.attacker!, g.refs.ground!);
  expect(s.cards[g.refs.ground!]!.damage).toBe(5);
  expect(s.cards[g.refs.attacker!]!.damage).toBe(1);
  expect(abilities(s, g.refs.attacker!).attackBothArenas).toBe(false);
});
test('Enfys reduces a defender’s power during friendly Ambush attacks only', () => {
  const p = board('enfys-nest--marauder', true);
  p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
  const g = scenario(p),
    pending = play(g.state, g.refs.card!);
  const s = target(pending, g.refs.enemy!);
  expect(s.cards[g.refs.card!]!.damage).toBe(0);
  const q = board('enfys-nest--marauder');
  q.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
  const h = scenario(q);
  expect(attack(h.state, h.refs.card!, h.refs.enemy!).cards[h.refs.card!]!.damage).toBe(3);
});
test('Satine grants both players an exhaust action that mills half remaining HP rounded up', () => {
  const p = board('satine-kryze--committed-to-peace');
  p.players[0].ground!.push({ card: ids.consular, damage: 2, ref: 'ally' });
  p.players[1].ground = [{ card: ids.marine, ref: 'enemy' }];
  const g = scenario(p);
  let s = step(g.state, i => i.kind === 'use-ability' && i.card === g.refs.ally);
  expect(s.players.bob!.discard).toHaveLength(3);
  expect(s.cards[g.refs.ally!]!.exhausted).toBe(true);
  s = step(s, i => i.kind === 'use-ability' && i.card === g.refs.enemy);
  expect(s.players.alice!.discard).toHaveLength(2);
});
test('Omega ignores only the first Clone unit’s aspect penalty each round', () => {
  const p = board('omega--part-of-the-squad');
  p.players[0].base = { card: 'administrator-s-tower' };
  p.players[0].hand = [
    { card: 'clone-deserter', ref: 'first' },
    { card: 'clone-deserter', ref: 'second' },
  ];
  const g = scenario(p);
  expect(playCost(g.state, g.state.cards[g.refs.first!]!)).toBe(1);
  let s = play(g.state, g.refs.first!);
  s = step(s, 'pass');
  expect(playCost(s, s.cards[g.refs.second!]!)).toBe(3);
});
test('Rey and Kylo waive only their named morality aspect penalty when their partner is controlled', () => {
  for (const [id, partner] of [
    ['rey--keeping-the-past', 'kylo-ren--killing-the-past'],
    ['kylo-ren--killing-the-past', 'rey--keeping-the-past'],
  ] as const) {
    const p = board(id, true);
    p.players[0].leader = {
      card: id.startsWith('rey') ? 'grand-moff-tarkin--oversector-governor' : ids.leader,
    };
    const alone = scenario(p),
      full = playCost(alone.state, alone.state.cards[alone.refs.card!]!);
    p.players[0].ground = [{ card: partner, ref: 'partner' }];
    const g = scenario(p);
    expect(playCost(g.state, g.state.cards[g.refs.card!]!)).toBe(full - 2);
  }
});
test('Kylo gives Experience only to a non-Villainy unit; Rey Shields only a non-Heroism unit', () => {
  const p = board('kylo-ren--killing-the-past');
  p.players[0].ground!.push({ card: ids.marine, ref: 'ally' });
  const g = scenario(p),
    s = target(attack(g.state, g.refs.card!), g.refs.ally!);
  expect(tokens(s, g.refs.ally!)).toBe(1);
  expect(stats(s, g.refs.ally!).power).toBe(6);
  const q = board('rey--keeping-the-past');
  q.players[1].ground = [{ card: 'at-st', damage: 1, ref: 'enemy' }];
  const h = scenario(q),
    t = target(attack(h.state, h.refs.card!), h.refs.enemy!);
  expect(t.cards[h.refs.enemy!]!.damage).toBe(0);
  expect(tokens(t, h.refs.enemy!, 'shield')).toBe(1);
});
test('The Darksaber ignores aspects only on Mandalorians and grants Experience to other friendly Mandalorians', () => {
  const p = board('the-darksaber');
  p.players[0].base = { card: 'administrator-s-tower' };
  p.players[0].ground = [
    { card: 'sabine-wren--you-can-count-on-me', ref: 'mando' },
    { card: ids.consular, ref: 'ordinary' },
    { card: 'mandalorian-warrior', ref: 'other' },
  ];
  const g = scenario(p),
    c = g.state.cards[g.refs.card!]!;
  expect(playCost(g.state, c, 0, undefined, g.state.cards[g.refs.mando!]!)).toBe(4);
  expect(playCost(g.state, c, 0, undefined, g.state.cards[g.refs.ordinary!]!)).toBe(6);
  const played = step(
    g.state,
    i => i.kind === 'play' && i.card === g.refs.card && i.target === g.refs.mando,
  );
  let s = attack(step(played, 'pass'), g.refs.mando!);
  if (s.execution.decision!.kind !== 'action') s = step(s, 'decline-effect');
  expect(tokens(s, g.refs.other!)).toBe(1);
  expect(tokens(s, g.refs.mando!)).toBe(0);
});
test('General Grievous waives a Lightsaber’s aspects only on himself', () => {
  const p = board('general-grievous--trophy-collector');
  p.players[0].ground!.push({ card: ids.consular, ref: 'other' });
  p.players[0].hand = [{ card: 'jedi-lightsaber', ref: 'saber' }];
  const g = scenario(p),
    saber = g.state.cards[g.refs.saber!]!;
  expect(playCost(g.state, saber, 0, undefined, g.state.cards[g.refs.card!]!)).toBe(3);
  expect(playCost(g.state, saber, 0, undefined, g.state.cards[g.refs.other!]!)).toBe(5);
});
test('Dengar may damage the actual host of an upgrade played on either player’s unit', () => {
  const p = board('dengar--the-demolisher');
  p.players[0].hand = [{ card: 'academy-training', ref: 'upgrade' }];
  p.players[1].ground = [{ card: ids.consular, ref: 'host' }];
  const g = scenario(p),
    pending = step(
      g.state,
      i => i.kind === 'play' && i.card === g.refs.upgrade && i.target === g.refs.host,
    );
  const s = step(pending, 'accept-effect');
  expect(s.cards[g.refs.host!]!.damage).toBe(1);
});
test('Lando’s Falcon gains Ambush only from hand, including recovery at the attack choice', () => {
  const p = board('millennium-falcon--lando-s-pride', true);
  p.players[1].space = [{ card: ids.fighter, ref: 'enemy' }];
  const g = scenario(p),
    pending = play(g.state, g.refs.card!);
  expect(abilities(pending, g.refs.card!).keywords).toContain('Ambush');
  resume(
    pending,
    choose(pending, i => i.kind === 'target' && i.card === g.refs.enemy),
  );
  const q = board('millennium-falcon--lando-s-pride', true);
  q.players[0].hand = [];
  q.players[0].resources!.push({ card: 'millennium-falcon--lando-s-pride', ref: 'ship' });
  q.players[1].space = [{ card: ids.fighter }];
  const h = scenario(q),
    s = step(h.state, i => i.kind === 'play' && i.card === h.refs.ship && !!i.smuggle);
  expect(abilities(s, h.refs.ship!).keywords).not.toContain('Ambush');
  expect(s.cards[h.refs.ship!]!.exhausted).toBe(true);
});
test('Stolen Landspeeder changes control only from hand and its owner may collect its bounty to replay it', () => {
  const g = scenario(board('stolen-landspeeder', true)),
    played = play(g.state, g.refs.card!);
  expect(played.cards[g.refs.card!]!.controller).toBe('bob');
  let s = step(defeat(played, g.refs.card!), 'accept-effect');
  s = play(s, g.refs.card!);
  expect(s.cards[g.refs.card!]!).toMatchObject({
    zone: 'ground',
    controller: 'alice',
    exhausted: true,
  });
  expect(tokens(s, g.refs.card!)).toBe(1);
});
test('Redemption divides healing between units and bases and takes only the damage actually healed', () => {
  const p = board('redemption--medical-frigate', true);
  p.players[0].ground = [{ card: ids.consular, damage: 3, ref: 'unit' }];
  p.players[0].base.damage = 4;
  p.players[1].base.damage = 2;
  const g = scenario(p),
    pending = play(g.state, g.refs.card!);
  const selected = [
    g.refs.unit!,
    g.refs.unit!,
    g.state.players.alice!.base,
    g.state.players.alice!.base,
    g.state.players.bob!.base,
  ];
  resume(pending, choose(pending, 'accept-effect', selected));
  const s = step(pending, 'accept-effect', selected);
  expect(s.cards[g.refs.unit!]!.damage).toBe(1);
  expect(damage(s, 'alice')).toBe(2);
  expect(damage(s)).toBe(1);
  expect(s.cards[g.refs.card!]!.damage).toBe(5);
  const blocked = effects(g.state, [{ kind: 'prevent-base-healing' }]);
  const t = step(play(blocked, g.refs.card!), 'accept-effect', [g.state.players.alice!.base]);
  expect(t.cards[g.refs.card!]!.damage).toBe(0);
  expect(damage(t, 'alice')).toBe(4);
});

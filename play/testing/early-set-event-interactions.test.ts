import { expect, test } from 'bun:test';
import { Projector } from '../projection/projector.ts';
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
const modes = (s: GameState) =>
  s.execution.decision!.options.flatMap(o =>
    o.intent.kind === 'choose-mode' ? [o.intent.mode] : [],
  );
const units = (s: GameState, id: string, controller = 'alice') =>
  Object.values(s.cards).filter(
    c => c.zone === 'ground' && c.cardId === id && c.controller === controller,
  );
function event(id: string) {
  const p = board(id, true);
  p.players[0].ground = [{ card: ids.consular, ref: 'ally' }];
  p.players[1].ground = [{ card: ids.marine, ref: 'enemy' }];
  return p;
}
test('Aggression and Vigilance choose two different modes and resolve them in the selected order', () => {
  const a = scenario(event('aggression'));
  let s = mode(play(a.state, a.refs.card!), 'draw');
  expect(s.players.alice!.hand).toHaveLength(1);
  expect(modes(s)).not.toContain('draw');
  s = target(mode(s, 'damage'), a.refs.enemy!);
  expect(s.cards[a.refs.enemy!]!.zone).toBe('discard');
  const p = event('vigilance');
  p.players[0].base.damage = 7;
  const v = scenario(p);
  let t = target(mode(play(v.state, v.refs.card!), 'shield'), v.refs.ally!);
  expect(tokens(t, v.refs.ally!, 'shield')).toBe(1);
  expect(modes(t)).not.toContain('shield');
  t = target(mode(t, 'heal'), t.players.alice!.base);
  expect(damage(t, 'alice')).toBe(2);
});
test('Command remains in resources when the second mode resolves; Cunning uses modified power', () => {
  const g = scenario(event('command'));
  let s = mode(play(g.state, g.refs.card!), 'resource');
  expect(s.cards[g.refs.card!]!.zone).toBe('resources');
  expect(modes(s)).not.toContain('resource');
  s = target(mode(s, 'experience'), g.refs.ally!);
  expect(tokens(s, g.refs.ally!)).toBe(2);
  const h = scenario(event('cunning'));
  let t = target(mode(play(h.state, h.refs.card!), 'power'), h.refs.enemy!);
  expect(stats(t, h.refs.enemy!).power).toBe(7);
  t = mode(t, 'return');
  expect(targets(t)).not.toContain(h.refs.enemy!);
  expect(target(t, h.refs.ally!).cards[h.refs.ally!]!.zone).toBe('hand');
});
test('Attack Pattern Delta requires three distinct friendly units with descending bonuses', () => {
  const p = event('attack-pattern-delta');
  p.players[0].ground!.push(
    { card: ids.marine, ref: 'second' },
    { card: ids.trooper, ref: 'third' },
  );
  const g = scenario(p);
  let s = target(play(g.state, g.refs.card!), g.refs.ally!);
  expect(targets(s)).not.toContain(g.refs.ally!);
  s = target(s, g.refs.second!);
  expect(targets(s)).toEqual([g.refs.third!]);
  s = target(s, g.refs.third!);
  expect(stats(s, g.refs.ally!)).toEqual({ power: 6, hp: 10 });
  expect(stats(s, g.refs.second!)).toEqual({ power: 5, hp: 5 });
  expect(stats(s, g.refs.third!)).toEqual({ power: 4, hp: 2 });
});
test('Political Pressure lets the opponent discard randomly or create Droids, but an empty hand requires Droids', () => {
  const p = event('political-pressure');
  p.players[1].hand = [{ card: ids.marine }, { card: ids.fighter }];
  const g = scenario(p),
    pending = play(g.state, g.refs.card!);
  expect(pending.execution.decision!.playerId).toBe('bob');
  expect(mode(pending, 'discard').players.bob!.hand).toHaveLength(1);
  expect(units(mode(pending, 'droids'), 'battle-droid')).toHaveLength(2);
  p.players[1].hand = [];
  const h = scenario(p),
    s = play(h.state, h.refs.card!);
  expect(modes(s)).toEqual(['droids']);
  expect(units(mode(s, 'droids'), 'battle-droid')).toHaveLength(2);
});
for (const [id, n] of [
  ['no-bargain', 1],
  ['pillage', 2],
  ['spark-of-rebellion', 1],
] as const)
  test(`${id}: the correct player selects the discarded hand cards`, () => {
    const p = event(id);
    p.players[1].hand = [
      { card: ids.marine, ref: 'discard' },
      { card: ids.fighter, ref: 'other' },
    ];
    const g = scenario(p);
    let s = play(g.state, g.refs.card!);
    if (id === 'pillage') s = mode(s, 'enemy');
    expect(s.execution.decision!.playerId).toBe(id === 'spark-of-rebellion' ? 'alice' : 'bob');
    s = step(s, 'accept-effect', n === 2 ? [g.refs.discard!, g.refs.other!] : [g.refs.discard!]);
    expect(s.players.bob!.hand).toHaveLength(2 - n);
    expect(s.cards[g.refs.discard!]!.zone).toBe('discard');
    if (id === 'no-bargain') expect(s.players.alice!.hand).toHaveLength(1);
  });
test('Mission Briefing can draw for either player', () => {
  const g = scenario(event('mission-briefing')),
    s = play(g.state, g.refs.card!);
  expect(mode(s, 'self').players.alice!.hand).toHaveLength(2);
  expect(mode(s, 'enemy').players.bob!.hand).toHaveLength(2);
});
test('Cripple Authority draws before comparing resources', () => {
  for (const n of [20, 21]) {
    const p = event('cripple-authority');
    p.players[1].resources = resources(n);
    p.players[1].hand = [{ card: ids.fighter, ref: 'discard' }];
    const g = scenario(p);
    let s = play(g.state, g.refs.card!);
    expect(s.players.alice!.hand).toHaveLength(1);
    if (n === 21) s = step(s, 'accept-effect', [g.refs.discard!]);
    expect(s.players.bob!.hand).toHaveLength(n === 21 ? 0 : 1);
  }
});
test('Forced Surrender checks actual enemy base damage this phase', () => {
  const p = event('forced-surrender');
  p.players[1].hand = [
    { card: ids.marine, ref: 'one' },
    { card: ids.fighter, ref: 'two' },
  ];
  const g = scenario(p);
  expect(play(g.state, g.refs.card!).players.bob!.hand).toHaveLength(2);
  const damaged = effects(g.state, [{ kind: 'damage-bases', targets: 'enemy', amount: 1 }]);
  let s = play(damaged, g.refs.card!);
  expect(s.players.alice!.hand).toHaveLength(2);
  s = step(s, 'accept-effect', [g.refs.one!, g.refs.two!]);
  expect(s.players.bob!.hand).toHaveLength(0);
});
test('Unmasking the Conspiracy requires discarding a card before inspecting the opponent', () => {
  const p = event('unmasking-the-conspiracy');
  p.players[0].hand!.push({ card: ids.marine, ref: 'cost' });
  p.players[1].hand = [{ card: ids.fighter, ref: 'discard' }];
  const g = scenario(p);
  let s = step(play(g.state, g.refs.card!), 'accept-effect', [g.refs.cost!]);
  expect(s.execution.decision!.playerId).toBe('alice');
  s = step(s, 'accept-effect', [g.refs.discard!]);
  expect(s.players.alice!.hand).toHaveLength(0);
  expect(s.players.bob!.hand).toHaveLength(0);
  const q = event('unmasking-the-conspiracy');
  q.players[1].hand = [{ card: ids.fighter }];
  const h = scenario(q);
  expect(play(h.state, h.refs.card!).players.bob!.hand).toHaveLength(1);
});
test('Private Manufacturing bottoms two cards in chosen order unless a token unit is controlled', () => {
  const p = event('private-manufacturing');
  p.players[0].deck![0]!.ref = 'first';
  p.players[0].deck![1]!.ref = 'second';
  const g = scenario(p);
  let s = play(g.state, g.refs.card!);
  s = step(s, 'accept-effect', [g.refs.first!, g.refs.second!]);
  // The order continuation uses one target choice for each card.
  s = target(s, g.refs.second!);
  if (s.execution.decision!.kind !== 'action') s = target(s, g.refs.first!);
  expect(s.players.alice!.hand).toHaveLength(0);
  expect(s.players.alice!.deck.slice(-2)).toEqual([g.refs.second!, g.refs.first!]);
  p.players[0].ground!.push({ card: 'battle-droid' });
  const h = scenario(p);
  expect(play(h.state, h.refs.card!).players.alice!.hand).toHaveLength(2);
});
test('Reprocess returns only selected units and creates that many Droids; Restock also accepts events', () => {
  for (const id of ['reprocess', 'restock']) {
    const p = event(id);
    p.players[0].discard = [
      { card: ids.marine, ref: 'unit' },
      { card: 'waylay', ref: 'event' },
    ];
    const g = scenario(p);
    let s = play(g.state, g.refs.card!);
    if (id === 'restock') s = mode(s, 'self');
    const choices = s.execution.decision!.selection!.cards;
    expect(choices.includes(g.refs.event!)).toBe(id === 'restock');
    s = step(s, 'accept-effect', id === 'restock' ? [g.refs.unit!, g.refs.event!] : [g.refs.unit!]);
    expect(s.cards[g.refs.unit!]!.zone).toBe('deck');
    expect(units(s, 'battle-droid')).toHaveLength(id === 'reprocess' ? 1 : 0);
  }
});
test('Power of the Dark Side lets the opponent choose, including their deployed leader', () => {
  const p = event('power-of-the-dark-side');
  p.players[1].leader.deployedAs = 'unit';
  const g = scenario(p),
    s = play(g.state, g.refs.card!);
  expect(s.execution.decision!.playerId).toBe('bob');
  expect(targets(s)).not.toContain(g.refs.ally!);
  expect(target(s, s.players.bob!.leader).cards[s.players.bob!.leader]!.zone).toBe('base');
});
test('Merciless Contest defers both defeats until each controller has selected', () => {
  const g = scenario(event('merciless-contest')),
    s = target(play(g.state, g.refs.card!), g.refs.ally!);
  expect(s.cards[g.refs.ally!]!.zone).toBe('ground');
  expect(s.execution.decision!.playerId).toBe('bob');
  const done = target(s, g.refs.enemy!);
  expect(done.cards[g.refs.ally!]!.zone).toBe('discard');
  expect(done.cards[g.refs.enemy!]!.zone).toBe('discard');
});
for (const id of ['take-captive', 'relentless-pursuit', 'prisoner-of-war'])
  test(`${id}: captures the exact enemy and rescues it when its guard leaves`, () => {
    const p = event(id);
    p.players[1].space = [{ card: ids.fighter, ref: 'space' }];
    const g = scenario(p);
    let s = target(play(g.state, g.refs.card!), g.refs.ally!);
    expect(targets(s).includes(g.refs.space!)).toBe(id === 'relentless-pursuit');
    s = target(s, g.refs.enemy!);
    expect(s.cards[g.refs.enemy!]!.zone).toBe('captured');
    expect(s.cards[g.refs.enemy!]!.capturedBy?.instanceId).toBe(g.refs.ally!);
    if (id === 'prisoner-of-war') expect(units(s, 'battle-droid')).toHaveLength(2);
    s = defeat(s, g.refs.ally!);
    expect(s.cards[g.refs.enemy!]!.zone).toBe('ground');
    expect(s.cards[g.refs.enemy!]!.controller).toBe('bob');
    expect(s.cards[g.refs.enemy!]!.exhausted).toBe(true);
  });
test('Detention Block Rescue deals six to a guard, and Rule with Respect captures only base attackers', () => {
  const p = event('detention-block-rescue');
  p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
  p.captured = [{ card: ids.marine, guard: 'enemy', owner: 'alice', ref: 'prisoner' }];
  const g = scenario(p),
    s = target(play(g.state, g.refs.card!), g.refs.enemy!);
  expect(s.cards[g.refs.enemy!]!.damage).toBe(6);
  const q = event('rule-with-respect');
  q.activePlayer = 'bob';
  q.players[1].ground!.push({ card: ids.consular, ref: 'other' });
  const h = scenario(q);
  let t = attack(h.state, h.refs.enemy!, h.state.players.alice!.base);
  t = target(play(t, h.refs.card!), h.refs.ally!);
  t = step(t, 'accept-effect', [h.refs.enemy!]);
  expect(t.cards[h.refs.enemy!]!.zone).toBe('captured');
  expect(t.cards[h.refs.other!]!.zone).toBe('ground');
});
test('Choose Sides exchanges control but preserves ownership; Change of Heart returns at regroup', () => {
  const g = scenario(event('choose-sides')),
    s = target(target(play(g.state, g.refs.card!), g.refs.ally!), g.refs.enemy!);
  expect(s.cards[g.refs.ally!]!.controller).toBe('bob');
  expect(s.cards[g.refs.enemy!]!.controller).toBe('alice');
  expect(s.cards[g.refs.enemy!]!.owner).toBe('bob');
  const h = scenario(event('change-of-heart'));
  let t = target(play(h.state, h.refs.card!), h.refs.enemy!);
  expect(t.cards[h.refs.enemy!]!.controller).toBe('alice');
  t = step(t, 'take-initiative');
  t = step(t, 'pass');
  expect(t.cards[h.refs.enemy!]!.controller).toBe('bob');
});
test('Karabast and Strike True preserve the friendly unit as the damage source', () => {
  for (const id of ['karabast', 'strike-true']) {
    const p = event(id);
    p.players[0].ground![0]!.damage = 1;
    const g = scenario(p),
      s = target(target(play(g.state, g.refs.card!), g.refs.ally!), g.refs.enemy!);
    expect(s.cards[g.refs.enemy!]!.zone).toBe(id === 'strike-true' ? 'discard' : 'ground');
    if (id === 'karabast') expect(s.cards[g.refs.enemy!]!.damage).toBe(2);
    expect(s.facts.some(f => f.type === 'damage' && f.cards[0]?.instanceId === g.refs.ally)).toBe(
      true,
    );
  }
});
test('A hidden hand inspection reveals nothing to spectators when the secret card changes', () => {
  const states = [ids.marine, ids.fighter].map(secret => {
    const p = event('spark-of-rebellion');
    p.players[1].hand = [{ card: secret, ref: 'secret' }];
    const g = scenario(p);
    return play(g.state, g.refs.card!);
  });
  const project = (s: GameState) =>
    new Projector(s.gameId, { role: 'spectator' }, 'early-set-differential-secret-32').project(s);
  expect(project(states[0]!)).toEqual(project(states[1]!));
});

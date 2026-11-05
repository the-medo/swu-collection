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
  resources,
  resume,
  scenario,
  stats,
  step,
  target,
  targets,
  tokens,
  unit,
  use,
} from './early-set-completion-helpers.ts';
import type { GameState } from '../engine/model.ts';
const mode = (s: GameState, id: string) => step(s, i => i.kind === 'choose-mode' && i.mode === id);
const units = (s: GameState, id: string, controller = 'alice') =>
  Object.values(s.cards).filter(
    c => c.zone === 'ground' && c.cardId === id && c.controller === controller,
  );
const skipAmbush = (s: GameState) => {
  const f = s.execution.frames[0];
  return f?.kind === 'effect' && f.effect.kind === 'ambush' ? step(s, 'decline-effect') : s;
};
function played(id: string) {
  const p = board(id, true);
  p.players[0].ground = [{ card: ids.consular, ref: 'ally' }];
  p.players[1].ground = [{ card: ids.consular, ref: 'enemy', damage: 2 }];
  return p;
}
for (const [id, amount] of [
  ['admiral-ackbar--brilliant-strategist', 2],
  ['bounty-guild-initiate', 2],
  ['elite-p-38-starfighter', 1],
  ['devastator--inescapable', 20],
] as const)
  test(`${id}: optional play damage uses the printed amount and legal target`, () => {
    const p = played(id);
    if (id === 'bounty-guild-initiate')
      p.players[0].ground!.push({ card: 'zuckuss--bounty-hunter-for-hire' });
    const g = scenario(p);
    let s = skipAmbush(play(g.state, g.refs.card!));
    s = target(s, g.refs.enemy!);
    expect(s.cards[g.refs.enemy!]!.zone).toBe(amount >= 5 ? 'discard' : 'ground');
    if (amount < 5) expect(s.cards[g.refs.enemy!]!.damage).toBe(2 + amount);
  });
for (const [id, threshold] of [
  ['chewbacca--pykesbane', 5],
  ['count-dooku--darth-tyranus', 4],
  ['devastating-gunship', 2],
] as const)
  test(`${id}: defeats only units within its remaining-HP limit`, () => {
    const p = played(id);
    p.players[1].ground!.push({ card: ids.consular, damage: 7 - threshold, ref: 'victim' });
    const g = scenario(p),
      pending = skipAmbush(play(g.state, g.refs.card!));
    expect(targets(pending)).toContain(g.refs.victim!);
    expect(targets(pending)).not.toContain(g.refs.ally!);
    expect(target(pending, g.refs.victim!).cards[g.refs.victim!]!.zone).toBe('discard');
  });
test('501st Liberator and Cargo Juggernaut require another qualifying unit', () => {
  for (const id of ['501st-liberator', 'cargo-juggernaut'])
    for (const support of [false, true]) {
      const p = board(id, true);
      p.players[0].base.damage = 6;
      if (support)
        p.players[0].ground = [{ card: id === '501st-liberator' ? 'clone-trooper' : ids.consular }];
      const g = scenario(p);
      let s = play(g.state, g.refs.card!);
      if (id === '501st-liberator' && support) s = target(s, s.players.alice!.base);
      expect(damage(s, 'alice')).toBe(support ? (id === '501st-liberator' ? 3 : 2) : 6);
      if (id === 'cargo-juggernaut') expect(tokens(s, g.refs.card!, 'shield')).toBe(1);
    }
});
test('Academy Defense Walker gives Experience only to damaged friendly units', () => {
  const p = played('academy-defense-walker');
  p.players[0].ground![0]!.damage = 1;
  p.players[0].ground!.push({ card: ids.marine, ref: 'healthy' });
  const g = scenario(p),
    s = play(g.state, g.refs.card!);
  expect(tokens(s, g.refs.ally!)).toBe(1);
  expect(tokens(s, g.refs.healthy!)).toBe(0);
  expect(tokens(s, g.refs.enemy!)).toBe(0);
});
for (const [id, support] of [
  ['cartel-spacer', 'crafty-smuggler'],
  ['smuggler-s-starfighter', 'crafty-smuggler'],
] as const)
  test(`${id}: its conditional play ability excludes itself as support`, () => {
    const p = played(id);
    const alone = scenario(p),
      noEffect = play(alone.state, alone.refs.card!);
    expect(noEffect.execution.decision!.kind).toBe('action');
    p.players[0].ground!.push({ card: support });
    const g = scenario(p),
      s = target(play(g.state, g.refs.card!), g.refs.enemy!);
    if (id === 'cartel-spacer') expect(s.cards[g.refs.enemy!]!.exhausted).toBe(true);
    else expect(stats(s, g.refs.enemy!).power).toBe(0);
  });
test('Discerning Veteran captures a ground non-leader and frees it on defeat', () => {
  const p = played('discerning-veteran');
  p.players[1].space = [{ card: ids.fighter, ref: 'space' }];
  p.players[1].leader.deployedAs = 'unit';
  const g = scenario(p),
    pending = play(g.state, g.refs.card!);
  expect(targets(pending)).toEqual([g.refs.enemy!]);
  const s = target(pending, g.refs.enemy!);
  expect(s.cards[g.refs.enemy!]!.zone).toBe('captured');
  expect(defeat(s, g.refs.card!).cards[g.refs.enemy!]!.zone).toBe('ground');
});
test('Avenger gives the opponent a non-leader defeat choice on play and on attack', () => {
  const p = played('avenger--hunting-star-destroyer');
  p.players[1].ground!.push({ card: ids.marine, ref: 'second' });
  const g = scenario(p),
    pending = play(g.state, g.refs.card!);
  expect(pending.execution.decision!.playerId).toBe('bob');
  let s = target(pending, g.refs.enemy!);
  expect(s.cards[g.refs.enemy!]!.zone).toBe('discard');
  s = effects(s, [{ kind: 'ready-units', filter: { controller: 'friendly' } }]);
  s = attack(step(s, 'pass'), g.refs.card!);
  expect(s.execution.decision!.playerId).toBe('bob');
  s = target(s, g.refs.second!);
  expect(s.cards[g.refs.second!]!.zone).toBe('discard');
});
for (const id of ['captain-typho--protecting-the-senator', 'specforce-soldier'])
  test(`${id}: changes Sentinel on the selected unit`, () => {
    const p = played(id);
    p.players[1].ground = [{ card: 'cell-block-guard', ref: 'enemy' }];
    const g = scenario(p),
      s = target(play(g.state, g.refs.card!), g.refs.enemy!);
    expect(abilities(s, g.refs.enemy!).keywords?.includes('Sentinel') ?? false).toBe(
      id === 'captain-typho--protecting-the-senator',
    );
  });
test('Bodhi discards only a non-unit from the inspected enemy hand', () => {
  const p = played('bodhi-rook--imperial-defector');
  p.players[1].hand = [
    { card: ids.marine, ref: 'unit' },
    { card: 'waylay', ref: 'event' },
  ];
  const g = scenario(p),
    pending = play(g.state, g.refs.card!);
  expect(pending.execution.decision!.selection!.cards).toEqual([g.refs.event!]);
  expect(step(pending, 'accept-effect', [g.refs.event!]).players.bob!.hand).toEqual([g.refs.unit!]);
});
test('Bright Hope draws only after a friendly ground non-leader is returned', () => {
  const g = scenario(played('bright-hope--the-last-transport')),
    s = target(play(g.state, g.refs.card!), g.refs.ally!);
  expect(s.cards[g.refs.ally!]!.zone).toBe('hand');
  expect(s.players.alice!.hand).toHaveLength(2);
  expect(targets(play(g.state, g.refs.card!))).not.toContain(g.refs.card!);
});
test('Royal Guard Attaché damages itself; Ruthless Assassin chooses a friendly unit', () => {
  const g = scenario(played('royal-guard-attach-')),
    s = play(g.state, g.refs.card!);
  expect(s.cards[g.refs.card!]!.damage).toBe(2);
  const h = scenario(played('ruthless-assassin')),
    pending = play(h.state, h.refs.card!);
  expect(targets(pending)).not.toContain(h.refs.enemy!);
  expect(target(pending, h.refs.card!).cards[h.refs.card!]!.damage).toBe(2);
});
test('Emperor Palpatine divides six damage among enemy units in either arena', () => {
  const p = played('emperor-palpatine--master-of-the-dark-side');
  p.players[1].space = [{ card: ids.fighter, ref: 'space' }];
  const g = scenario(p),
    pending = play(g.state, g.refs.card!);
  expect(pending.execution.decision!.selection!.cards).not.toContain(g.refs.ally!);
  const s = step(pending, 'accept-effect', [
    g.refs.enemy!,
    g.refs.enemy!,
    g.refs.enemy!,
    g.refs.enemy!,
    g.refs.space!,
    g.refs.space!,
  ]);
  expect(s.cards[g.refs.enemy!]!.damage).toBe(6);
  expect(s.cards[g.refs.space!]!.zone).toBe('discard');
});
for (const [id, support, token] of [
  ['trade-federation-shuttle', ids.marine, 'battle-droid'],
  ['subjugating-starfighter', ids.marine, 'battle-droid'],
] as const)
  test(`${id}: creates its token only when its condition holds`, () => {
    const p = board(id, true);
    if (id === 'trade-federation-shuttle') p.players[0].ground = [{ card: support, damage: 1 }];
    const g = scenario(p),
      s = skipAmbush(play(g.state, g.refs.card!));
    expect(units(s, token)).toHaveLength(1);
    if (id === 'trade-federation-shuttle') p.players[0].ground![0]!.damage = 0;
    else p.initiative.holder = 'bob';
    const h = scenario(p);
    expect(units(skipAmbush(play(h.state, h.refs.card!)), token)).toHaveLength(0);
  });
test('Reckless Gunslinger damages both bases; Vanguard Droid Bomber damages only the enemy with another Separatist', () => {
  const g = scenario(played('reckless-gunslinger')),
    s = play(g.state, g.refs.card!);
  expect(damage(s)).toBe(1);
  expect(damage(s, 'alice')).toBe(1);
  const p = board('vanguard-droid-bomber', true);
  const a = scenario(p);
  expect(damage(play(a.state, a.refs.card!))).toBe(0);
  p.players[0].ground = [{ card: 'battle-droid' }];
  const h = scenario(p);
  expect(damage(play(h.state, h.refs.card!))).toBe(2);
});
test('Wild Rancor damages every other ground unit simultaneously', () => {
  const p = played('wild-rancor');
  p.players[1].space = [{ card: ids.fighter, ref: 'space' }];
  const g = scenario(p),
    s = play(g.state, g.refs.card!);
  expect(s.cards[g.refs.ally!]!.damage).toBe(2);
  expect(s.cards[g.refs.enemy!]!.damage).toBe(4);
  expect(s.cards[g.refs.card!]!.damage).toBe(0);
  expect(s.cards[g.refs.space!]!.damage).toBe(0);
});
test('Wolffe’s healing prohibition persists after he leaves play', () => {
  const p = played('wolffe--suspicious-veteran');
  p.players[0].base.damage = 5;
  const g = scenario(p),
    s = effects(defeat(play(g.state, g.refs.card!), g.refs.card!), [
      { kind: 'heal-own-base', amount: 4 },
    ]);
  expect(damage(s, 'alice')).toBe(5);
});
test('Favorable Delegate draws on play and makes its controller discard on defeat', () => {
  const g = scenario(played('favorable-delegate'));
  let s = play(g.state, g.refs.card!);
  expect(s.players.alice!.hand).toHaveLength(1);
  const drawn = s.players.alice!.hand[0]!;
  s = defeat(s, g.refs.card!);
  expect(s.execution.decision!.playerId).toBe('alice');
  s = step(s, 'accept-effect', [drawn]);
  expect(s.players.alice!.hand).toHaveLength(0);
});
test('AT-TE Vanguard creates two Clones when defeated; Senatorial Corvette makes its opponent discard', () => {
  const g = scenario(board('at-te-vanguard')),
    s = defeat(g.state, g.refs.card!);
  expect(units(s, 'clone-trooper')).toHaveLength(2);
  const p = board('senatorial-corvette');
  p.players[1].hand = [{ card: ids.marine, ref: 'discard' }];
  const h = scenario(p),
    pending = defeat(h.state, h.refs.card!);
  expect(pending.execution.decision!.playerId).toBe('bob');
  expect(step(pending, 'accept-effect', [h.refs.discard!]).players.bob!.hand).toHaveLength(0);
});
test('Bo-Katan draws once for each heavily damaged base and Star Wing Scout requires initiative', () => {
  for (const n of [0, 1, 2]) {
    const p = board('bo-katan-kryze--fighting-for-mandalore');
    p.players[0].base.damage = n >= 1 ? 15 : 14;
    p.players[1].base.damage = n === 2 ? 15 : 14;
    const g = scenario(p);
    expect(defeat(g.state, g.refs.card!).players.alice!.hand).toHaveLength(n);
  }
  for (const holder of ['alice', 'bob']) {
    const p = board('star-wing-scout');
    p.initiative.holder = holder;
    const g = scenario(p);
    expect(defeat(g.state, g.refs.card!).players.alice!.hand).toHaveLength(
      holder === 'alice' ? 2 : 0,
    );
  }
});
test('4-LOM and Zuckuss grant their bonuses only to their named partners', () => {
  const p = board('4-lom--bounty-hunter-for-hire');
  p.players[0].ground!.push(
    { card: 'zuckuss--bounty-hunter-for-hire', ref: 'partner' },
    { card: ids.marine, ref: 'other' },
  );
  const g = scenario(p);
  expect(stats(g.state, g.refs.partner!)).toEqual({
    power: unit('zuckuss--bounty-hunter-for-hire').power + 1,
    hp: unit('zuckuss--bounty-hunter-for-hire').hp + 1,
  });
  expect(abilities(g.state, g.refs.partner!).keywords).toContain('Ambush');
  expect(abilities(g.state, g.refs.card!).keywords).toContain('Saboteur');
  expect(stats(g.state, g.refs.other!)).toEqual({ power: 3, hp: 3 });
});

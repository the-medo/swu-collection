import { expect, test } from 'bun:test';
import { cardTraits } from '../engine/attributes.ts';
import { move } from '../engine/state.ts';
import {
  abilities,
  attack,
  attacks,
  blank,
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
  tokens,
  unit,
  use,
} from './early-set-completion-helpers.ts';

// Printed SOR/SHD/TWI text and Comprehensive Rules v8 §§7.5–7.7, 8.11, 8.14.
test('97th Legion tracks all resources continuously, excluding Credits, and ability loss defeats its zero-HP body', () => {
  const p = board('97th-legion--keeping-the-peace-on-sullust');
  p.players[0].resources = resources(7);
  p.players[0].credits = ['credit'];
  const g = scenario(p);
  expect(stats(g.state, g.refs.card!)).toEqual({ power: 7, hp: 7 });
  const s = effects(g.state, [
    {
      kind: 'select-resources',
      player: 'self',
      exhausted: 'any',
      min: 1,
      max: 1,
      operation: 'defeat',
    },
  ]);
  const done = step(s, 'accept-effect', [g.state.players.alice!.resources[0]!]);
  expect(stats(done, g.refs.card!)).toEqual({ power: 6, hp: 6 });
  const blanked = effects(
    done,
    [
      {
        kind: 'on-unit',
        target: 'source',
        operation: { kind: 'modify', power: 0, hp: 0, duration: 'phase', loseAbilities: true },
      },
    ],
    g.refs.card!,
  );
  expect(blanked.cards[g.refs.card!]!.zone).toBe('discard');
});

for (const [card, ally, kw] of [
  ['escort-skiff', ids.marine, 'Ambush'],
  ['frontier-at-rt', ids.fighter, 'Ambush'],
  ['gamorrean-guards', 'crafty-smuggler', 'Sentinel'],
  ['droid-commando', 'battle-droid', 'Ambush'],
] as const)
  test(`${card}: requires another friendly unit with its printed aspect or trait`, () => {
    const p = board(card),
      d = unit(ally);
    p.players[1][d.arena] = [{ card: ally }];
    const alone = scenario(p);
    expect(abilities(alone.state, alone.refs.card!).keywords).not.toContain(kw);
    p.players[0][d.arena] ??= [];
    p.players[0][d.arena]!.push({ card: ally, ref: 'ally' });
    const g = scenario(p);
    expect(abilities(g.state, g.refs.card!).keywords).toContain(kw);
    expect(abilities(defeat(g.state, g.refs.ally!), g.refs.card!).keywords).not.toContain(kw);
  });

test('Bo-Katan independently checks other Mandalorians and Troopers', () => {
  for (const allies of [
    [],
    ['clan-wren-rescuer'],
    ['battle-droid'],
    ['clan-wren-rescuer', 'battle-droid'],
  ]) {
    const p = board('bo-katan-kryze--death-watch-lieutenant');
    p.players[0].ground!.push(...allies.map(card => ({ card })));
    const g = scenario(p);
    expect(abilities(g.state, g.refs.card!).keywords?.includes('Saboteur') ?? false).toBe(
      allies.includes('clan-wren-rescuer'),
    );
    expect(stats(g.state, g.refs.card!).power).toBe(
      unit(p.players[0].ground![0]!.card).power +
        (allies.includes('battle-droid') || allies.includes('clan-wren-rescuer') ? 1 : 0),
    );
  }
});

for (const [card, support, bonus] of [
  ['partisan-insurgent', ids.trooper, 2],
  ['separatist-commando', 'battle-droid', 2],
] as const)
  test(`${card}: conditional Raid applies on attack and not after support leaves`, () => {
    const p = board(card);
    p.players[0].ground!.push({ card: support, ref: 'support' });
    const g = scenario(p),
      d = unit(card);
    expect(damage(attack(g.state, g.refs.card!))).toBe(d.power + bonus);
    expect(stats(g.state, g.refs.card!).power).toBe(d.power);
    expect(abilities(defeat(g.state, g.refs.support!), g.refs.card!).raid ?? 0).toBe(0);
  });

test('Relentless Rocket Droid requires another Trooper and Seasoned Shoretrooper counts exhausted resources', () => {
  const p = board('relentless-rocket-droid');
  p.players[0].ground!.push({ card: 'battle-droid', ref: 'trooper' });
  const g = scenario(p);
  expect(stats(g.state, g.refs.card!).power).toBe(5);
  expect(stats(defeat(g.state, g.refs.trooper!), g.refs.card!).power).toBe(3);
  for (const n of [5, 6]) {
    const q = board('seasoned-shoretrooper');
    q.players[0].resources = resources(n).map(r => ({ ...r, exhausted: true }));
    const h = scenario(q);
    expect(stats(h.state, h.refs.card!).power).toBe(n === 6 ? 4 : 2);
  }
});

test('Anakin’s Interceptor switches its bonus at 15 base damage', () => {
  for (const n of [14, 15]) {
    const p = board('anakin-s-interceptor--where-the-fun-begins');
    p.players[0].base.damage = n;
    const g = scenario(p);
    expect(stats(g.state, g.refs.card!).power).toBe(
      unit(p.players[0].space![0]!.card).power + (n >= 15 ? 2 : 0),
    );
  }
});

test('Undamaged conditions remove Sentinel and Restore immediately after damage', () => {
  for (const card of ['vigilant-honor-guards', 'daughter-of-dathomir']) {
    const g = scenario(board(card));
    if (card === 'vigilant-honor-guards')
      expect(abilities(g.state, g.refs.card!).keywords).toContain('Sentinel');
    else expect(abilities(g.state, g.refs.card!).restore).toBe(2);
    const s = effects(
      g.state,
      [{ kind: 'damage-target', target: 'source', amount: 1 }],
      g.refs.card!,
    );
    if (card === 'vigilant-honor-guards')
      expect(abilities(s, g.refs.card!).keywords).not.toContain('Sentinel');
    else expect(abilities(s, g.refs.card!).restore ?? 0).toBe(0);
  }
});

test('Duchess’s Champion counts only enemy units and Baze requires initiative ownership', () => {
  for (const n of [2, 3]) {
    const p = board('duchess-s-champion');
    p.players[1].ground = Array.from({ length: n }, () => ({ card: ids.marine }));
    const g = scenario(p);
    expect(abilities(g.state, g.refs.card!).keywords?.includes('Sentinel') ?? false).toBe(n === 3);
  }
  for (const holder of ['alice', 'bob']) {
    const p = board('baze-malbus--temple-guardian');
    p.initiative.holder = holder;
    const g = scenario(p);
    expect(abilities(g.state, g.refs.card!).keywords?.includes('Sentinel') ?? false).toBe(
      holder === 'alice',
    );
  }
});

test('Royal Guard gains HP from undeployed Palpatine but requires an Official unit for Sentinel', () => {
  const p = board('emperor-s-royal-guard');
  p.players[0].leader.card = 'emperor-palpatine--galactic-ruler';
  const g = scenario(p);
  expect(stats(g.state, g.refs.card!).hp).toBe(5);
  // The printed Sentinel condition requires an Official UNIT, not the undeployed leader.
  expect(abilities(g.state, g.refs.card!).keywords).not.toContain('Sentinel');
  p.players[0].leader.deployedAs = 'unit';
  const deployed = scenario(p);
  expect(abilities(deployed.state, deployed.refs.card!).keywords).toContain('Sentinel');
});

test('Coordinate auras and keywords count self and stop below three units', () => {
  for (const [card, keyword] of [
    ['infantry-of-the-212th', 'Sentinel'],
    ['coruscant-guard', 'Ambush'],
    ['clone-commander-cody--commanding-the-212th', 'Overwhelm'],
  ] as const) {
    const p = board(card);
    p.players[0].ground!.push(
      { card: ids.marine, ref: 'ally' },
      { card: 'battle-droid', ref: 'token' },
    );
    const g = scenario(p);
    if (card.startsWith('clone-commander')) {
      expect(stats(g.state, g.refs.ally!)).toEqual({ power: 4, hp: 4 });
      expect(abilities(g.state, g.refs.ally!).keywords).toContain(keyword);
      const s = defeat(g.state, g.refs.token!);
      expect(stats(s, g.refs.ally!)).toEqual({ power: 3, hp: 3 });
    } else {
      expect(abilities(g.state, g.refs.card!).keywords).toContain(keyword);
      expect(abilities(defeat(g.state, g.refs.token!), g.refs.card!).keywords).not.toContain(
        keyword,
      );
    }
  }
});

test('Jyn Stardust reacts to an enemy defeat but not a friendly defeat', () => {
  const p = board('jyn-erso--stardust');
  p.players[1].ground = [{ card: ids.marine, ref: 'enemy' }];
  p.players[0].ground!.push({ card: ids.marine, ref: 'ally' });
  const g = scenario(p);
  expect(stats(defeat(g.state, g.refs.ally!), g.refs.card!).power).toBe(3);
  const s = defeat(g.state, g.refs.enemy!);
  expect(stats(s, g.refs.card!).power).toBe(4);
  expect(abilities(s, g.refs.card!).keywords).toContain('Saboteur');
});

for (const [card, ally, pBonus, hBonus, keyword] of [
  ['admiral-yularen--advising-caution', ids.marine, 0, 1, undefined],
  ['wedge-antilles--star-of-the-rebellion', ids.fighter, 1, 1, 'Ambush'],
  ['admiral-piett--captain-of-the-executor', 'at-st', 0, 0, 'Ambush'],
] as const)
  test(`${card}: its aura applies to eligible friendly units and ends with ability loss`, () => {
    const p = board(card),
      d = unit(ally);
    p.players[0][d.arena] ??= [];
    p.players[0][d.arena]!.push({ card: ally, ref: 'ally' });
    p.players[1][d.arena] = [{ card: ally, ref: 'enemy' }];
    const g = scenario(p);
    expect(stats(g.state, g.refs.ally!)).toEqual({ power: d.power + pBonus, hp: d.hp + hBonus });
    expect(stats(g.state, g.refs.enemy!)).toEqual({ power: d.power, hp: d.hp });
    if (keyword) expect(abilities(g.state, g.refs.ally!).keywords).toContain(keyword);
    blank(g.state, g.refs.card!);
    expect(stats(g.state, g.refs.ally!)).toEqual({ power: d.power, hp: d.hp });
    if (keyword && !d.keywords?.includes(keyword))
      expect(abilities(g.state, g.refs.ally!).keywords).not.toContain(keyword);
  });

test('Red Three adds Raid to other Heroism units, while Snoke weakens only enemy non-leaders', () => {
  const p = board('red-three--unstoppable');
  p.players[0].ground = [{ card: ids.marine, ref: 'ally' }];
  const g = scenario(p);
  expect(damage(attack(g.state, g.refs.ally!))).toBe(4);
  const q = board('supreme-leader-snoke--shadow-ruler');
  q.players[1].leader.deployedAs = 'unit';
  q.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
  const h = scenario(q);
  expect(stats(h.state, h.refs.enemy!)).toEqual({ power: 1, hp: 5 });
  expect(stats(h.state, h.state.players.bob!.leader).power).toBe(2);
});

for (const card of ['han-solo--reluctant-hero', 'incinerator-trooper'])
  test(`${card}: first combat damage prevents a defeated defender retaliating`, () => {
    const p = board(card);
    p.players[1].ground = [{ card: ids.trooper, ref: 'enemy' }];
    const g = scenario(p),
      s = attack(g.state, g.refs.card!, g.refs.enemy!);
    expect(s.cards[g.refs.enemy!]!.zone).toBe('discard');
    expect(s.cards[g.refs.card!]!.damage).toBe(0);
  });

test('First Legion Snowtrooper gets Overwhelm and +2 only against a damaged unit', () => {
  const p = board('first-legion-snowtrooper');
  p.players[1].ground = [{ card: ids.marine, damage: 2, ref: 'enemy' }];
  const g = scenario(p),
    s = attack(g.state, g.refs.card!, g.refs.enemy!);
  expect(damage(s)).toBe(3);
  expect(stats(s, g.refs.card!).power).toBe(2);
});

test('Strafing Gunship can attack ground units and reduces their defending power', () => {
  const p = board('strafing-gunship');
  p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
  const g = scenario(p);
  expect(attacks(g.state)).toContain(g.refs.enemy!);
  const s = attack(g.state, g.refs.card!, g.refs.enemy!);
  expect(s.cards[g.refs.card!]!.damage).toBe(1);
});

test('Confederate Tri-Fighter stops healing both bases until it leaves play', () => {
  const p = board('confederate-tri-fighter');
  p.players[0].base.damage = 5;
  p.players[1].base.damage = 5;
  const g = scenario(p),
    healed = effects(g.state, [
      { kind: 'heal-own-base', amount: 3 },
      { kind: 'heal-own-base', amount: 3, player: 'enemy' },
    ]);
  expect(damage(healed)).toBe(5);
  expect(damage(healed, 'alice')).toBe(5);
  expect(
    damage(effects(defeat(g.state, g.refs.card!), [{ kind: 'heal-own-base', amount: 3 }]), 'alice'),
  ).toBe(2);
});

for (const [card, cost] of [
  ['nite-owl-skirmisher', 5],
  ['pirate-battle-tank', 7],
  ['sugi--hired-guardian', 6],
  ['vigilant-pursuit-craft', 7],
  ['warbird-stowaway', 4],
] as const)
  test(`${card}: Smuggle replaces the played resource and pays its own aspect-adjusted cost`, () => {
    const p = position();
    p.players[0].resources = resources();
    p.players[0].resources[0] = { card, ref: 'card' };
    p.players[0].deck![0]!.ref = 'replacement';
    const g = scenario(p),
      s = step(g.state, i => i.kind === 'play' && i.card === g.refs.card && !!i.smuggle);
    expect(s.cards[g.refs.card!]!.zone).toBe(unit(card).arena);
    expect(s.cards[g.refs.replacement!]!.zone).toBe('resources');
    expect(s.cards[g.refs.replacement!]!.exhausted).toBe(true);
    expect(s.players.alice!.resources).toHaveLength(20);
    const played = s.facts.find(
      f => f.type === 'played' && f.cards.some(c => c.instanceId === g.refs.card),
    )!;
    expect(played.amount).toBe(cost + (card === 'nite-owl-skirmisher' ? 0 : 2));
  });

test('Foundling grants a trait directly, while Sentinel and Squad Support are removable host abilities', () => {
  const p = position();
  p.players[0].ground = [{ card: ids.marine, ref: 'host' }];
  p.attachments = [
    { card: 'foundling', unit: 'host', ref: 'foundling' },
    { card: 'protector', unit: 'host' },
    { card: 'squad-support', unit: 'host' },
  ];
  const g = scenario(p);
  expect(cardTraits(g.state, g.state.cards[g.refs.host!]!)).toContain('Mandalorian');
  expect(stats(g.state, g.refs.host!)).toEqual({ power: 6, hp: 6 });
  expect(abilities(g.state, g.refs.host!).keywords).toContain('Sentinel');
  blank(g.state, g.refs.host!);
  expect(cardTraits(g.state, g.state.cards[g.refs.host!]!)).toContain('Mandalorian');
  expect(stats(g.state, g.refs.host!)).toEqual({ power: 5, hp: 5 });
  expect(abilities(g.state, g.refs.host!).keywords).not.toContain('Sentinel');
});

test('Electrostaff is a direct modifier even if its host loses abilities', () => {
  const p = position();
  p.players[0].ground = [{ card: ids.consular, ref: 'attacker' }];
  p.players[1].ground = [{ card: ids.consular, ref: 'host' }];
  p.attachments = [{ card: 'electrostaff', unit: 'host', owner: 'bob' }];
  const g = scenario(p);
  blank(g.state, g.refs.host!);
  const s = attack(g.state, g.refs.attacker!, g.refs.host!);
  expect(s.cards[g.refs.host!]!.damage).toBe(2);
});

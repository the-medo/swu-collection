import { expect, test } from 'bun:test';
import { cardDefinition } from '../cards/registry.ts';
import { decodeState, encodeState } from '../engine/checkpoint.ts';
import { addCard, move, playCost } from '../engine/state.ts';
import { attach } from '../engine/attachments.ts';
import { scenario } from './scenario.ts';
import {
  attack,
  blank,
  board,
  ids,
  keyword,
  nextOwn,
  options,
  play,
  position,
  refresh,
  select,
  stats,
  step,
  target,
  tokens,
} from './jtl-helpers.ts';
const printed = (id: string) => {
  const d = cardDefinition(id);
  if (d.kind !== 'unit') throw Error();
  return d;
};
for (const id of ['jedi-light-cruiser', 'munificent-frigate'])
  test(`${id} plays exhausted with its printed combat statistics`, () => {
    const g = scenario(board(id));
    const s = play(g.state, g.refs.source!);
    expect(s.cards[g.refs.source!]!.exhausted).toBe(true);
    expect(stats(s, g.refs.source!)).toEqual({ power: printed(id).power, hp: printed(id).hp });
  });
for (const id of [
  'corellian-freighter',
  'omicron-strike-craft',
  'perimeter-at-rt',
  'rogue-class-starfighter',
  'scouting-headhunter',
  'shadowed-hover-tank',
])
  test(`${id} protects its arena through Sentinel`, () => {
    const p = board(id, false),
      d = printed(id);
    p.activePlayer = 'bob';
    p.players[1][d.arena] = [
      { card: d.arena === 'space' ? 'munificent-frigate' : ids.consular, ref: 'enemy' },
    ];
    const g = scenario(p);
    const attacks = options(g.state).filter(i => i.kind === 'attack');
    expect(attacks.some(i => i.defender === g.refs.source)).toBe(true);
    expect(attacks.some(i => i.defender === g.state.players.alice!.base)).toBe(false);
  });
for (const id of ['occupier-siege-tank', 'royal-security-fighter'])
  test(`${id} converts its damage to attacking Grit power`, () => {
    const p = board(id, false),
      d = printed(id);
    p.players[0][d.arena]![0]!.damage = 1;
    const g = scenario(p),
      s = attack(g.state, g.refs.source!);
    expect(s.cards[s.players.bob!.base]!.damage).toBe(d.power + 1);
  });
for (const id of ['outer-rim-outlaws', 'techno-union-transport'])
  test(`${id} creates its own Shield only when played`, () => {
    const g = scenario(board(id));
    expect(tokens(play(g.state, g.refs.source!), g.refs.source!, 'shield')).toBe(1);
  });
test('Adept ARC-170 restores two; Corporate Light Cruiser uses Ambush while exhausted and Raid only during attack', () => {
  const p = board('adept-arc-170', false);
  p.players[0].base.damage = 5;
  const a = scenario(p);
  expect(attack(a.state, a.refs.source!).cards[a.state.players.alice!.base]!.damage).toBe(3);
  const q = board('corporate-light-cruiser');
  q.players[1].space = [{ card: 'munificent-frigate', ref: 'enemy' }];
  const b = scenario(q);
  let s = play(b.state, b.refs.source!);
  expect(s.cards[b.refs.source!]!.exhausted).toBe(true);
  s = target(s, b.refs.enemy!);
  expect(s.cards[b.refs.enemy!]!.damage).toBe(5);
  expect(stats(s, b.refs.source!).power).toBe(4);
});
test('Corporate Defense Shuttle cannot attack despite being ready', () => {
  const g = scenario(board('corporate-defense-shuttle', false));
  expect(options(g.state).some(i => i.kind === 'attack' && i.attacker === g.refs.source)).toBe(
    false,
  );
  expect(g.state.cards[g.refs.source!]!.exhausted).toBe(false);
});
for (const id of [
  'dagger-squadron-pilot',
  'determined-recruit',
  'hopeful-volunteer',
  'indoctrinated-conscript',
  'sullustan-spacer',
  'interceptor-ace',
])
  test(`${id} plays in either role and obeys occupied-host restrictions`, () => {
    const p = board(id);
    p.players[0].space = [
      { card: 'munificent-frigate', ref: 'host' },
      { card: 'munificent-frigate', ref: 'occupied' },
    ];
    p.attachments = [{ card: 'clone-pilot', unit: 'occupied' }];
    const g = scenario(p),
      d = printed(id);
    expect(options(g.state).some(i => i.kind === 'play' && i.target === g.refs.occupied)).toBe(
      false,
    );
    const unit = play(g.state, g.refs.source!);
    expect(unit.cards[g.refs.source!]!.zone).toBe('ground');
    const pilot = play(g.state, g.refs.source!, g.refs.host!);
    expect(pilot.cards[g.refs.source!]!.attachedTo?.instanceId).toBe(g.refs.host);
    expect(stats(pilot, g.refs.host!)).toEqual({
      power: 4 + d.upgrade!.modifiers.power,
      hp: 7 + d.upgrade!.modifiers.hp,
    });
    if (id === 'interceptor-ace') {
      pilot.cards[g.refs.host!]!.damage = 2;
      expect(stats(pilot, g.refs.host!).power).toBe(8);
      expect(keyword(unit, g.refs.source!, 'Grit')).toBe(true);
    }
    expect(decodeState(encodeState(pilot))).toEqual(pilot);
  });
test('Homestead Militia checks total resources at six; Bunker Defender requires a controlled Vehicle', () => {
  const p = board('homestead-militia', false);
  p.players[0].resources = p.players[0].resources!.slice(0, 5);
  const a = scenario(p);
  expect(keyword(a.state, a.refs.source!, 'Sentinel')).toBe(false);
  addCard(a.state, 'alice', ids.marine, 'resources');
  expect(keyword(a.state, a.refs.source!, 'Sentinel')).toBe(true);
  blank(a.state, a.refs.source!);
  expect(keyword(a.state, a.refs.source!, 'Sentinel')).toBe(false);
  const q = board('bunker-defender', false);
  q.players[1].space = [{ card: ids.fighter, ref: 'enemy' }];
  const b = scenario(q);
  expect(keyword(b.state, b.refs.source!, 'Sentinel')).toBe(false);
  b.state.cards[b.refs.enemy!]!.controller = 'alice';
  expect(keyword(b.state, b.refs.source!, 'Sentinel')).toBe(true);
});
test('Flanking Fang Fighter requires another controlled Fighter, and Resistance X-Wing requires a Pilot upgrade', () => {
  const p = board('flanking-fang-fighter', false);
  const a = scenario(p);
  expect(attack(a.state, a.refs.source!).cards[a.state.players.bob!.base]!.damage).toBe(2);
  addCard(a.state, 'alice', ids.fighter, 'space');
  refresh(a.state);
  expect(attack(a.state, a.refs.source!).cards[a.state.players.bob!.base]!.damage).toBe(4);
  const b = scenario(board('resistance-x-wing', false));
  const u = addCard(b.state, 'alice', 'clone-pilot', 'hand');
  attach(b.state, u, b.state.cards[b.refs.source!]!, false);
  expect(stats(b.state, b.refs.source!)).toEqual({ power: 5, hp: 5 });
  blank(b.state, b.refs.source!);
  expect(stats(b.state, b.refs.source!)).toEqual({ power: 4, hp: 4 });
});
test('AT-DP counts damaged ground units from both players, excluding space and undamaged units', () => {
  const p = board('at-dp-occupier');
  p.players[0].ground = [{ card: ids.marine, damage: 1 }];
  p.players[1].ground = [{ card: ids.marine, damage: 1 }, { card: ids.consular }];
  p.players[1].space = [{ card: 'munificent-frigate', damage: 2 }];
  const g = scenario(p);
  expect(playCost(g.state, g.state.cards[g.refs.source!]!)).toBe(2);
});
test('Captain Tarkin boosts friendly Vehicles, drops his aura on departure, and D-Qar loses power for current damage', () => {
  const p = board('captain-tarkin--full-forward-assault', false);
  p.players[0].space = [{ card: 'd-qar-cargo-frigate', damage: 2, ref: 'ship' }];
  p.players[1].space = [{ card: 'munificent-frigate', ref: 'enemy' }];
  const g = scenario(p);
  expect(stats(g.state, g.refs.ship!).power).toBe(5);
  expect(keyword(g.state, g.refs.ship!, 'Overwhelm')).toBe(true);
  expect(stats(g.state, g.refs.enemy!).power).toBe(4);
  move(g.state, g.state.cards[g.refs.source!]!, 'discard');
  expect(stats(g.state, g.refs.ship!).power).toBe(4);
  blank(g.state, g.refs.ship!);
  expect(stats(g.state, g.refs.ship!).power).toBe(6);
});
test('IG-88 has a separate conditional power ability as a unit and as a Pilot grant', () => {
  const p = board('ig-88--murderous-phlutdroid');
  p.players[0].space = [{ card: 'munificent-frigate', ref: 'host' }];
  p.players[1].ground = [{ card: ids.marine, damage: 1, ref: 'enemy' }];
  const g = scenario(p);
  expect(stats(play(g.state, g.refs.source!), g.refs.source!).power).toBe(7);
  const s = play(g.state, g.refs.source!, g.refs.host!);
  expect(stats(s, g.refs.host!).power).toBe(7);
  s.cards[g.refs.enemy!]!.damage = 0;
  expect(stats(s, g.refs.host!).power).toBe(4);
});
for (const base of [true, false])
  test(`Repair heals three from ${base ? 'a base' : 'a unit'} and can target the opponent`, () => {
    const p = board('repair');
    p.players[1].base.damage = 5;
    p.players[1].ground = [{ card: ids.consular, damage: 4, ref: 'enemy' }];
    const g = scenario(p);
    const id = base ? g.state.players.bob!.base : g.refs.enemy!;
    const s = target(play(g.state, g.refs.source!), id);
    expect(s.cards[id]!.damage).toBe(base ? 2 : 1);
  });
test('Diversion grants Sentinel to either player and Evasive Maneuver exhausts the chosen unit', () => {
  for (const id of ['diversion', 'evasive-maneuver']) {
    const p = board(id);
    p.players[1].ground = [{ card: ids.marine, ref: 'enemy' }];
    const g = scenario(p),
      s = target(play(g.state, g.refs.source!), g.refs.enemy!);
    if (id === 'diversion') expect(keyword(s, g.refs.enemy!, 'Sentinel')).toBe(true);
    else expect(s.cards[g.refs.enemy!]!.exhausted).toBe(true);
  }
});
test('Coordinated Front independently allows either arena choice to be skipped', () => {
  const p = board('coordinated-front');
  p.players[1].ground = [{ card: ids.marine, ref: 'ground' }];
  p.players[0].space = [{ card: ids.fighter, ref: 'space' }];
  const g = scenario(p);
  let s = play(g.state, g.refs.source!);
  s = step(s, 'decline-effect');
  s = target(s, g.refs.space!);
  expect(stats(s, g.refs.ground!).power).toBe(3);
  expect(stats(s, g.refs.space!).power).toBe(4);
});
for (const [id, tokenId, n, timing] of [
  ['dedicated-wingmen', 'x-wing', 2, 'played'],
  ['kijimi-patrollers', 'tie-fighter', 1, 'played'],
  ['veteran-fleet-officer', 'x-wing', 1, 'played'],
  ['general-draven--doing-what-must-be-done', 'x-wing', 1, 'played'],
  ['general-draven--doing-what-must-be-done', 'x-wing', 1, 'attack'],
  ['quasar-tie-carrier', 'tie-fighter', 1, 'attack'],
] as const)
  test(`${id} creates ${n} ${tokenId} on ${timing}`, () => {
    const g = scenario(board(id, timing === 'played'));
    const s = timing === 'played' ? play(g.state, g.refs.source!) : attack(g.state, g.refs.source!);
    const created = s.space.map(id => s.cards[id]!).filter(c => c.cardId === tokenId);
    expect(created).toHaveLength(n);
    expect(created.every(c => c.controller === 'alice' && c.exhausted)).toBe(true);
  });
test('Echo Base Engineer requires a damaged Vehicle, and Cloaked Starviper creates two distinct Shields', () => {
  const p = board('echo-base-engineer');
  p.players[1].space = [
    { card: 'munificent-frigate', damage: 1, ref: 'yes' },
    { card: 'munificent-frigate', ref: 'no' },
  ];
  p.players[1].ground = [{ card: ids.marine, damage: 1, ref: 'character' }];
  const g = scenario(p);
  let s = play(g.state, g.refs.source!);
  expect(
    options(s)
      .filter(i => i.kind === 'target')
      .map(i => i.card),
  ).toEqual([g.refs.yes!]);
  s = target(s, g.refs.yes!);
  expect(tokens(s, g.refs.yes!, 'shield')).toBe(1);
  const b = scenario(board('cloaked-starviper'));
  expect(tokens(play(b.state, b.refs.source!), b.refs.source!, 'shield')).toBe(2);
});
for (const card of ['landing-shuttle', 'cr90-relief-runner'])
  test(`${card} resolves its optional defeat ability after leaving play`, () => {
    const p = board(card, false);
    p.players[0].base.damage = 5;
    p.players[1].space = [{ card: 'jedi-light-cruiser', ref: 'enemy' }];
    p.activePlayer = 'bob';
    const g = scenario(p);
    let s = attack(g.state, g.refs.enemy!, g.refs.source!);
    if (card === 'landing-shuttle') {
      s = step(s, 'accept-effect');
      expect(s.players.alice!.hand).toHaveLength(1);
    } else {
      s = target(s, s.players.alice!.base);
      expect(s.cards[s.players.alice!.base]!.damage).toBe(2);
    }
    expect(s.cards[g.refs.source!]!.zone).toBe('discard');
  });
test('Supporting ETA-2 may boost an opposing ground unit, but not a space unit', () => {
  const p = board('supporting-eta-2', false);
  p.players[1].ground = [{ card: ids.marine, ref: 'enemy' }];
  const g = scenario(p);
  let s = attack(g.state, g.refs.source!);
  s = target(s, g.refs.enemy!);
  expect(stats(s, g.refs.enemy!).power).toBe(5);
});
test('Captain Phasma excludes herself but can enhance an opposing First Order unit on either timing', () => {
  for (const played of [true, false]) {
    const p = board('captain-phasma--on-my-command', played);
    p.players[1].ground = [{ card: 'sith-trooper', ref: 'enemy' }];
    const g = scenario(p);
    let s = played ? play(g.state, g.refs.source!) : attack(g.state, g.refs.source!);
    expect(options(s).some(i => i.kind === 'target' && i.card === g.refs.source)).toBe(false);
    s = target(s, g.refs.enemy!);
    expect(stats(s, g.refs.enemy!)).toEqual({ power: 5, hp: 5 });
  }
});
test('Wing Guard selects up to two distinct Fringe units including enemy units', () => {
  const p = board('wing-guard-security-team');
  p.players[1].ground = [
    { card: 'outer-rim-mystic', ref: 'enemy' },
    { card: ids.marine, ref: 'marine' },
  ];
  const g = scenario(p);
  let s = play(g.state, g.refs.source!);
  expect(s.execution.decision!.selection!.cards).not.toContain(g.refs.marine!);
  s = select(s, g.refs.source!, g.refs.enemy!);
  expect(tokens(s, g.refs.source!, 'shield')).toBe(1);
  expect(tokens(s, g.refs.enemy!, 'shield')).toBe(1);
});
test('Relentless Firespray readies only once per round, while Sith Trooper counts damaged enemy units in both arenas', () => {
  const a = scenario(board('relentless-firespray', false));
  let s = attack(a.state, a.refs.source!);
  expect(s.cards[a.refs.source!]!.exhausted).toBe(false);
  s = nextOwn(s);
  s = attack(s, a.refs.source!);
  expect(s.cards[a.refs.source!]!.exhausted).toBe(true);
  const p = board('sith-trooper', false);
  p.players[1].ground = [{ card: ids.marine, damage: 1 }];
  p.players[1].space = [{ card: 'munificent-frigate', damage: 1 }];
  const b = scenario(p);
  s = attack(b.state, b.refs.source!);
  expect(s.cards[s.players.bob!.base]!.damage).toBe(5);
  expect(stats(s, b.refs.source!).power).toBe(3);
});
test('Red Leader counts Pilot units and upgrades for cost, then reacts to a Pilot attachment', () => {
  const p = board('red-leader--form-up');
  p.players[0].ground = [{ card: 'clone-pilot' }];
  p.players[0].space = [{ card: 'munificent-frigate', ref: 'host' }];
  p.attachments = [{ card: 'clone-pilot', unit: 'host' }];
  const g = scenario(p);
  expect(playCost(g.state, g.state.cards[g.refs.source!]!)).toBe(2);
  let s = play(g.state, g.refs.source!);
  s = nextOwn(s);
  const pilot = addCard(s, 'alice', 'clone-pilot', 'hand');
  refresh(s);
  s = play(s, pilot.instanceId, g.refs.source!);
  expect(s.space.filter(id => s.cards[id]!.cardId === 'x-wing')).toHaveLength(1);
});
test('In the Heat of Battle selectively removes Saboteur and grants Sentinel to current units', () => {
  const p = board('in-the-heat-of-battle');
  p.players[1].ground = [{ card: 'insurgent-saboteurs', ref: 'enemy' }];
  const g = scenario(p),
    s = play(g.state, g.refs.source!);
  expect(keyword(s, g.refs.enemy!, 'Saboteur')).toBe(false);
  expect(keyword(s, g.refs.enemy!, 'Sentinel')).toBe(true);
  const later = addCard(s, 'bob', 'insurgent-saboteurs', 'ground');
  expect(keyword(s, later.instanceId, 'Saboteur')).toBe(true);
  expect(keyword(s, later.instanceId, 'Sentinel')).toBe(false);
});
test('There Is No Escape blanks selected units for the round, and Power from Pain locks the damage count at resolution', () => {
  const p = board('there-is-no-escape');
  p.players[1].ground = [{ card: 'occupier-siege-tank', damage: 1, ref: 'enemy' }];
  const g = scenario(p);
  let s = select(play(g.state, g.refs.source!), g.refs.enemy!);
  expect(stats(s, g.refs.enemy!).power).toBe(5);
  expect(s.lastingEffects.find(e => e.target.instanceId === g.refs.enemy)!.expires.kind).toBe(
    'round',
  );
  const q = board('power-from-pain');
  q.players[1].ground = [{ card: ids.consular, damage: 3, ref: 'enemy' }];
  const b = scenario(q);
  s = target(play(b.state, b.refs.source!), b.refs.enemy!);
  s.cards[b.refs.enemy!]!.damage = 0;
  expect(stats(s, b.refs.enemy!).power).toBe(6);
});
test('Fight Fire with Fire waits for an enemy in the same arena before dealing simultaneous damage', () => {
  const p = board('fight-fire-with-fire');
  p.players[0].ground = [{ card: ids.consular, ref: 'own' }];
  p.players[1].space = [{ card: 'munificent-frigate', ref: 'space' }];
  const a = scenario(p);
  let s = target(play(a.state, a.refs.source!), a.refs.own!);
  expect(s.cards[a.refs.own!]!.damage).toBe(0);
  p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
  const b = scenario(p);
  s = target(play(b.state, b.refs.source!), b.refs.own!);
  expect(s.cards[b.refs.own!]!.damage).toBe(0);
  s = target(s, b.refs.enemy!);
  expect(s.cards[b.refs.own!]!.damage).toBe(3);
  expect(s.cards[b.refs.enemy!]!.damage).toBe(3);
});
for (const id of [
  'bb-8--happy-beeps',
  'frisk--vanguard-loudmouth',
  'tam-ryvora--searching-for-purpose',
  'wingman-victor-two--mauler-mithel',
  'wingman-victor-three--backstabber',
])
  test(`${id} has no Pilot-only trigger when played as a unit`, () => {
    const g = scenario(board(id));
    const s = play(g.state, g.refs.source!);
    expect(s.execution.decision!.kind).toBe('action');
    expect(s.execution.decision!.playerId).toBe('bob');
  });
test('BB-8 pays two separately and can ready an enemy Resistance unit', () => {
  const p = board('bb-8--happy-beeps');
  p.players[0].space = [{ card: 'munificent-frigate', ref: 'host' }];
  p.players[1].space = [{ card: 'resistance-x-wing', exhausted: true, ref: 'enemy' }];
  const g = scenario(p);
  let s = play(g.state, g.refs.source!, g.refs.host!);
  const before = s.players.alice!.resources.filter(id => !s.cards[id]!.exhausted).length;
  s = step(s, 'accept-effect');
  s = target(s, g.refs.enemy!);
  expect(s.cards[g.refs.enemy!]!.exhausted).toBe(false);
  expect(s.players.alice!.resources.filter(id => !s.cards[id]!.exhausted)).toHaveLength(before - 2);
});
test('Frisk removes only upgrades costing two or less; Backstabber uses the errata excluding the host', () => {
  const p = board('frisk--vanguard-loudmouth');
  p.players[0].space = [{ card: 'munificent-frigate', ref: 'host' }];
  p.players[1].ground = [{ card: 'jedi-guardian', ref: 'enemy' }];
  p.attachments = [
    { card: 'experience', unit: 'enemy', ref: 'experience' },
    { card: 'constructed-lightsaber', unit: 'enemy', ref: 'expensive' },
  ];
  const a = scenario(p);
  let s = play(a.state, a.refs.source!, a.refs.host!);
  expect(s.execution.decision!.selection!.cards).not.toContain(a.refs.expensive);
  s = select(s, a.refs.experience!);
  expect(s.cards[a.refs.experience!]!.zone).toBe('set-aside');
  const q = board('wingman-victor-three--backstabber');
  q.players[0].space = [{ card: 'munificent-frigate', ref: 'host' }];
  q.players[1].ground = [{ card: 'jedi-guardian', ref: 'enemy' }];
  const b = scenario(q);
  s = play(b.state, b.refs.source!, b.refs.host!);
  expect(options(s).some(i => i.kind === 'target' && i.card === b.refs.host)).toBe(false);
  s = target(s, b.refs.enemy!);
  expect(tokens(s, b.refs.enemy!)).toBe(1);
});
test('Mauler Mithel creates a TIE on upgrade play; Tam grants mandatory weakening in the host arena', () => {
  const p = board('wingman-victor-two--mauler-mithel');
  p.players[0].space = [{ card: 'munificent-frigate', ref: 'host' }];
  const a = scenario(p);
  const played = play(a.state, a.refs.source!, a.refs.host!);
  expect(played.space.filter(id => played.cards[id]!.cardId === 'tie-fighter')).toHaveLength(1);
  const q = board('tam-ryvora--searching-for-purpose');
  q.players[0].space = [{ card: 'munificent-frigate', ref: 'host' }];
  q.players[1].space = [{ card: 'munificent-frigate', ref: 'enemy' }];
  q.players[1].ground = [{ card: ids.consular, ref: 'ground' }];
  const b = scenario(q);
  let s = nextOwn(play(b.state, b.refs.source!, b.refs.host!));
  s = attack(s, b.refs.host!);
  expect(options(s).some(i => i.kind === 'target' && i.card === b.refs.ground)).toBe(false);
  s = target(s, b.refs.enemy!);
  expect(stats(s, b.refs.enemy!)).toEqual({ power: 3, hp: 6 });
});
test('Insurgent Saboteurs can decline upgrade removal without cancelling its attack', () => {
  const p = board('insurgent-saboteurs', false);
  p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
  p.attachments = [{ card: 'experience', unit: 'enemy', ref: 'upgrade' }];
  const g = scenario(p);
  let s = attack(g.state, g.refs.source!);
  s = step(s, 'decline-effect');
  expect(s.cards[s.players.bob!.base]!.damage).toBe(6);
  expect(s.cards[g.refs.upgrade!]!.zone).toBe('ground');
});

import { expect, test } from 'bun:test';
import { scenario } from './scenario.ts';
import { advance, settle } from '../engine/advance.ts';
import { encodeState, decodeState } from '../engine/checkpoint.ts';
import { addCard, move, reference, playCost } from '../engine/state.ts';
import { modifyUnit } from '../engine/lasting.ts';
import { Projector } from '../projection/projector.ts';
import {
  board,
  play,
  attack,
  step,
  target,
  select,
  mode,
  blank,
  stats,
  keyword,
  tokens,
  options,
  nextOwn,
  refresh,
  ids,
  position,
} from './jtl-helpers.ts';
for (const discarded of [ids.marine, 'repair'])
  test(`Ahsoka gives the hand owner the discard choice (${discarded})`, () => {
    const p = board('ahsoka-tano--chasing-whispers');
    p.players[1].hand = [{ card: discarded, ref: 'discarded' }];
    p.players[1].space = [{ card: 'munificent-frigate', ref: 'enemy' }];
    const g = scenario(p);
    let s = play(g.state, g.refs.source!);
    expect(s.execution.decision!.playerId).toBe('bob');
    expect(
      new Projector(s.gameId, { role: 'player', playerId: 'alice' }).project(s).decision,
    ).toBeNull();
    s = select(s, g.refs.discarded!);
    expect(s.cards[g.refs.discarded!]!.zone).toBe('discard');
    if (discarded === ids.marine) {
      s = target(s, g.refs.enemy!);
      expect(s.cards[g.refs.enemy!]!.exhausted).toBe(true);
    } else expect(s.execution.decision!.kind).toBe('action');
  });
test('Apology Accepted can give Experience even without a friendly unit to defeat', () => {
  const p = board('apology-accepted');
  p.players[1].ground = [{ card: ids.marine, ref: 'enemy' }];
  const g = scenario(p);
  const s = target(play(g.state, g.refs.source!), g.refs.enemy!);
  expect(tokens(s, g.refs.enemy!)).toBe(2);
});
test('Attack Run finishes the first attack and requires a different second space unit', () => {
  const p = board('attack-run');
  p.players[0].space = [
    { card: 'relentless-firespray', ref: 'first' },
    { card: 'munificent-frigate', ref: 'second' },
  ];
  const g = scenario(p);
  let s = target(play(g.state, g.refs.source!), g.refs.first!);
  s = attack(s, g.refs.first!);
  expect(s.cards[s.players.bob!.base]!.damage).toBe(4);
  expect(s.cards[g.refs.first!]!.exhausted).toBe(false);
  expect(options(s).some(i => i.kind === 'target' && i.card === g.refs.first)).toBe(false);
  s = target(s, g.refs.second!);
  s = attack(s, g.refs.second!);
  expect(s.cards[s.players.bob!.base]!.damage).toBe(8);
  expect(s.execution.decision!.playerId).toBe('bob');
});
test('Banshee reads current damage and preserves the departed incarnation at its pending choice', () => {
  const p = board('banshee--crippling-command', false);
  p.players[0].space![0]!.damage = 3;
  p.players[1].ground = [{ card: 'jedi-guardian', ref: 'enemy' }];
  const g = scenario(p);
  const pending = attack(g.state, g.refs.source!);
  expect(target(pending, g.refs.enemy!).cards[g.refs.enemy!]!.damage).toBe(3);
  move(pending, pending.cards[g.refs.source!]!, 'hand');
  move(pending, pending.cards[g.refs.source!]!, 'space');
  pending.cards[g.refs.source!]!.damage = 0;
  const s = target(pending, g.refs.enemy!);
  expect(s.cards[g.refs.enemy!]!.damage).toBe(3);
});
test('Barrel Roll exhausts only after the complete space attack, and skips it when no attack occurs', () => {
  const p = board('barrel-roll');
  p.players[0].space = [{ card: 'munificent-frigate', ref: 'own' }];
  p.players[1].space = [{ card: 'munificent-frigate', ref: 'enemy' }];
  const g = scenario(p);
  let s = target(play(g.state, g.refs.source!), g.refs.own!);
  s = attack(s, g.refs.own!);
  expect(s.cards[s.players.bob!.base]!.damage).toBe(4);
  s = target(s, g.refs.enemy!);
  expect(s.cards[g.refs.enemy!]!.exhausted).toBe(true);
  p.players[0].space![0]!.exhausted = true;
  const b = scenario(p);
  s = play(b.state, b.refs.source!);
  expect(s.cards[b.refs.enemy!]!.exhausted).toBe(false);
  expect(s.execution.decision!.kind).toBe('action');
});
test('Black Squadron Scout Wing responds to a friendly upgrade play and requires a ready host', () => {
  for (const exhausted of [false, true]) {
    const p = board('academy-training');
    p.players[0].space = [{ card: 'black-squadron-scout-wing', ref: 'host', exhausted }];
    const g = scenario(p);
    let s = play(g.state, g.refs.source!, g.refs.host!);
    if (!exhausted) {
      s = attack(s, g.refs.host!);
      expect(s.cards[s.players.bob!.base]!.damage).toBe(7);
      expect(stats(s, g.refs.host!).power).toBe(6);
    } else expect(s.execution.decision!.kind).toBe('action');
  }
});
for (const exhausted of [2, 3])
  test(`Blade Squadron B-Wing requires three exhausted enemy units (${exhausted})`, () => {
    const p = board('blade-squadron-b-wing');
    p.players[1].ground = Array.from({ length: exhausted }, () => ({
      card: ids.marine,
      exhausted: true,
    }));
    const g = scenario(p);
    let s = play(g.state, g.refs.source!);
    if (exhausted === 3) s = target(s, g.refs.source!);
    expect(tokens(s, g.refs.source!, 'shield')).toBe(exhausted === 3 ? 1 : 0);
  });
test('Bossk exhausts and damages a defending unit, but adds no damage when attacking a base', () => {
  const p = board('bossk--hunt-by-instinct', false);
  p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
  const g = scenario(p);
  const s = attack(g.state, g.refs.source!, g.refs.enemy!);
  expect(s.cards[g.refs.enemy!]!.exhausted).toBe(true);
  expect(s.cards[g.refs.enemy!]!.damage).toBe(5);
  expect(attack(g.state, g.refs.source!).cards[g.state.players.bob!.base]!.damage).toBe(4);
});
for (const cost of [2, 5])
  test(`Cassian's host mills the defending deck and checks printed cost (${cost})`, () => {
    const p = board('cassian-andor--threading-the-eye');
    p.players[0].space = [{ card: 'munificent-frigate', ref: 'host' }];
    p.players[1].deck = [{ card: cost === 2 ? ids.marine : 'munificent-frigate', ref: 'milled' }];
    const g = scenario(p);
    let s = nextOwn(play(g.state, g.refs.source!, g.refs.host!));
    s = attack(s, g.refs.host!);
    expect(s.cards[g.refs.milled!]!.zone).toBe('discard');
    expect(s.players.alice!.hand).toHaveLength(cost === 2 ? 1 : 0);
  });
for (const exhausted of [true, false])
  test(`Cat and Mouse only readies after actually exhausting its enemy (${exhausted})`, () => {
    const p = board('cat-and-mouse');
    p.players[0].space = [{ card: 'munificent-frigate', exhausted: true, ref: 'own' }];
    p.players[1].space = [{ card: 'munificent-frigate', exhausted, ref: 'enemy' }];
    const g = scenario(p);
    let s = target(play(g.state, g.refs.source!), g.refs.enemy!);
    if (!exhausted) s = target(s, g.refs.own!);
    expect(s.cards[g.refs.own!]!.exhausted).toBe(exhausted);
  });
test('Commence Patrol cannot choose an empty discard pile or itself and creates a token only after movement', () => {
  const p = board('commence-patrol');
  p.players[1].discard = [{ card: ids.marine, ref: 'card' }];
  const g = scenario(p);
  let s = play(g.state, g.refs.source!);
  expect(options(s)).toEqual([{ kind: 'choose-mode', mode: 'enemy-discard' }]);
  s = mode(s, 'enemy-discard');
  s = select(s, g.refs.card!);
  expect(s.players.bob!.deck.at(-1)).toBe(g.refs.card!);
  expect(s.space.filter(id => s.cards[id]!.cardId === 'x-wing')).toHaveLength(1);
});
for (const host of ['munificent-frigate', 'cloaked-starviper'])
  test(`Dengar's indirect damage uses the host's Underworld trait (${host})`, () => {
    const p = board('dengar--crude-and-slovenly');
    p.players[0].space = [{ card: host, ref: 'host' }];
    const g = scenario(p);
    let s = nextOwn(play(g.state, g.refs.source!, g.refs.host!));
    s = attack(s, g.refs.host!);
    s = step(s, i => i.kind === 'choose-player' && i.playerId === 'bob');
    expect(s.execution.decision!.selection!.min).toBe(host === 'cloaked-starviper' ? 3 : 2);
  });
test('Dogfight permits an exhausted unit and offers no base defender', () => {
  const p = board('dogfight');
  p.players[0].ground = [{ card: ids.consular, exhausted: true, ref: 'own' }];
  p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
  const g = scenario(p);
  let s = target(play(g.state, g.refs.source!), g.refs.own!);
  expect(
    options(s)
      .filter(i => i.kind === 'attack')
      .every(i => i.defender === g.refs.enemy),
  ).toBe(true);
  s = attack(s, g.refs.own!, g.refs.enemy!);
  expect(s.cards[g.refs.enemy!]!.damage).toBe(3);
  expect(s.cards[g.refs.own!]!.exhausted).toBe(true);
});
for (const claimed of [false, true])
  test(`Face Off only works before initiative is claimed (${claimed})`, () => {
    const p = board('face-off');
    p.initiative!.claimed = claimed;
    if (claimed) p.initiative!.holder = 'bob';
    p.players[0].ground = [{ card: ids.consular, exhausted: true, ref: 'own' }];
    p.players[1].ground = [{ card: ids.marine, exhausted: true, ref: 'enemy' }];
    const g = scenario(p);
    let s = play(g.state, g.refs.source!);
    if (!claimed) {
      s = target(s, g.refs.enemy!);
      s = target(s, g.refs.own!);
    }
    expect(s.cards[g.refs.own!]!.exhausted).toBe(claimed);
  });
test('Fly Casual readies a Vehicle but its phase base restriction survives losing abilities', () => {
  const p = board('fly-casual');
  p.players[0].space = [{ card: 'munificent-frigate', exhausted: true, ref: 'own' }];
  p.players[1].space = [{ card: 'munificent-frigate', ref: 'enemy' }];
  const g = scenario(p);
  let s = target(play(g.state, g.refs.source!), g.refs.own!);
  expect(s.cards[g.refs.own!]!.exhausted).toBe(false);
  blank(s, g.refs.own!);
  s = nextOwn(s);
  expect(options(s).some(i => i.kind === 'attack' && i.defender === s.players.bob!.base)).toBe(
    false,
  );
  expect(options(s).some(i => i.kind === 'attack' && i.defender === g.refs.enemy)).toBe(true);
});
test('General Hux can pay exhaustion with no First Order play, and draws only after a qualifying play', () => {
  for (const played of [false, true]) {
    const p = board('general-hux--no-terms--no-surrender', false);
    p.players[0].hand = [{ card: 'sith-trooper', ref: 'trooper' }];
    const g = scenario(p);
    let s = g.state;
    if (played) s = nextOwn(play(s, g.refs.trooper!));
    s = step(s, i => i.kind === 'use-ability' && i.card === g.refs.source);
    expect(s.cards[g.refs.source!]!.exhausted).toBe(true);
    expect(s.players.alice!.hand).toHaveLength(1);
    if (played) expect(s.players.alice!.hand).not.toContain(g.refs.trooper!);
  }
});
test('Gold Leader reduces only the unit attacking it, including its combat damage, without affecting later attacks', () => {
  const p = board('gold-leader--fastest-ship-in-the-fleet', false);
  p.players[1].space = [{ card: 'munificent-frigate', ref: 'enemy' }];
  p.activePlayer = 'bob';
  const g = scenario(p);
  const s = attack(g.state, g.refs.enemy!, g.refs.source!);
  expect(s.cards[g.refs.source!]!.damage).toBe(3);
  expect(stats(s, g.refs.enemy!).power).toBe(4);
});
test('Grim Valor preserves the granted defeat trigger when its host and upgrade leave together', () => {
  const p = position();
  p.activePlayer = 'bob';
  p.players[0].ground = [{ card: ids.marine, ref: 'own' }];
  p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
  p.players[1].space = [{ card: 'munificent-frigate', ref: 'target' }];
  p.attachments = [{ card: 'grim-valor', unit: 'own' }];
  p.players[0].ground![0]!.damage = 1;
  const g = scenario(p);
  let s = attack(g.state, g.refs.enemy!, g.refs.own!);
  s = target(s, g.refs.target!);
  expect(s.cards[g.refs.target!]!.exhausted).toBe(true);
});
for (const power of [2, 3])
  test(`Heartless Tactics checks modified power before optional return (${power})`, () => {
    const p = board('heartless-tactics');
    p.players[1].ground = [
      { card: power === 2 ? 'bunker-defender' : ids.marine, ref: 'enemy', exhausted: true },
    ];
    const g = scenario(p);
    let s = target(play(g.state, g.refs.source!), g.refs.enemy!);
    if (power === 2) s = target(s, g.refs.enemy!);
    expect(s.cards[g.refs.enemy!]!.zone).toBe(power === 2 ? 'hand' : 'ground');
  });
test('Invincible requires a unique Separatist card and responds to the controller deploying a leader', () => {
  const p = board('invincible--naval-adversary');
  p.players[0].leader.card = 'count-dooku--face-of-the-confederacy';
  p.players[0].base.card = 'jedha-city';
  p.players[1].ground = [{ card: ids.marine, ref: 'enemy' }];
  const g = scenario(p);
  expect(playCost(g.state, g.state.cards[g.refs.source!]!)).toBe(5);
  let s = nextOwn(play(g.state, g.refs.source!));
  s = step(s, i => i.kind === 'use-ability' && i.abilityId === 'deploy');
  s = target(s, g.refs.enemy!);
  expect(s.cards[g.refs.enemy!]!.zone).toBe('hand');
});
test("It's a Trap requires a strict enemy space-unit majority", () => {
  for (const n of [1, 2]) {
    const p = board('it-s-a-trap');
    p.players[0].space = [{ card: 'munificent-frigate', exhausted: true, ref: 'own' }];
    p.players[1].space = Array.from({ length: n }, () => ({ card: ids.fighter }));
    const g = scenario(p);
    expect(play(g.state, g.refs.source!).cards[g.refs.own!]!.exhausted).toBe(n === 1);
  }
});
test('Koiogran Turn excludes high-power ships and non-Fighter/non-Transport units', () => {
  const p = board('koiogran-turn');
  p.players[1].space = [
    { card: 'munificent-frigate', exhausted: true, ref: 'capital' },
    { card: 'corporate-light-cruiser', exhausted: true, ref: 'other' },
    { card: 'cloaked-starviper', exhausted: true, ref: 'fighter' },
  ];
  const g = scenario(p);
  let s = play(g.state, g.refs.source!);
  expect(
    options(s)
      .filter(i => i.kind === 'target')
      .map(i => i.card),
  ).toEqual([g.refs.fighter!]);
  s = target(s, g.refs.fighter!);
  expect(s.cards[g.refs.fighter!]!.exhausted).toBe(false);
});
test('Leia grants an attack-only power and Restore bonus to a Pilot unit or its host', () => {
  const p = board('leia-organa--pilots--to-your-stations');
  p.players[0].base.damage = 5;
  p.players[0].ground = [{ card: 'clone-pilot', ref: 'pilot' }];
  const g = scenario(p);
  let s = target(play(g.state, g.refs.source!), g.refs.pilot!);
  s = attack(s, g.refs.pilot!);
  expect(s.cards[s.players.bob!.base]!.damage).toBe(3);
  expect(s.cards[s.players.alice!.base]!.damage).toBe(4);
  expect(stats(s, g.refs.pilot!).power).toBe(2);
});
test('Lightspeed Assault uses both departed ships’ last known modified power', () => {
  const p = board('lightspeed-assault');
  p.players[0].space = [{ card: 'cloaked-starviper', ref: 'own' }];
  p.players[1].space = [{ card: 'cloaked-starviper', ref: 'enemy' }];
  p.attachments = [{ card: 'experience', unit: 'own' }];
  const g = scenario(p);
  let s = target(play(g.state, g.refs.source!), g.refs.own!);
  s = target(s, g.refs.enemy!);
  expect(s.cards[g.refs.own!]!.zone).toBe('discard');
  expect(s.cards[g.refs.enemy!]!.zone).toBe('discard');
  expect(s.execution.decision!.selection!.min).toBe(3);
  s = select(s, s.players.bob!.base, s.players.bob!.base, s.players.bob!.base);
  expect(s.cards[s.players.bob!.base]!.damage).toBe(3);
});
test('Massassi Tactical Officer pays exhaustion and grants +2 only for the chosen Fighter attack', () => {
  const p = board('massassi-tactical-officer', false);
  p.players[0].space = [{ card: ids.fighter, ref: 'fighter' }];
  const g = scenario(p);
  let s = step(g.state, i => i.kind === 'use-ability' && i.card === g.refs.source);
  s = target(s, g.refs.fighter!);
  s = attack(s, g.refs.fighter!);
  expect(s.cards[s.players.bob!.base]!.damage).toBe(4);
  expect(s.cards[g.refs.source!]!.exhausted).toBe(true);
});
test('Moff Gideon taxes later enemy unit plays for the phase even after departure', () => {
  const p = board('moff-gideon--i-know-everything', false);
  p.players[1].hand = [{ card: ids.marine, ref: 'marine' }];
  const g = scenario(p);
  const before = playCost(g.state, g.state.cards[g.refs.marine!]!);
  const s = attack(g.state, g.refs.source!);
  move(s, s.cards[g.refs.source!]!, 'discard');
  expect(playCost(s, s.cards[g.refs.marine!]!)).toBe(before + 1);
});
for (const empty of [false, true])
  test(`Never Tell Me the Odds counts both decks, including an empty opposing deck (${empty})`, () => {
    const p = board('never-tell-me-the-odds');
    p.players[0].deck = [{ card: 'repair' }, { card: ids.marine }, { card: 'munificent-frigate' }];
    p.players[1].deck = empty
      ? []
      : [{ card: 'repair' }, { card: ids.marine }, { card: 'munificent-frigate' }];
    p.players[1].ground = [{ card: 'jedi-guardian', ref: 'enemy' }];
    const g = scenario(p);
    const s = target(play(g.state, g.refs.source!), g.refs.enemy!);
    expect(s.cards[g.refs.enemy!]!.damage).toBe(empty ? 2 : 4);
  });
test('Radiant VII uses each enemy unit’s own damage and excludes leaders', () => {
  const p = board('radiant-vii--ambassadors--arrival', false);
  p.players[1].ground = [
    { card: ids.consular, damage: 2, ref: 'a' },
    { card: ids.marine, damage: 1, ref: 'b' },
  ];
  p.players[1].leader.deployedAs = 'unit';
  p.players[1].leader.damage = 1;
  const g = scenario(p);
  expect(stats(g.state, g.refs.a!).power).toBe(1);
  expect(stats(g.state, g.refs.b!).power).toBe(2);
  expect(stats(g.state, g.state.players.bob!.leader).power).toBe(2);
  blank(g.state, g.refs.a!);
  expect(stats(g.state, g.refs.a!).power).toBe(1);
  move(g.state, g.state.cards[g.refs.source!]!, 'discard');
  expect(stats(g.state, g.refs.a!).power).toBe(3);
});
test('Rafa readies a resource even if the damaged friendly unit is defeated', () => {
  const p = board('rafa-martez--shrewd-sister');
  p.players[0].ground = [{ card: ids.trooper, ref: 'own' }];
  const g = scenario(p);
  let s = target(play(g.state, g.refs.source!), g.refs.own!);
  const resource = s.players.alice!.resources.find(id => s.cards[id]!.exhausted)!;
  s = select(s, resource);
  expect(s.cards[g.refs.own!]!.zone).toBe('discard');
  expect(s.cards[resource]!.exhausted).toBe(false);
});
test('Retrofitted Airspeeder can Ambush space units with a one-power penalty', () => {
  const p = board('retrofitted-airspeeder');
  p.players[1].space = [{ card: 'munificent-frigate', ref: 'enemy' }];
  const g = scenario(p);
  let s = play(g.state, g.refs.source!);
  s = target(s, g.refs.enemy!);
  expect(s.cards[g.refs.enemy!]!.damage).toBe(2);
  expect(stats(s, g.refs.source!).power).toBe(3);
});
test('Scramble Fighters creates eight ready TIEs whose base restriction survives blanking', () => {
  const g = scenario(board('scramble-fighters'));
  let s = play(g.state, g.refs.source!);
  const fighters = s.space.filter(id => s.cards[id]!.cardId === 'tie-fighter');
  expect(fighters).toHaveLength(8);
  expect(fighters.every(id => !s.cards[id]!.exhausted)).toBe(true);
  blank(s, fighters[0]!);
  s = nextOwn(s);
  expect(options(s).some(i => i.kind === 'attack')).toBe(false);
});
for (const odd of [true, false])
  test(`Shuttle Tydirium gives another unit Experience only after milling an odd cost (${odd})`, () => {
    const p = board('shuttle-tydirium--fly-casual', false);
    p.players[0].deck = [{ card: odd ? 'repair' : ids.marine }];
    p.players[1].ground = [{ card: ids.marine, ref: 'enemy' }];
    const g = scenario(p);
    let s = attack(g.state, g.refs.source!);
    if (odd) {
      expect(options(s).some(i => i.kind === 'target' && i.card === g.refs.source)).toBe(false);
      s = target(s, g.refs.enemy!);
    }
    expect(tokens(s, g.refs.enemy!)).toBe(odd ? 1 : 0);
  });
test('Skyway Cloud Car uses modified power for its optional defeat return', () => {
  const p = board('skyway-cloud-car', false);
  p.activePlayer = 'bob';
  p.players[1].ground = [
    { card: 'jedi-guardian', ref: 'attacker' },
    { card: 'bunker-defender', ref: 'target' },
  ];
  const g = scenario(p);
  let s = attack(g.state, g.refs.attacker!, g.refs.source!);
  s = target(s, g.refs.target!);
  expect(s.cards[g.refs.target!]!.zone).toBe('hand');
});
test('Snap Wexley keeps his unit discount separate from the Pilot search and only consumes it on a Resistance play', () => {
  const p = board('snap-wexley--resistance-recon-flier');
  p.players[0].hand!.push(
    { card: 'resistance-x-wing', ref: 'resistance' },
    { card: ids.marine, ref: 'other' },
  );
  const g = scenario(p);
  let s = play(g.state, g.refs.source!);
  expect(playCost(s, s.cards[g.refs.resistance!]!)).toBe(1);
  expect(playCost(s, s.cards[g.refs.other!]!)).toBe(2);
  const q = board('snap-wexley--resistance-recon-flier');
  q.players[0].space = [{ card: 'munificent-frigate', ref: 'host' }];
  q.players[0].deck = [{ card: 'resistance-x-wing', ref: 'found' }];
  const b = scenario(q);
  s = play(b.state, b.refs.source!, b.refs.host!);
  s = step(s, 'search', [b.refs.found!]);
  expect(s.players.alice!.hand).toContain(b.refs.found!);
  expect(s.playModifiers).toHaveLength(0);
});
test('Superheavy Ion Cannon deals indirect damage only after successful exhaustion', () => {
  const p = board('superheavy-ion-cannon');
  p.players[0].space = [{ card: 'munificent-frigate', ref: 'host' }];
  p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
  const g = scenario(p);
  let s = nextOwn(play(g.state, g.refs.source!, g.refs.host!));
  s = target(attack(s, g.refs.host!), g.refs.enemy!);
  expect(s.cards[g.refs.enemy!]!.exhausted).toBe(true);
  expect(s.execution.decision!.selection!.min).toBe(3);
});
test('Fifteen Swarming Vulture Droids count only their other friendly copies', () => {
  const p = board('swarming-vulture-droid', false);
  p.players[0].space = Array.from({ length: 15 }, (_, i) => ({
    card: 'swarming-vulture-droid',
    ref: `v${i}`,
  }));
  p.players[1].space = [{ card: 'swarming-vulture-droid', ref: 'enemy' }];
  const g = scenario(p);
  expect(stats(g.state, g.refs.v0!).power).toBe(16);
  expect(stats(g.state, g.refs.enemy!).power).toBe(2);
  move(g.state, g.state.cards[g.refs.v1!]!, 'discard');
  expect(stats(g.state, g.refs.v0!).power).toBe(15);
});
for (const base of [false, true])
  test(`Tactical Heavy Bomber draws only when its indirect packet damages a base (${base})`, () => {
    const p = board('tactical-heavy-bomber', false);
    p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
    const g = scenario(p);
    let s = attack(g.state, g.refs.source!);
    s = select(s, ...Array.from({ length: 3 }, () => (base ? s.players.bob!.base : g.refs.enemy!)));
    expect(s.players.alice!.hand).toHaveLength(base ? 1 : 0);
  });
test('They Hate That Ship gives the opponent ready tokens before its mandatory discounted Vehicle play', () => {
  const p = board('they-hate-that-ship');
  p.players[0].hand!.push({ card: 'munificent-frigate', ref: 'ship' });
  const g = scenario(p);
  let s = play(g.state, g.refs.source!);
  const ties = s.space.map(id => s.cards[id]!).filter(c => c.cardId === 'tie-fighter');
  expect(ties).toHaveLength(2);
  expect(ties.every(c => c.controller === 'bob' && !c.exhausted)).toBe(true);
  s = play(s, g.refs.ship!);
  expect(s.cards[g.refs.ship!]!.exhausted).toBe(true);
});
test('TIE Ambush Squadron resolves launch and Ambush as separate triggers', () => {
  const p = board('tie-ambush-squadron');
  p.players[1].space = [{ card: 'munificent-frigate', ref: 'enemy' }];
  const g = scenario(p);
  let s = play(g.state, g.refs.source!);
  s = target(s, g.refs.enemy!);
  expect(s.cards[g.refs.source!]!.zone).toBe('discard');
  expect(s.space.filter(id => s.cards[id]!.cardId === 'tie-fighter')).toHaveLength(2);
});
test('Timely Reinforcements rounds enemy resource pairs down and grants Sentinel to each new X-Wing', () => {
  const p = board('timely-reinforcements');
  p.players[1].resources = Array.from({ length: 5 }, () => ({ card: ids.marine }));
  const g = scenario(p);
  const s = play(g.state, g.refs.source!);
  const ships = s.space.filter(id => s.cards[id]!.cardId === 'x-wing');
  expect(ships).toHaveLength(2);
  expect(ships.every(id => keyword(s, id, 'Sentinel'))).toBe(true);
});
test('Twin Laser Turret targets two distinct units in its host arena', () => {
  const p = board('twin-laser-turret');
  p.players[0].space = [{ card: 'munificent-frigate', ref: 'host' }];
  p.players[1].space = [
    { card: 'munificent-frigate', ref: 'a' },
    { card: 'munificent-frigate', ref: 'b' },
  ];
  p.players[1].ground = [{ card: ids.consular, ref: 'ground' }];
  const g = scenario(p);
  let s = nextOwn(play(g.state, g.refs.source!, g.refs.host!));
  s = attack(s, g.refs.host!);
  expect(s.execution.decision!.selection!.cards).not.toContain(g.refs.ground);
  s = select(s, g.refs.a!, g.refs.b!);
  expect(s.cards[g.refs.a!]!.damage).toBe(1);
  expect(s.cards[g.refs.b!]!.damage).toBe(1);
});
test('War Juggernaut counts current damaged units after its optional simultaneous damage choices', () => {
  const p = board('war-juggernaut');
  p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
  const g = scenario(p);
  let s = select(play(g.state, g.refs.source!), g.refs.source!, g.refs.enemy!);
  expect(stats(s, g.refs.source!).power).toBe(5);
  s.cards[g.refs.enemy!]!.damage = 0;
  expect(stats(s, g.refs.source!).power).toBe(4);
});
test("You're All Clear, Kid checks an empty enemy arena before pending defeated triggers create a replacement ship", () => {
  const p = board('you-re-all-clear--kid');
  p.players[1].space = [{ card: 'tie-ambush-squadron', ref: 'enemy' }];
  p.players[0].ground = [{ card: ids.marine, ref: 'reward' }];
  const g = scenario(p);
  let s = target(play(g.state, g.refs.source!), g.refs.enemy!);
  s = target(s, g.refs.reward!);
  expect(tokens(s, g.refs.reward!)).toBe(1);
  expect(s.space.filter(id => s.cards[id]!.cardId === 'tie-fighter')).toHaveLength(1);
});
test('All Wings Report In counts only units successfully exhausted, including ready versus exhausted targets', () => {
  const p = board('all-wings-report-in');
  p.players[0].space = [
    { card: 'munificent-frigate', ref: 'ready' },
    { card: 'munificent-frigate', ref: 'exhausted', exhausted: true },
  ];
  const g = scenario(p);
  const s = select(play(g.state, g.refs.source!), g.refs.ready!, g.refs.exhausted!);
  expect(s.space.filter(id => s.cards[id]!.cardId === 'x-wing')).toHaveLength(1);
});
test('Focus Fire retains each Vehicle as its damage source and commits their packets together', () => {
  const p = board('focus-fire');
  p.players[0].ground = [
    { card: 'occupier-siege-tank', ref: 'a' },
    { card: 'occupier-siege-tank', ref: 'b' },
  ];
  p.players[1].ground = [{ card: 'jedi-guardian', ref: 'enemy' }];
  p.players[0].space = [{ card: 'munificent-frigate', ref: 'space' }];
  const g = scenario(p);
  const s = target(play(g.state, g.refs.source!), g.refs.enemy!);
  expect(s.cards[g.refs.enemy!]!.zone).toBe('discard');
  const damage = s.facts.filter(f => f.type === 'damage');
  expect(damage.some(f => f.cards.some(c => c.instanceId === g.refs.a))).toBe(true);
  expect(damage.some(f => f.cards.some(c => c.instanceId === g.refs.b))).toBe(true);
  expect(damage.some(f => f.cards.some(c => c.instanceId === g.refs.space))).toBe(false);
});

test('Moff Gideon increases every unit play until the phase ends, but not Pilot upgrade plays', () => {
  const p = board('moff-gideon--i-know-everything', false);
  p.players[1].resources = Array.from({ length: 25 }, () => ({ card: ids.marine }));
  p.players[1].hand = [
    { card: ids.marine, ref: 'one' },
    { card: ids.marine, ref: 'two' },
    { card: 'dengar--crude-and-slovenly', ref: 'pilot' },
  ];
  p.players[1].space = [{ card: 'munificent-frigate', ref: 'host' }];
  const g = scenario(p);
  const pilotCost = playCost(
    g.state,
    g.state.cards[g.refs.pilot!]!,
    0,
    'piloting',
    g.state.cards[g.refs.host!]!,
  );
  let s = attack(g.state, g.refs.source!);
  expect(playCost(s, s.cards[g.refs.pilot!]!, 0, 'piloting', s.cards[g.refs.host!]!)).toBe(
    pilotCost,
  );
  s = play(s, g.refs.one!);
  expect(s.players.bob!.resources.filter(id => s.cards[id]!.exhausted)).toHaveLength(3);
  expect(playCost(s, s.cards[g.refs.two!]!)).toBe(3);
  s = step(s, 'take-initiative');
  s = step(s, 'pass');
  expect(s.phase).toBe('regroup');
  expect(playCost(s, s.cards[g.refs.two!]!)).toBe(2);
});

test('Focus Fire resolves each of its simultaneous packets against a separate Shield', () => {
  const p = board('focus-fire');
  p.players[0].ground = [
    { card: 'occupier-siege-tank', ref: 'a' },
    { card: 'occupier-siege-tank', ref: 'b' },
  ];
  p.players[1].ground = [{ card: 'jedi-guardian', ref: 'enemy' }];
  p.attachments = [
    { card: 'shield', unit: 'enemy', ref: 'shield-a' },
    { card: 'shield', unit: 'enemy', ref: 'shield-b' },
  ];
  const g = scenario(p);
  let s = target(play(g.state, g.refs.source!), g.refs.enemy!);
  s = target(s, g.refs['shield-a']!);
  if (s.execution.decision?.kind !== 'action') s = target(s, g.refs['shield-b']!);
  expect(s.cards[g.refs.enemy!]!.damage).toBe(0);
  expect(tokens(s, g.refs.enemy!, 'shield')).toBe(0);
});

for (const ownEmpty of [false, true])
  test(`Never Tell Me the Odds still chooses its damage target when a deck is empty (${ownEmpty})`, () => {
    const p = board('never-tell-me-the-odds');
    p.players[0].deck = ownEmpty ? [] : [{ card: 'repair' }];
    p.players[1].deck = [];
    p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
    const g = scenario(p);
    const s = target(play(g.state, g.refs.source!), g.refs.enemy!);
    expect(s.cards[g.refs.enemy!]!.damage).toBe(ownEmpty ? 0 : 1);
  });

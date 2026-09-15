import { expect, test } from 'bun:test';
import pins from './fixtures/ibh.json';
import { cardDefinition, supportedCards } from '../cards/registry.ts';
import { advance } from '../engine/advance.ts';
import { scenario } from './scenario.ts';
import { decodeState, encodeState } from '../engine/checkpoint.ts';
import { Projector } from '../projection/projector.ts';
import { choose } from './helpers.ts';
import {
  board,
  play,
  attack,
  step,
  target,
  select,
  options,
  stats,
  ids,
  blank,
  refresh,
} from './jtl-helpers.ts';
const printed = (id: string) => {
  const c = cardDefinition(id);
  if (c.kind !== 'unit') throw Error('Unit required');
  return c;
};
const use = (state: ReturnType<typeof scenario>['state'], id: string) =>
  step(state, i => i.kind === 'use-ability' && i.card === id);
const names = Object.keys(pins) as (keyof typeof pins)[];
for (const id of names.filter(id => !pins[id].text))
  test(`${id} enters exhausted, retains printed stats and deals its printed combat power`, () => {
    const p = board(id),
      d = printed(id);
    const g = scenario(p);
    let s = play(g.state, g.refs.source!);
    expect(s.cards[g.refs.source!]!.zone).toBe(d.arena);
    expect(s.cards[g.refs.source!]!.exhausted).toBe(true);
    expect(stats(s, g.refs.source!)).toEqual({ power: d.power, hp: d.hp });
    s.cards[g.refs.source!]!.exhausted = false;
    s.activePlayer = 'alice';
    refresh(s);
    s = attack(s, g.refs.source!);
    expect(s.cards[s.players.bob!.base]!.damage).toBe(d.power);
  });
for (const id of [
  'blizzard-force-at-st',
  'bright-hope--narrow-escape',
  'chewbacca--rrruuuurrr',
  'death-squadron-star-destroyer',
])
  test(`${id} protects only its own arena with Sentinel`, () => {
    const p = board(id, false),
      d = printed(id);
    p.activePlayer = 'bob';
    p.players[1][d.arena] = [
      { card: d.arena === 'space' ? 'gr-75-medium-transport' : ids.consular, ref: 'attacker' },
    ];
    p.players[1][d.arena === 'space' ? 'ground' : 'space'] = [
      { card: d.arena === 'space' ? ids.marine : ids.fighter, ref: 'other' },
    ];
    const g = scenario(p);
    expect(
      options(g.state).some(
        i =>
          i.kind === 'attack' &&
          i.attacker === g.refs.attacker &&
          i.defender === g.state.players.alice!.base,
      ),
    ).toBe(false);
    expect(
      options(g.state).some(
        i => i.kind === 'attack' && i.attacker === g.refs.attacker && i.defender === g.refs.source,
      ),
    ).toBe(true);
    expect(
      options(g.state).some(
        i =>
          i.kind === 'attack' &&
          i.attacker === g.refs.other &&
          i.defender === g.state.players.alice!.base,
      ),
    ).toBe(true);
  });
for (const [id, raid] of [
  ['e-web-gunner', 4],
  ['rogue-squadron-speeder', 1],
  ['surface-assault-bomber', 1],
] as const)
  test(`${id} adds Raid only during its attack`, () => {
    const g = scenario(board(id, false)),
      d = printed(id);
    const s = attack(g.state, g.refs.source!);
    expect(s.cards[s.players.bob!.base]!.damage).toBe(d.power + raid);
    expect(stats(s, g.refs.source!).power).toBe(d.power);
  });
for (const [id, amount] of [
  ['lambda-shuttle', 1],
  ['luke-skywalker--do-you-read-me-', 2],
] as const)
  test(`${id} restores the attacking player's base`, () => {
    const p = board(id, false);
    p.players[0].base.damage = 5;
    p.players[1].base.damage = 4;
    const g = scenario(p),
      s = attack(g.state, g.refs.source!);
    expect(s.cards[s.players.alice!.base]!.damage).toBe(5 - amount);
    expect(s.cards[s.players.bob!.base]!.damage).toBe(4 + printed(id).power);
  });
for (const empty of [false, true])
  test(`Ozzel's defeat lets the opponent choose their own discard (${empty ? 'empty' : 'populated'} hand)`, () => {
    const p = board('admiral-ozzel--as-clumsy-as-he-is-stupid', false);
    p.activePlayer = 'bob';
    p.players[1].ground = [{ card: ids.marine, ref: 'attacker' }];
    p.players[1].hand = empty
      ? []
      : [
          { card: 'open-fire', ref: 'first' },
          { card: 'go-for-the-legs', ref: 'second' },
        ];
    const g = scenario(p);
    let s = attack(g.state, g.refs.attacker!, g.refs.source!);
    expect(s.cards[g.refs.source!]!.zone).toBe('discard');
    if (!empty) {
      expect(s.execution.decision!.playerId).toBe('bob');
      const publicView = new Projector(s.gameId, { role: 'spectator' }).project(s);
      expect(JSON.stringify(publicView)).not.toContain('go-for-the-legs');
      s = select(s, g.refs.second!);
      expect(s.cards[g.refs.second!]!.zone).toBe('discard');
      expect(s.cards[g.refs.first!]!.zone).toBe('hand');
    } else {
      s = select(s);
      expect(s.execution.decision!.kind).toBe('action');
    }
  });
for (const [id, ally, kind] of [
  ['admiral-piett--in-command-now', 'snowtrooper', 'attack'],
  ['c-3po--oh-dear--oh-dear', 'hoth-trooper', 'played'],
] as const)
  for (const friendly of [true, false])
    test(`${id} checks for a friendly aspect unit (${friendly})`, () => {
      const p = board(id, kind === 'played');
      p.players[friendly ? 0 : 1].ground = [
        ...(p.players[friendly ? 0 : 1].ground ?? []),
        { card: ally },
      ];
      const g = scenario(p),
        before = g.state.players.alice!.hand.length;
      const s = kind === 'played' ? play(g.state, g.refs.source!) : attack(g.state, g.refs.source!);
      expect(s.players.alice!.hand.length).toBe(
        before - (kind === 'played' ? 1 : 0) + (friendly ? 1 : 0),
      );
    });
test('Avenger deals simultaneous damage to other units in both arenas, including friendly units', () => {
  const p = board('avenger--hunting-the-rebels');
  p.players[0].ground = [{ card: ids.marine, ref: 'own' }];
  p.players[1].ground = [{ card: ids.marine, ref: 'enemy' }];
  p.players[1].space = [{ card: ids.fighter, ref: 'space' }];
  const g = scenario(p),
    s = play(g.state, g.refs.source!);
  expect(s.cards[g.refs.source!]!.damage).toBe(0);
  for (const key of ['own', 'enemy']) expect(s.cards[g.refs[key]!]!.damage).toBe(1);
  expect(s.cards[g.refs.space!]!.zone).toBe('discard');
});
test('Blizzard One chooses by remaining HP, includes friendly ground units and excludes leaders/space', () => {
  const p = board('blizzard-one--veers-at-the-helm');
  p.players[0].ground = [{ card: ids.marine, ref: 'friendly' }];
  p.players[1].ground = [
    { card: ids.consular, damage: 4, ref: 'damaged' },
    { card: ids.consular, ref: 'healthy' },
  ];
  p.players[1].space = [{ card: ids.fighter, ref: 'space' }];
  p.players[1].leader.deployedAs = 'unit';
  p.players[1].leader.damage = 2;
  const g = scenario(p);
  const pending = play(g.state, g.refs.source!);
  const targets = options(pending).flatMap(i => (i.kind === 'target' ? [i.card] : []));
  expect(targets).toContain(g.refs.friendly!);
  expect(targets).toContain(g.refs.damaged!);
  for (const key of ['healthy', 'space']) expect(targets).not.toContain(g.refs[key]!);
  expect(targets).not.toContain(g.state.players.bob!.leader);
  expect(target(pending, g.refs.damaged!).cards[g.refs.damaged!]!.zone).toBe('discard');
  expect(step(pending, 'decline-effect').cards[g.refs.damaged!]!.zone).toBe('ground');
});
for (const ally of [false, true])
  test(`General Veers conditions both base effects on a Vigilance unit (${ally})`, () => {
    const p = board('general-veers--leading-the-assault');
    p.players[0].base.damage = 5;
    if (ally) p.players[0].ground = [{ card: 'first-legion-trooper' }];
    const g = scenario(p),
      s = play(g.state, g.refs.source!);
    expect(s.cards[s.players.bob!.base]!.damage).toBe(ally ? 2 : 0);
    expect(s.cards[s.players.alice!.base]!.damage).toBe(ally ? 3 : 5);
  });
test('Rieekan exhausts himself and attacks with another ready Heroism unit, with a temporary bonus', () => {
  const p = board('general-rieekan--stalwart-tactician', false);
  p.players[0].ground!.push(
    { card: ids.marine, ref: 'hero' },
    { card: 'snowtrooper', ref: 'villain' },
    { card: ids.marine, exhausted: true, ref: 'tired' },
  );
  const g = scenario(p);
  let s = use(g.state, g.refs.source!);
  expect(s.cards[g.refs.source!]!.exhausted).toBe(true);
  const attackers = options(s).flatMap(i => (i.kind === 'attack' ? [i.attacker] : []));
  expect(attackers).toContain(g.refs.hero!);
  for (const key of ['source', 'villain', 'tired']) expect(attackers).not.toContain(g.refs[key]!);
  s = attack(s, g.refs.hero!);
  expect(s.cards[s.players.bob!.base]!.damage).toBe(5);
  expect(stats(s, g.refs.hero!).power).toBe(3);
});
test('Hoth Lieutenant can decline the attack or grant a different unit +2 power for its attack', () => {
  const p = board('hoth-lieutenant');
  p.players[0].ground = [{ card: ids.marine, ref: 'attacker' }];
  const g = scenario(p),
    pending = play(g.state, g.refs.source!);
  expect(step(pending, 'decline-effect').cards[g.refs.attacker!]!.exhausted).toBe(false);
  let s = step(pending, 'accept-effect');
  expect(options(s).some(i => i.kind === 'attack' && i.attacker === g.refs.source)).toBe(false);
  s = attack(s, g.refs.attacker!);
  expect(s.cards[s.players.bob!.base]!.damage).toBe(5);
});
test('Han reduces the defender for one combat and adds Raid to his own power', () => {
  const p = board('han-solo--scruffy-looking-nerf-herder', false);
  p.players[1].ground = [{ card: ids.consular, ref: 'defender' }];
  const g = scenario(p),
    s = attack(g.state, g.refs.source!, g.refs.defender!);
  expect(s.cards[g.refs.source!]!.damage).toBe(1);
  expect(s.cards[g.refs.defender!]!.damage).toBe(6);
  expect(stats(s, g.refs.defender!).power).toBe(3);
  expect(stats(s, g.refs.source!).power).toBe(4);
  expect(attack(g.state, g.refs.source!).cards[g.state.players.bob!.base]!.damage).toBe(6);
});
test('Imperial Deck Officer heals a Villainy unit on either side and pays exhaustion', () => {
  const p = board('imperial-deck-officer', false);
  p.players[1].ground = [
    { card: 'snowtrooper', damage: 2, ref: 'villain' },
    { card: ids.marine, damage: 2, ref: 'hero' },
  ];
  const g = scenario(p),
    pending = use(g.state, g.refs.source!);
  expect(options(pending).some(i => i.kind === 'target' && i.card === g.refs.hero)).toBe(false);
  const s = target(pending, g.refs.villain!);
  expect(s.cards[g.refs.source!]!.exhausted).toBe(true);
  expect(s.cards[g.refs.villain!]!.damage).toBe(0);
});
test('Ion Cannon targets either side in space, including a pending Shield replacement', () => {
  const p = board('ion-cannon', false);
  p.players[0].space = [{ card: 'bright-hope--narrow-escape', ref: 'own' }];
  p.players[1].space = [{ card: 'bright-hope--narrow-escape', ref: 'enemy' }];
  p.players[1].ground = [{ card: ids.consular, ref: 'ground' }];
  p.attachments = [{ card: 'shield', unit: 'enemy', ref: 'shield' }];
  const g = scenario(p),
    pending = use(g.state, g.refs.source!);
  expect(options(pending).some(i => i.kind === 'target' && i.card === g.refs.ground)).toBe(false);
  expect(target(pending, g.refs.own!).cards[g.refs.own!]!.damage).toBe(3);
  const s = target(pending, g.refs.enemy!);
  expect(s.cards[g.refs.enemy!]!.damage).toBe(0);
  expect(s.cards[g.refs.shield!]!.zone).not.toBe('space');
  expect(s.cards[g.refs.source!]!.exhausted).toBe(true);
});
test('Luke may deal three damage to either side in the ground arena when played', () => {
  const p = board('luke-skywalker--do-you-read-me-');
  p.players[0].ground = [{ card: ids.consular, ref: 'own' }];
  p.players[1].space = [{ card: ids.fighter, ref: 'space' }];
  const g = scenario(p),
    pending = play(g.state, g.refs.source!);
  expect(options(pending).some(i => i.kind === 'target' && i.card === g.refs.space)).toBe(false);
  expect(target(pending, g.refs.own!).cards[g.refs.own!]!.damage).toBe(3);
  expect(step(pending, 'decline-effect').cards[g.refs.own!]!.damage).toBe(0);
});
for (const command of [false, true])
  test(`R2-D2 exhausts an eligible enemy only with a Command unit (${command})`, () => {
    const p = board('r2-d2--known-to-make-mistakes', false);
    if (command) p.players[0].ground!.push({ card: ids.marine });
    p.players[1].ground = [
      { card: 'first-legion-trooper', ref: 'enemy' },
      { card: 'ground-assault-at-at', ref: 'large' },
    ];
    p.players[1].space = [{ card: ids.fighter, ref: 'space' }];
    const g = scenario(p);
    let s = attack(g.state, g.refs.source!);
    if (command) {
      expect(
        options(s).some(i => i.kind === 'target' && [g.refs.large, g.refs.space].includes(i.card)),
      ).toBe(false);
      s = target(s, g.refs.enemy!);
    }
    expect(s.cards[g.refs.enemy!]!.exhausted).toBe(command);
  });
for (const own of [false, true])
  test(`Rebellion Y-Wing can assign its attack ability to the ${own ? 'friendly' : 'enemy'} base`, () => {
    const g = scenario(board('rebellion-y-wing', false));
    let s = attack(g.state, g.refs.source!);
    s = target(s, own ? s.players.alice!.base : s.players.bob!.base);
    expect(s.cards[s.players.alice!.base]!.damage).toBe(own ? 1 : 0);
    expect(s.cards[s.players.bob!.base]!.damage).toBe(own ? 2 : 3);
  });
test('Tauntaun heals its owner on defeat; blanked Tauntaun has no defeat trigger', () => {
  const p = board('tauntaun-mount', false);
  p.players[0].base.damage = 4;
  p.activePlayer = 'bob';
  p.players[1].ground = [{ card: ids.marine, ref: 'attacker' }];
  const g = scenario(p);
  expect(
    attack(g.state, g.refs.attacker!, g.refs.source!).cards[g.state.players.alice!.base]!.damage,
  ).toBe(2);
  blank(g.state, g.refs.source!);
  refresh(g.state);
  expect(
    attack(g.state, g.refs.attacker!, g.refs.source!).cards[g.state.players.alice!.base]!.damage,
  ).toBe(4);
});
test('Go for the Legs exhausts enemy ground units, with no friendly or space choice', () => {
  const p = board('go-for-the-legs');
  p.players[0].ground = [{ card: ids.marine, ref: 'own' }];
  p.players[1].ground = [{ card: ids.marine, ref: 'enemy' }];
  p.players[1].space = [{ card: ids.fighter, ref: 'space' }];
  const g = scenario(p),
    s = play(g.state, g.refs.source!);
  expect(
    options(s)
      .filter(i => i.kind === 'target')
      .map(i => i.card),
  ).toEqual([g.refs.enemy!]);
  expect(target(s, g.refs.enemy!).cards[g.refs.enemy!]!.exhausted).toBe(true);
});
for (const count of [0, 1, 3])
  test(`I'll Cover For You chooses exactly two distinct enemies, or as many as possible (${count})`, () => {
    const p = board('i-ll-cover-for-you');
    p.players[0].ground = [{ card: ids.marine, ref: 'own' }];
    p.players[1].ground = Array.from({ length: count }, (_, i) => ({
      card: ids.marine,
      ref: `enemy-${i}`,
    }));
    const g = scenario(p);
    let s = play(g.state, g.refs.source!);
    if (count) {
      expect(s.execution.decision!.selection!.min).toBe(Math.min(2, count));
      expect(s.execution.decision!.selection!.cards).not.toContain(g.refs.own!);
      if (count > 1)
        expect(() =>
          advance(s, choose(s, 'accept-effect', [g.refs['enemy-0']!, g.refs['enemy-0']!])),
        ).toThrow();
      s = select(s, ...Array.from({ length: Math.min(2, count) }, (_, i) => g.refs[`enemy-${i}`]!));
    }
    for (let i = 0; i < count; i++)
      expect(s.cards[g.refs[`enemy-${i}`]!]!.damage).toBe(i < 2 ? 1 : 0);
    expect(s.cards[g.refs.own!]!.damage).toBe(0);
  });
for (const units of [0, 1, 2])
  test(`I've Found Them reveals three, draws a chosen unit, and discards only the others (${units} units)`, () => {
    const p = board('i-ve-found-them');
    p.players[0].deck = [
      { card: units ? 'echo-coordinator' : 'open-fire', ref: 'first' },
      { card: units > 1 ? 'trench-defender' : 'go-for-the-legs', ref: 'second' },
      { card: 'recovery', ref: 'third' },
      { card: 'snowtrooper', ref: 'fourth' },
    ];
    const g = scenario(p);
    let s = play(g.state, g.refs.source!);
    if (units) {
      const view = JSON.stringify(new Projector(s.gameId, { role: 'spectator' }).project(s));
      expect(view).toContain('echo-coordinator');
      expect(view).toContain('recovery');
      expect(view).not.toContain('snowtrooper');
      expect(s.execution.decision!.selection!.min).toBe(1);
      s = select(s, g.refs.first!);
      expect(s.cards[g.refs.first!]!.zone).toBe('hand');
      expect(s.phaseHistory.cardsDrawn.alice).toBe(1);
    } else {
      s = select(s);
      expect(s.cards[g.refs.first!]!.zone).toBe('discard');
    }
    expect(s.cards[g.refs.second!]!.zone).toBe('discard');
    expect(s.cards[g.refs.third!]!.zone).toBe('discard');
    expect(s.players.alice!.deck).toEqual([g.refs.fourth!]);
  });
test('I Want Proof draws before the owner chooses a private hand discard', () => {
  const g = scenario(board('i-want-proof--not-leads'));
  let s = play(g.state, g.refs.source!);
  expect(s.players.alice!.hand).toHaveLength(2);
  expect(s.execution.decision!.playerId).toBe('alice');
  const discarded = s.players.alice!.hand[1]!;
  s = select(s, discarded);
  expect(s.players.alice!.hand).toHaveLength(1);
  expect(s.cards[discarded]!.zone).toBe('discard');
});
test('Improvised Detonation attacks a friendly unit with +2 power for one attack', () => {
  const p = board('improvised-detonation');
  p.players[0].ground = [{ card: ids.marine, ref: 'attacker' }];
  const g = scenario(p),
    s = attack(play(g.state, g.refs.source!), g.refs.attacker!);
  expect(s.cards[s.players.bob!.base]!.damage).toBe(5);
  expect(stats(s, g.refs.attacker!).power).toBe(3);
});
for (const [id, amount] of [
  ['recovery', 5],
  ['too-strong-for-blasters', 2],
] as const)
  test(`${id} heals up to printed damage from either side`, () => {
    const p = board(id);
    p.players[1].ground = [{ card: ids.consular, damage: 4, ref: 'enemy' }];
    const g = scenario(p),
      s = target(play(g.state, g.refs.source!), g.refs.enemy!);
    expect(s.cards[g.refs.enemy!]!.damage).toBe(Math.max(0, 4 - amount));
  });
for (const own of [false, true])
  test(`Target the Main Generator can damage the ${own ? 'friendly' : 'enemy'} base`, () => {
    const g = scenario(board('target-the-main-generator')),
      s = target(play(g.state, g.refs.source!), g.state.players[own ? 'alice' : 'bob']!.base);
    expect(s.cards[s.players[own ? 'alice' : 'bob']!.base]!.damage).toBe(2);
  });
test("We're In Trouble deals damage to a unit in either arena", () => {
  const p = board('we-re-in-trouble');
  p.players[1].space = [{ card: 'bright-hope--narrow-escape', ref: 'enemy' }];
  const g = scenario(p),
    s = target(play(g.state, g.refs.source!), g.refs.enemy!);
  expect(s.cards[g.refs.enemy!]!.damage).toBe(3);
});
test('You Have Failed Me must defeat a friendly unit before readying a surviving unit of power five or less', () => {
  const p = board('you-have-failed-me');
  p.players[0].ground = [
    { card: ids.marine, ref: 'sacrifice' },
    { card: ids.consular, exhausted: true, ref: 'ready' },
    { card: 'rampaging-wampa', exhausted: true, ref: 'large' },
  ];
  p.players[1].ground = [{ card: ids.marine, ref: 'enemy' }];
  const g = scenario(p);
  let s = play(g.state, g.refs.source!);
  expect(options(s).some(i => i.kind === 'target' && i.card === g.refs.enemy)).toBe(false);
  s = target(s, g.refs.sacrifice!);
  expect(s.cards[g.refs.sacrifice!]!.zone).toBe('discard');
  expect(
    options(s).some(i => i.kind === 'target' && [g.refs.large, g.refs.sacrifice].includes(i.card)),
  ).toBe(false);
  s = target(s, g.refs.ready!);
  expect(s.cards[g.refs.ready!]!.exhausted).toBe(false);
  const empty = scenario(board('you-have-failed-me'));
  expect(play(empty.state, empty.refs.source!).execution.decision!.kind).toBe('action');
});
test('all IBH printings are supported and changed choices retain exact state through serialization', async () => {
  const catalog = await Bun.file(
    new URL('../../server/db/json/card-list.json', import.meta.url),
  ).json();
  const ibh = Object.values(catalog).filter((c: any) =>
    Object.values(c.variants).some((v: any) => v.set === 'ibh'),
  ) as { cardId: string }[];
  expect(ibh.every(c => supportedCards.some(d => d.cardId === c.cardId))).toBe(true);
  const p = board('i-ve-found-them');
  p.players[0].deck = [
    { card: 'echo-coordinator', ref: 'found' },
    { card: 'trench-defender' },
    { card: 'recovery' },
  ];
  const g = scenario(p),
    pending = play(g.state, g.refs.source!),
    input = choose(pending, 'accept-effect', [g.refs.found!]);
  expect(advance(decodeState(encodeState(pending)), input)).toEqual(advance(pending, input));
});

for (const count of [0, 1])
  test(`I've Found Them handles a short deck without inventing an extra draw (${count} cards)`, () => {
    const p = board('i-ve-found-them');
    p.players[0].deck = count ? [{ card: 'recovery', ref: 'revealed' }] : [];
    const g = scenario(p),
      s = select(play(g.state, g.refs.source!));
    expect(s.players.alice!.deck).toHaveLength(0);
    expect(s.players.alice!.hand).toHaveLength(0);
    expect(s.cards[s.players.alice!.base]!.damage).toBe(0);
    if (count) expect(s.cards[g.refs.revealed!]!.zone).toBe('discard');
  });

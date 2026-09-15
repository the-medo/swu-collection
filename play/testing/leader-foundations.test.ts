import { expect, test } from 'bun:test';
import { advance } from '../engine/advance.ts';
import { attachedUpgrades, unitKeywords, unitStats } from '../engine/attachments.ts';
import { encodeState } from '../engine/checkpoint.ts';
import { effectiveAbilities } from '../engine/effective-abilities.ts';
import { forceToken } from '../engine/force.ts';
import type { GameState, Intent } from '../engine/model.ts';
import { Projector } from '../projection/projector.ts';
import { choose, ids, position } from './helpers.ts';
import { scenario } from './scenario.ts';

function step(
  s: GameState,
  i: Intent['kind'] | ((i: Intent) => boolean),
  selection: string[] = [],
) {
  return advance(s, choose(s, i, selection)).state;
}
const target = (s: GameState, id: string) => step(s, i => i.kind === 'target' && i.card === id);
const use = (s: GameState) =>
  step(s, i => i.kind === 'use-ability' && i.abilityId === 'leader-action');
const resources = (n = 12) => Array.from({ length: n }, () => ({ card: ids.marine }));
const ready = (s: GameState) =>
  s.players.alice!.resources.filter(id => !s.cards[id]!.exhausted).length;
const tokens = (s: GameState, id: string) => attachedUpgrades(s, s.cards[id]!).map(c => c.cardId);
function fixture(leader: string, deployed = false) {
  const p = position();
  p.players[0].leader = { card: leader, ref: 'leader', deployedAs: deployed ? 'unit' : null };
  p.players[0].resources = resources();
  return p;
}
function attack(s: GameState, attacker = s.players.alice!.leader, defender = s.players.bob!.base) {
  let next = step(
    s,
    i => i.kind === 'attack' && i.attacker === attacker && i.defender === defender,
  );
  const frame = next.execution.frames[0];
  if (frame?.kind === 'trigger-batch') {
    const t = frame.triggers.find(
      t => t.source.instanceId === attacker && t.abilityId === 'attack',
    );
    if (t) next = step(next, i => i.kind === 'trigger' && i.triggerId === t.id);
  }
  return next;
}
function resume(s: GameState, i: ReturnType<typeof choose>) {
  const child = Bun.spawnSync(
    [process.execPath, new URL('./fixtures/resume.ts', import.meta.url).pathname],
    {
      stdin: new TextEncoder().encode(JSON.stringify({ state: encodeState(s), input: i })),
      stdout: 'pipe',
      stderr: 'pipe',
    },
  );
  expect(child.exitCode).toBe(0);
  expect(JSON.parse(child.stdout.toString())).toEqual(advance(s, i));
}

for (const leader of ['chewbacca--walking-carpet', 'fennec-shand--honoring-the-deal']) {
  test(`${leader}: front action pays to play the exact eligible unit and grants the phase keyword`, () => {
    const p = fixture(leader);
    p.players[0].hand = [
      { card: ids.marine, ref: 'one' },
      { card: ids.marine, ref: 'two' },
      { card: 'devastator--hunting-the-rebellion', ref: 'big' },
    ];
    p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
    const s = scenario(p),
      choice = use(s.state);
    expect(choice.cards[s.refs.leader!]!.exhausted).toBe(true);
    expect(
      choice.execution
        .decision!.options.filter(o => o.intent.kind === 'play')
        .map(o => o.intent.kind === 'play' && o.intent.card),
    ).toEqual([s.refs.one!, s.refs.two!]);
    resume(
      choice,
      choose(choice, i => i.kind === 'play' && i.card === s.refs.two),
    );
    let done = step(choice, i => i.kind === 'play' && i.card === s.refs.two);
    if (leader.startsWith('fennec')) done = step(done, 'decline-effect');
    expect(done.cards[s.refs.one!]!.zone).toBe('hand');
    expect(done.cards[s.refs.two!]!.zone).toBe('ground');
    expect(unitKeywords(done, done.cards[s.refs.two!]!)).toContain(
      leader.startsWith('fennec') ? 'Ambush' : 'Sentinel',
    );
    expect(ready(done)).toBe(leader.startsWith('fennec') ? 9 : 10);
  });
}

test('Chewbacca deploys ready while exhausted and has Sentinel and damage-derived Grit, without his front action', () => {
  const p = fixture('chewbacca--walking-carpet');
  p.players[0].leader.exhausted = true;
  p.players[0].resources = resources(7);
  let s = scenario(p).state;
  s = step(s, i => i.kind === 'use-ability' && i.abilityId === 'deploy');
  const leader = s.cards[s.players.alice!.leader]!;
  expect(leader.exhausted).toBe(false);
  expect(ready(s)).toBe(7);
  expect(unitKeywords(s, leader)).toEqual(expect.arrayContaining(['Sentinel', 'Grit']));
  leader.damage = 3;
  expect(unitStats(s, leader)).toEqual({ power: 5, hp: 9 });
  s = step(s, 'pass');
  expect(
    s.execution.decision!.options.some(
      o => o.intent.kind === 'use-ability' && o.intent.card === leader.instanceId,
    ),
  ).toBe(false);
});

for (const leader of ['fennec-shand--honoring-the-deal', 'han-solo--worth-the-risk']) {
  test(`${leader}: deployed action works while exhausted and requires an actual play`, () => {
    const p = fixture(leader, true);
    p.players[0].leader.exhausted = true;
    p.players[0].hand = [{ card: ids.marine, ref: 'unit' }];
    const s = scenario(p),
      choice = use(s.state);
    expect(choice.execution.decision!.options.some(o => o.intent.kind === 'decline-effect')).toBe(
      false,
    );
    const done = step(choice, 'play');
    expect(done.cards[s.refs.unit!]!.zone).toBe('ground');
    expect(ready(done)).toBe(leader.startsWith('han') ? 11 : 10);
    expect(done.cards[s.refs.unit!]!.damage).toBe(leader.startsWith('han') ? 2 : 0);
    p.players[0].hand = [];
    expect(
      scenario(p).state.execution.decision!.options.some(o => o.intent.kind === 'use-ability'),
    ).toBe(false);
  });
}

test('Han deals his two damage before Shielded resolves; his front exhausts as a separate cost', () => {
  const p = fixture('han-solo--worth-the-risk');
  p.players[0].hand = [{ card: 'itinerant-warrior', ref: 'played' }];
  const s = scenario(p);
  let done = step(use(s.state), 'play');
  while (done.execution.decision?.options.some(o => o.intent.kind === 'trigger'))
    done = step(done, 'trigger');
  expect(done.cards[s.refs.leader!]!.exhausted).toBe(true);
  expect(done.cards[s.refs.played!]!.damage).toBe(2);
  expect(tokens(done, s.refs.played!)).toContain('shield');
  const damage = done.facts.findIndex(
    f => f.type === 'damage' && f.cards.some(c => c.instanceId === s.refs.played),
  );
  const shield = done.facts.findIndex(
    f => f.type === 'attached' && f.cards.some(c => c.cardId === 'shield'),
  );
  expect(damage).toBeLessThan(shield);
});

for (const deployed of [false, true]) {
  test(`Grand Inquisitor ${deployed ? 'unit' : 'front'} damages and readies the chosen friendly unit`, () => {
    const p = fixture('grand-inquisitor--hunting-the-jedi', deployed);
    p.players[0].ground = [
      { card: ids.consular, ref: 'one', exhausted: true },
      { card: ids.consular, ref: 'two', exhausted: true },
    ];
    p.players[1].ground = [{ card: ids.marine, ref: 'enemy' }];
    const s = scenario(p),
      choice = deployed ? attack(s.state) : use(s.state);
    expect(
      choice.execution.decision!.options.some(
        o => o.intent.kind === 'target' && [s.refs.leader, s.refs.enemy].includes(o.intent.card),
      ),
    ).toBe(false);
    const done = target(choice, s.refs.two!);
    expect(done.cards[s.refs.one!]!.exhausted).toBe(true);
    expect(done.cards[s.refs.two!]!.exhausted).toBe(false);
    expect(done.cards[s.refs.two!]!.damage).toBe(deployed ? 1 : 2);
  });
}

test('Grand Inquisitor cannot ready a new incarnation after lethal damage', () => {
  const p = fixture('grand-inquisitor--hunting-the-jedi');
  p.players[0].ground = [{ card: ids.trooper, ref: 'fragile', exhausted: true }];
  const s = scenario(p),
    done = target(use(s.state), s.refs.fragile!);
  expect(done.cards[s.refs.fragile!]!.zone).toBe('discard');
  expect(
    done.facts.filter(
      f => f.type === 'readied' && f.cards.some(c => c.instanceId === s.refs.fragile),
    ),
  ).toHaveLength(0);
});

for (const deployed of [false, true]) {
  test(`Tarkin ${deployed ? 'unit' : 'front'} gives Experience to another exact Imperial, including enemy units`, () => {
    const p = fixture('grand-moff-tarkin--oversector-governor', deployed);
    p.players[1].ground = [
      { card: ids.trooper, ref: 'enemy' },
      { card: ids.marine, ref: 'rebel' },
    ];
    const s = scenario(p),
      choice = deployed ? attack(s.state) : use(s.state);
    expect(
      choice.execution.decision!.options.some(
        o => o.intent.kind === 'target' && [s.refs.leader, s.refs.rebel].includes(o.intent.card),
      ),
    ).toBe(false);
    const done = target(choice, s.refs.enemy!);
    expect(tokens(done, s.refs.enemy!)).toEqual(['experience']);
    expect(ready(done)).toBe(deployed ? 12 : 11);
  });
}

for (const deployed of [false, true]) {
  test(`Maul ${deployed ? 'unit aura' : 'front action'} grants Overwhelm for an attack`, () => {
    const p = fixture('maul--a-rival-in-darkness', deployed);
    p.players[0].ground = [{ card: ids.consular, ref: 'attacker' }];
    p.players[1].ground = [{ card: ids.trooper, ref: 'defender' }];
    const s = scenario(p);
    const done = deployed
      ? attack(s.state, s.refs.attacker!, s.refs.defender!)
      : attack(target(use(s.state), s.refs.attacker!), s.refs.attacker!, s.refs.defender!);
    expect(done.cards[done.players.bob!.base]!.damage).toBe(2);
    expect(unitKeywords(done, done.cards[s.refs.attacker!]!).includes('Overwhelm')).toBe(deployed);
  });
}

test('IG-88 front counts both arenas for its bonus; the deployed aura grants Raid only to other friendlies', () => {
  for (const deployed of [false, true]) {
    const p = fixture('ig-88--ruthless-bounty-hunter', deployed);
    p.players[0].ground = [{ card: ids.marine, ref: 'attacker' }];
    p.players[0].space = [{ card: ids.fighter, ref: 'other' }];
    p.players[1].ground = [{ card: ids.consular }];
    const s = scenario(p);
    const done = deployed
      ? attack(s.state, s.refs.attacker!)
      : attack(target(use(s.state), s.refs.attacker!), s.refs.attacker!);
    expect(done.cards[done.players.bob!.base]!.damage).toBe(4);
    expect(unitStats(done, done.cards[s.refs.attacker!]!).power).toBe(3);
    if (deployed) expect(effectiveAbilities(done, done.cards[s.refs.leader!]!).raid).toBe(0);
  }
});

for (const deployed of [false, true]) {
  test(`Rey ${deployed ? 'unit' : 'front'} checks current power and the unit side restores three`, () => {
    const p = fixture('rey--more-than-a-scavenger', deployed);
    p.players[0].base.damage = 7;
    p.players[0].ground = [
      { card: 'jedi-consular', ref: 'small' },
      { card: ids.marine, ref: 'big' },
    ];
    const s = scenario(p),
      choice = deployed ? attack(s.state) : use(s.state);
    expect(
      choice.execution.decision!.options.some(
        o => o.intent.kind === 'target' && o.intent.card === s.refs.big,
      ),
    ).toBe(false);
    const done = target(choice, s.refs.small!);
    expect(tokens(done, s.refs.small!)).toEqual(['experience']);
    expect(done.cards[done.players.alice!.base]!.damage).toBe(deployed ? 4 : 7);
  });
}

for (const deployed of [false, true]) {
  test(`Wat Tambor ${deployed ? 'unit' : 'front'} requires a friendly defeat and grants the selected unit +2/+2`, () => {
    const p = fixture('wat-tambor--techno-union-foreman', deployed);
    p.players[0].ground = [{ card: ids.consular, ref: 'chosen' }];
    p.players[0].discard = [{ card: ids.marine, ref: 'dead' }];
    p.defeatedThisPhase = ['dead'];
    const s = scenario(p),
      done = target(deployed ? attack(s.state) : use(s.state), s.refs.chosen!);
    expect(unitStats(done, done.cards[s.refs.chosen!]!)).toEqual({ power: 5, hp: 9 });
    p.defeatedThisPhase = [];
    const absent = scenario(p);
    const nothing = deployed ? attack(absent.state) : use(absent.state);
    expect(nothing.activePlayer).toBe('bob');
    expect(unitStats(nothing, nothing.cards[absent.refs.chosen!]!)).toEqual({ power: 3, hp: 7 });
  });
}

for (const deployed of [false, true]) {
  test(`Grievous ${deployed ? 'unit' : 'front'} gives Sentinel to a Droid in either control`, () => {
    const p = fixture('general-grievous--general-of-the-droid-armies', deployed);
    p.players[1].ground = [
      { card: 'battle-droid', ref: 'droid' },
      { card: ids.marine, ref: 'other' },
    ];
    const s = scenario(p),
      choice = deployed ? attack(s.state) : use(s.state);
    expect(
      choice.execution.decision!.options.some(
        o => o.intent.kind === 'target' && o.intent.card === s.refs.other,
      ),
    ).toBe(false);
    const done = target(choice, s.refs.droid!);
    expect(unitKeywords(done, done.cards[s.refs.droid!]!)).toContain('Sentinel');
    expect(unitStats(done, done.cards[s.refs.droid!]!).power).toBe(deployed ? 2 : 1);
  });
}

for (const deployed of [false, true]) {
  test(`Ahsoka ${deployed ? 'unit does not require' : 'front consumes'} the Force for her Sentinel effect`, () => {
    const p = fixture('ahsoka-tano--fighting-for-peace', deployed);
    p.players[0].force = !deployed;
    p.players[0].ground = [{ card: ids.consular, ref: 'unit' }];
    const s = scenario(p),
      choice = deployed ? attack(s.state) : use(s.state);
    resume(
      choice,
      choose(choice, i => i.kind === 'target' && i.card === s.refs.unit),
    );
    const done = target(choice, s.refs.unit!);
    expect(forceToken(done, 'alice')).toBeUndefined();
    expect(done.phaseHistory.forceUsed.alice ?? 0).toBe(deployed ? 0 : 1);
    expect(unitKeywords(done, done.cards[s.refs.unit!]!)).toContain('Sentinel');
  });
}

test('Ahsoka cannot use the front action without the Force or while exhausted', () => {
  for (const [force, exhausted] of [
    [false, false],
    [true, true],
  ]) {
    const p = fixture('ahsoka-tano--fighting-for-peace');
    p.players[0].force = force;
    p.players[0].leader.exhausted = exhausted;
    expect(
      scenario(p).state.execution.decision!.options.some(
        o => o.intent.kind === 'use-ability' && o.intent.abilityId === 'leader-action',
      ),
    ).toBe(false);
  }
});

for (const deployed of [false, true]) {
  test(`Barriss ${deployed ? 'unit' : 'front'} spends the Force then pays for a discounted event`, () => {
    const p = fixture('barriss-offee--we-have-become-villains', deployed);
    p.players[0].force = true;
    p.players[0].hand = [
      { card: 'open-fire', ref: 'event' },
      { card: ids.marine, ref: 'unit' },
    ];
    p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
    const s = scenario(p),
      choice = use(s.state);
    expect(
      choice.execution
        .decision!.options.filter(o => o.intent.kind === 'play')
        .map(o => o.intent.kind === 'play' && o.intent.card),
    ).toEqual([s.refs.event!]);
    expect(forceToken(choice, 'alice')).toBeUndefined();
    const done = target(step(choice, 'play'), s.refs.enemy!);
    expect(done.cards[s.refs.enemy!]!.damage).toBe(4);
    expect(ready(done)).toBe(8);
    expect(done.cards[s.refs.leader!]!.exhausted).toBe(!deployed);
  });
}

for (const deployed of [false, true]) {
  test(`Cal ${deployed ? 'unit' : 'front'} gives the opponent the choice of a ready unit`, () => {
    const p = fixture('cal-kestis--i-can-t-keep-hiding', deployed);
    p.players[0].force = !deployed;
    p.players[1].ground = [
      { card: ids.consular, ref: 'one' },
      { card: ids.consular, ref: 'two' },
      { card: ids.marine, ref: 'exhausted', exhausted: true },
    ];
    const s = scenario(p),
      choice = deployed ? attack(s.state) : use(s.state);
    expect(choice.execution.decision!.playerId).toBe('bob');
    expect(
      choice.execution
        .decision!.options.filter(o => o.intent.kind === 'target')
        .map(o => o.intent.kind === 'target' && o.intent.card),
    ).toEqual([s.refs.one!, s.refs.two!]);
    expect(
      new Projector(choice.gameId, { role: 'player', playerId: 'alice' }).project(choice).decision,
    ).toBeNull();
    resume(
      choice,
      choose(choice, i => i.kind === 'target' && i.card === s.refs.two),
    );
    const done = target(choice, s.refs.two!);
    expect(done.cards[s.refs.one!]!.exhausted).toBe(false);
    expect(done.cards[s.refs.two!]!.exhausted).toBe(true);
  });
}

test('Kanan front protects a Creature or Spectre; deployment grants Shielded and only friendly companions boost stats', () => {
  const p = fixture('kanan-jarrus--help-us-survive');
  p.players[1].ground = [{ card: 'loth-wolf', ref: 'creature' }];
  const s = scenario(p),
    done = target(use(s.state), s.refs.creature!);
  expect(tokens(done, s.refs.creature!)).toEqual(['shield']);
  p.players[0].leader.exhausted = true;
  const initial = scenario(p),
    deployed = step(initial.state, i => i.kind === 'use-ability' && i.abilityId === 'deploy');
  expect(tokens(deployed, initial.refs.leader!)).toEqual(['shield']);
  expect(unitStats(deployed, deployed.cards[initial.refs.leader!]!)).toEqual({ power: 3, hp: 6 });
  p.players[0].leader.deployedAs = 'unit';
  p.players[0].ground = [{ card: 'loth-wolf', ref: 'friendly' }];
  const companion = scenario(p);
  expect(unitStats(companion.state, companion.state.cards[companion.refs.leader!]!)).toEqual({
    power: 5,
    hp: 8,
  });
});

test('Kit Fisto front requires a recorded Jedi attack; unit power counts other friendly Jedi', () => {
  const p = fixture('kit-fisto--focused-jedi-master');
  p.players[0].ground = [{ card: 'jedi-consular', ref: 'jedi' }];
  p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
  const before = scenario(p),
    inactive = use(before.state);
  expect(inactive.activePlayer).toBe('bob');
  expect(ready(inactive)).toBe(11);
  p.attackedThisPhase = ['jedi'];
  const s = scenario(p),
    done = target(use(s.state), s.refs.enemy!);
  expect(done.cards[s.refs.enemy!]!.damage).toBe(2);
  p.players[0].leader.deployedAs = 'unit';
  const unit = scenario(p);
  expect(unitStats(unit.state, unit.state.cards[unit.refs.leader!]!)).toEqual({ power: 2, hp: 6 });
  expect(unitKeywords(unit.state, unit.state.cards[unit.refs.leader!]!)).toContain('Saboteur');
});

for (const deployed of [false, true]) {
  test(`C-3PO ${deployed ? 'unit' : 'front'} requires another exhausted friendly unit`, () => {
    const p = fixture('c-3po--human-cyborg-relations', deployed);
    p.players[0].ground = [{ card: ids.marine, ref: 'friend', exhausted: true }];
    p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
    const s = scenario(p),
      done = target(deployed ? attack(s.state) : use(s.state), s.refs.enemy!);
    expect(done.cards[s.refs.enemy!]!.exhausted).toBe(true);
    p.players[0].ground = [];
    const absent = scenario(p),
      nothing = deployed ? attack(absent.state) : use(absent.state);
    expect(nothing.cards[absent.refs.enemy!]!.exhausted).toBe(false);
  });
}

test('Sly Moore front counts exhausted units across both players; the attack targets only exhausted units', () => {
  const p = fixture('sly-moore--cipher-in-the-dark');
  p.players[0].ground = [
    { card: ids.marine, exhausted: true },
    { card: ids.consular, exhausted: true },
  ];
  p.players[1].ground = [
    { card: ids.marine, exhausted: true },
    { card: ids.consular, ref: 'enemy', exhausted: true },
  ];
  const done = use(scenario(p).state);
  expect(done.ground.filter(id => done.cards[id]!.cardId === 'spy')).toHaveLength(1);
  p.players[0].leader.deployedAs = 'unit';
  const s = scenario(p),
    hit = target(attack(s.state), s.refs.enemy!);
  expect(hit.cards[s.refs.enemy!]!.damage).toBe(2);
});

for (const deployed of [false, true]) {
  test(`Vel ${deployed ? 'unit' : 'front'} gives Experience and an enemy Credit, with optional attack refusal`, () => {
    const p = fixture('vel-sartha--aldhani-insurgent', deployed);
    p.players[0].ground = [{ card: ids.consular, ref: 'unit' }];
    const s = scenario(p),
      choice = deployed ? attack(s.state) : use(s.state);
    if (deployed) expect(step(choice, 'decline-effect').players.bob!.tokens).toHaveLength(0);
    const done = target(choice, s.refs.unit!);
    expect(tokens(done, s.refs.unit!)).toEqual(['experience']);
    expect(done.players.bob!.tokens.map(id => done.cards[id]!.cardId)).toEqual(['credit']);
  });
}

test('Vel front still creates an enemy Credit when no unit exists', () => {
  const done = use(scenario(fixture('vel-sartha--aldhani-insurgent')).state);
  expect(done.players.bob!.tokens.map(id => done.cards[id]!.cardId)).toEqual(['credit']);
});

test('Bo-Katan deploys with seven resources plus three Mandalorians without spending resources or exhausting', () => {
  const p = fixture('bo-katan-kryze--reclaiming-mandalore');
  p.players[0].leader.exhausted = true;
  p.players[0].resources = resources(7);
  p.players[0].ground = Array.from({ length: 3 }, () => ({ card: 'mandalorian' }));
  const s = scenario(p),
    done = step(s.state, i => i.kind === 'use-ability' && i.abilityId === 'deploy');
  expect(done.cards[s.refs.leader!]!.deployedAs).toBe('unit');
  expect(done.cards[s.refs.leader!]!.exhausted).toBe(false);
  expect(ready(done)).toBe(7);
  expect(unitStats(done, done.cards[s.refs.leader!]!).power).toBe(4);
  expect(
    done.ground
      .filter(id => id !== s.refs.leader)
      .map(id => unitStats(done, done.cards[id]!).power),
  ).toEqual([3, 3, 3]);
  p.players[0].ground!.pop();
  const short = step(scenario(p).state, i => i.kind === 'use-ability' && i.abilityId === 'deploy');
  expect(short.cards[short.players.alice!.leader]!.deployedAs).toBeNull();
  expect(short.cards[short.players.alice!.leader]!.abilityUses.deploy).toBe(1);
});

for (const deployed of [false, true]) {
  test(`Bo-Katan ${deployed ? 'unit' : 'front'} creates a Shielded Mandalorian only with units in both arenas`, () => {
    const p = fixture('bo-katan-kryze--reclaiming-mandalore', deployed);
    p.players[0].ground = [{ card: ids.consular }];
    p.players[0].space = [{ card: ids.fighter }];
    const s = scenario(p),
      done = deployed ? attack(s.state) : use(s.state);
    const token = done.ground.map(id => done.cards[id]!).find(c => c.cardId === 'mandalorian')!;
    expect(token.exhausted).toBe(true);
    expect(tokens(done, token.instanceId)).toEqual(['shield']);
    expect(ready(done)).toBe(deployed ? 12 : 10);
    p.players[0].space = [];
    const without = scenario(p),
      nothing = deployed ? attack(without.state) : use(without.state);
    expect(nothing.ground.some(id => nothing.cards[id]!.cardId === 'mandalorian')).toBe(false);
  });
}

for (const deployed of [false, true]) {
  test(`Palpatine ${deployed ? 'unit' : 'front'} gives one Advantage for every other friendly unit`, () => {
    const p = fixture('emperor-palpatine--according-to-my-design', deployed);
    p.players[0].ground = [
      { card: ids.consular, ref: 'one', exhausted: true },
      { card: ids.consular, ref: 'two', exhausted: true },
    ];
    p.players[0].space = [{ card: ids.fighter }];
    p.players[1].ground = [{ card: ids.marine }];
    const s = scenario(p),
      choice = deployed ? attack(s.state) : use(s.state);
    expect(
      choice.execution.decision!.options.some(
        o => o.intent.kind === 'target' && o.intent.card === s.refs.leader,
      ),
    ).toBe(false);
    const done = target(choice, s.refs.two!);
    expect(tokens(done, s.refs.two!)).toEqual(Array(deployed ? 3 : 2).fill('advantage'));
    expect(tokens(done, s.refs.one!)).toEqual([]);
  });
}

test('Grand Inquisitor readies his exact Grit target even when damage increases its power above three', () => {
  const p = fixture('grand-inquisitor--hunting-the-jedi');
  p.players[0].ground = [{ card: 'cobb-vanth--let-me-handle-this', ref: 'grit', exhausted: true }];
  const s = scenario(p),
    done = target(use(s.state), s.refs.grit!);
  expect(unitStats(done, done.cards[s.refs.grit!]!).power).toBe(4);
  expect(done.cards[s.refs.grit!]!.exhausted).toBe(false);
});

test('IG-88 front grants no bonus at equal unit counts', () => {
  const p = fixture('ig-88--ruthless-bounty-hunter');
  p.players[0].ground = [{ card: ids.marine, ref: 'attacker' }];
  p.players[1].space = [{ card: ids.fighter }];
  const s = scenario(p),
    done = attack(target(use(s.state), s.refs.attacker!), s.refs.attacker!);
  expect(done.cards[done.players.bob!.base]!.damage).toBe(3);
});

test('Han returns exhausted after defeat and keeps his spent Epic while restoring the front action', () => {
  const p = fixture('han-solo--worth-the-risk', true);
  p.players[0].leader.damage = 5;
  p.players[0].leader.abilityUses = { deploy: 1 };
  p.players[0].hand = [{ card: ids.marine }];
  p.activePlayer = 'bob';
  p.players[1].resources = resources();
  p.players[1].hand = [{ card: 'open-fire' }];
  const s = scenario(p),
    choice = step(s.state, 'play');
  resume(
    choice,
    choose(choice, i => i.kind === 'target' && i.card === s.refs.leader),
  );
  const done = target(choice, s.refs.leader!);
  expect(done.cards[s.refs.leader!]!.zone).toBe('base');
  expect(done.cards[s.refs.leader!]!.exhausted).toBe(true);
  expect(done.cards[s.refs.leader!]!.abilityUses.deploy).toBe(1);
  expect(done.execution.decision!.options.some(o => o.intent.kind === 'use-ability')).toBe(false);
});

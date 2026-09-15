import { expect, test } from 'bun:test';
import { advance } from '../engine/advance.ts';
import { attachedUpgrades, unitStats } from '../engine/attachments.ts';
import { decodeState, encodeState } from '../engine/checkpoint.ts';
import { playCost } from '../engine/state.ts';
import { effectiveAbilities } from '../engine/effective-abilities.ts';
import { forceToken } from '../engine/force.ts';
import { conditionMatches } from '../engine/conditions.ts';
import { modifyUnit } from '../engine/lasting.ts';
import type { GameState, Intent, EngineInput } from '../engine/model.ts';
import { Projector } from '../projection/projector.ts';
import { scenario } from './scenario.ts';
import { choose, ids, position } from './helpers.ts';
const resources = (n = 12) => Array.from({ length: n }, () => ({ card: ids.marine }));
const step = (
  s: GameState,
  i: Intent['kind'] | ((i: Intent) => boolean),
  selected: string[] = [],
) => advance(s, choose(s, i, selected)).state;
const target = (s: GameState, id: string) => step(s, i => i.kind === 'target' && i.card === id);
const use = (s: GameState) =>
  step(s, i => i.kind === 'use-ability' && i.abilityId === 'leader-action');
const baseAttack = (s: GameState, attacker = s.players.alice!.leader) =>
  step(
    s,
    i => i.kind === 'attack' && i.attacker === attacker && i.defender === s.players.bob!.base,
  );
const ready = (s: GameState) =>
  s.players.alice!.resources.filter(id => !s.cards[id]!.exhausted).length;
const units = (s: GameState, id: string) =>
  Object.values(s.cards).filter(c => c.cardId === id && c.zone === 'ground' && !c.attachedTo);
function board(leader: string, deployed = false) {
  const p = position();
  p.players[0].leader = { card: leader, deployedAs: deployed ? 'unit' : null };
  p.players[0].resources = resources();
  p.players[0].base.damage = 5;
  return p;
}
function resume(s: GameState, input: EngineInput) {
  expect(decodeState(encodeState(s))).toEqual(s);
  const child = Bun.spawnSync(
    [process.execPath, new URL('./fixtures/resume.ts', import.meta.url).pathname],
    {
      stdin: new TextEncoder().encode(JSON.stringify({ state: encodeState(s), input })),
      stdout: 'pipe',
      stderr: 'pipe',
    },
  );
  expect(child.stderr.toString()).toBe('');
  expect(child.exitCode).toBe(0);
  expect(JSON.parse(child.stdout.toString())).toEqual(advance(s, input));
}
function searchDone(s: GameState, id: string) {
  s = step(s, 'search', [id]);
  const r = s.execution.random!;
  return advance(s, {
    type: 'random',
    gameId: s.gameId,
    expectedRevision: s.revision,
    requestId: r.id,
    values: r.bounds.map(() => 0),
  }).state;
}
function pending(s: GameState) {
  while (s.execution.decision?.kind === 'trigger') s = step(s, 'trigger');
  return s;
}

for (const deployed of [false, true])
  test(`Finn ${deployed ? 'unit' : 'front'} trades a friendly upgrade for a Shield on its exact host`, () => {
    const p = board('finn--this-is-a-rescue', deployed);
    p.players[1].ground = [
      { card: ids.consular, ref: 'enemy' },
      { card: ids.consular, ref: 'other' },
    ];
    p.attachments = [
      { card: 'academy-training', unit: 'enemy', owner: 'alice', ref: 'mine' },
      { card: 'experience', unit: 'other', owner: 'bob', ref: 'theirs' },
    ];
    const g = scenario(p);
    let s = deployed
      ? step(baseAttack(g.state), i => i.kind === 'choose-mode' && i.mode === 'use-ability')
      : use(g.state);
    expect(s.execution.decision!.selection!.cards).toEqual([g.refs.mine!]);
    resume(s, choose(s, 'accept-effect', [g.refs.mine!]));
    s = step(s, 'accept-effect', [g.refs.mine!]);
    expect(s.cards[g.refs.mine!]!.zone).toBe('discard');
    expect(attachedUpgrades(s, s.cards[g.refs.enemy!]!).map(c => c.cardId)).toEqual(['shield']);
    expect(attachedUpgrades(s, s.cards[g.refs.other!]!).map(c => c.cardId)).toEqual(['experience']);
  });
test('Palpatine Galactic Ruler pays a chosen friendly sacrifice, then deals damage and draws independently', () => {
  const p = board('emperor-palpatine--galactic-ruler');
  p.players[0].ground = [{ card: ids.marine, ref: 'sacrifice' }];
  p.players[1].ground = [{ card: ids.consular, ref: 'target' }];
  const g = scenario(p);
  let s = step(
    g.state,
    i =>
      i.kind === 'use-ability' &&
      i.abilityId === 'leader-action' &&
      i.costTarget === g.refs.sacrifice,
  );
  expect(s.cards[g.refs.sacrifice!]!.zone).toBe('discard');
  expect(ready(s)).toBe(11);
  s = target(s, g.refs.target!);
  expect(s.cards[g.refs.target!]!.damage).toBe(1);
  expect(s.players.alice!.hand).toHaveLength(1);
});
test('Palpatine deployment takes a damaged nonleader from either player, retaining ownership', () => {
  const p = board('emperor-palpatine--galactic-ruler');
  p.players[0].ground = [{ card: ids.consular, damage: 1, ref: 'own' }];
  p.players[1].ground = [
    { card: ids.consular, damage: 1, ref: 'enemy' },
    { card: ids.consular, ref: 'healthy' },
  ];
  const g = scenario(p),
    s = step(g.state, i => i.kind === 'use-ability' && i.abilityId === 'deploy');
  expect(s.execution.decision!.options.map(o => o.intent)).toEqual([
    { kind: 'target', card: g.refs.own! },
    { kind: 'target', card: g.refs.enemy! },
  ]);
  resume(
    s,
    choose(s, i => i.kind === 'target' && i.card === g.refs.enemy),
  );
  const done = target(s, g.refs.enemy!);
  expect(done.cards[g.refs.enemy!]!.controller).toBe('alice');
  expect(done.cards[g.refs.enemy!]!.owner).toBe('bob');
});
test('Palpatine unit may decline its sacrifice and cannot sacrifice itself for the attack ability', () => {
  const p = board('emperor-palpatine--galactic-ruler', true);
  p.players[0].ground = [{ card: ids.marine, ref: 'sacrifice' }];
  p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
  const g = scenario(p),
    s = baseAttack(g.state);
  expect(
    s.execution.decision!.options.some(
      o => o.intent.kind === 'target' && o.intent.card === s.players.alice!.leader,
    ),
  ).toBe(false);
  expect(step(s, 'decline-effect').players.alice!.hand).toHaveLength(0);
  const done = target(target(s, g.refs.sacrifice!), g.refs.enemy!);
  expect(done.players.alice!.hand).toHaveLength(1);
  expect(done.cards[g.refs.sacrifice!]!.zone).toBe('discard');
  expect(done.cards[g.refs.enemy!]!.damage).toBe(1);
});
test('Lando Buying Time counts the newly played unit toward both arenas and shields before its When Played ability', () => {
  const p = board('lando-calrissian--buying-time');
  p.players[0].space = [{ card: ids.fighter }];
  p.players[0].hand = [{ card: 'itinerant-warrior', ref: 'played' }];
  const g = scenario(p);
  let s = step(use(g.state), 'play');
  expect(
    s.execution.decision!.options.some(
      o => o.intent.kind === 'target' && o.intent.card === g.refs.played,
    ),
  ).toBe(true);
  s = target(s, g.refs.played!);
  s = pending(s);
  if (s.execution.decision?.options.some(o => o.intent.kind === 'decline-effect'))
    s = step(s, 'decline-effect');
  s = pending(s);
  expect(
    attachedUpgrades(s, s.cards[g.refs.played!]!).filter(c => c.cardId === 'shield'),
  ).toHaveLength(2);
});
for (const leader of [
  'lando-calrissian--buying-time',
  'major-vonreg--red-baron',
  'rio-durant--wisecracking-wheelman',
  'wedge-antilles--leader-of-red-squadron',
])
  test(`${leader} has separate unit and Pilot profiles and one shared Epic use`, () => {
    const p = board(leader);
    p.players[0].space = [{ card: ids.fighter, exhausted: true, ref: 'host' }];
    p.players[0].ground = [{ card: ids.consular, ref: 'ground' }];
    const g = scenario(p),
      s = step(g.state, i => i.kind === 'use-ability' && i.abilityId === 'deploy');
    expect(
      s.execution.decision!.options.some(
        o => o.intent.kind === 'choose-mode' && o.intent.mode === 'deploy-unit',
      ),
    ).toBe(true);
    resume(
      s,
      choose(s, i => i.kind === 'target' && i.card === g.refs.host),
    );
    let done = target(s, g.refs.host!);
    if (leader.startsWith('lando')) {
      expect(
        done.execution.decision!.options.filter(o => o.intent.kind === 'target').map(o => o.intent),
      ).toEqual([{ kind: 'target', card: g.refs.ground! }]);
      done = target(done, g.refs.ground!);
      expect(attachedUpgrades(done, done.cards[g.refs.ground!]!).map(c => c.cardId)).toEqual([
        'shield',
      ]);
    }
    expect(done.cards[done.players.alice!.leader]!.deployedAs).toBe('upgrade');
    expect(done.cards[g.refs.host!]!.exhausted).toBe(true);
    expect(done.cards[done.players.alice!.leader]!.abilityUses.deploy).toBe(1);
    expect(ready(done)).toBe(12);
    const unit = step(s, i => i.kind === 'choose-mode' && i.mode === 'deploy-unit');
    expect(unit.cards[unit.players.alice!.leader]!.deployedAs).toBe('unit');
    expect(unit.cards[unit.players.alice!.leader]!.exhausted).toBe(false);
    expect(effectiveAbilities(unit, unit.cards[unit.players.alice!.leader]!).triggers).toEqual([]);
  });
test('Major Vonreg front cannot buff the just-played Vehicle and may buff an enemy copy instead', () => {
  const p = board('major-vonreg--red-baron');
  p.players[0].hand = [{ card: ids.fighter, ref: 'played' }];
  p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
  const g = scenario(p);
  let s = step(use(g.state), 'play');
  expect(s.execution.decision!.options.map(o => o.intent)).toEqual([
    { kind: 'target', card: g.refs.enemy! },
  ]);
  s = target(s, g.refs.enemy!);
  expect(unitStats(s, s.cards[g.refs.enemy!]!).power).toBe(4);
  expect(ready(s)).toBe(11);
});
test('Major Vonreg Pilot grants its attack effect to the host, restricted to another unit in that arena', () => {
  const p = board('major-vonreg--red-baron');
  p.players[0].space = [{ card: ids.fighter, ref: 'host' }];
  p.players[0].leader.deployedAs = 'upgrade';
  p.players[0].leader.attachedTo = 'host';
  p.players[1].space = [{ card: ids.fighter, ref: 'enemy' }];
  p.players[1].ground = [{ card: ids.consular, ref: 'ground' }];
  const g = scenario(p),
    s = baseAttack(g.state, g.refs.host!);
  expect(
    s.execution.decision!.options.filter(o => o.intent.kind === 'target').map(o => o.intent),
  ).toEqual([{ kind: 'target', card: g.refs.enemy! }]);
  expect(unitStats(target(s, g.refs.enemy!), s.cards[g.refs.enemy!]!).power).toBe(3);
});
test('Rio grants Saboteur to a space attack before Sentinel legality and Shield defeat', () => {
  const p = board('rio-durant--wisecracking-wheelman');
  p.players[0].space = [{ card: ids.fighter, ref: 'attacker' }];
  p.players[0].ground = [{ card: ids.marine, ref: 'ground' }];
  p.players[1].space = [{ card: ids.fighter, ref: 'enemy' }];
  p.attachments = [{ card: 'shield', unit: 'enemy', ref: 'shield' }];
  const g = scenario(p);
  const first = use(g.state);
  expect(first.execution.decision!.options.map(o => o.intent)).toEqual([
    { kind: 'target', card: g.refs.attacker! },
  ]);
  const s = step(
    target(first, g.refs.attacker!),
    i => i.kind === 'attack' && i.defender === g.refs.enemy,
  );
  expect(s.cards[g.refs.shield!]!.zone).toBe('set-aside');
  expect(s.cards[g.refs.enemy!]!.zone).toBe('discard');
  expect(s.cards[g.refs.attacker!]!.zone).toBe('discard');
  expect(ready(s)).toBe(11);
});
test('Rio Pilot adds a Transport-only power bonus without requiring that its host remain friendly', () => {
  const p = board('rio-durant--wisecracking-wheelman');
  p.players[0].space = [{ card: 'millennium-falcon--get-out-and-push', ref: 'host' }];
  p.players[0].leader.deployedAs = 'upgrade';
  p.players[0].leader.attachedTo = 'host';
  const g = scenario(p);
  const host = g.state.cards[g.refs.host!]!;
  expect(unitStats(g.state, host).power).toBe(8);
  host.controller = 'bob';
  expect(unitStats(g.state, host).power).toBe(8);
  expect(effectiveAbilities(g.state, host).keywords).toContain('Saboteur');
});
test('Wedge front only offers Piloting and discounts its alternate cost', () => {
  const p = board('wedge-antilles--leader-of-red-squadron');
  p.players[0].hand = [
    { card: 'clone-pilot', ref: 'pilot' },
    { card: 'academy-training', ref: 'upgrade' },
  ];
  p.players[0].space = [{ card: ids.fighter, ref: 'host' }];
  const g = scenario(p),
    s = use(g.state);
  expect(
    s.execution.decision!.options.filter(o => o.intent.kind === 'play').map(o => o.intent),
  ).toEqual([{ kind: 'play', card: g.refs.pilot!, target: g.refs.host!, piloting: 'piloting' }]);
  resume(s, choose(s, 'play'));
  const done = step(s, 'play');
  expect(ready(done)).toBe(11);
});
for (const piloting of [false, true])
  test(`Wedge Pilot's next Pilot discount applies to ${piloting ? 'Piloting' : 'unit play'} and is consumed once`, () => {
    const p = board('wedge-antilles--leader-of-red-squadron');
    p.players[0].space = [
      { card: ids.fighter, ref: 'host' },
      { card: ids.fighter, ref: 'other' },
    ];
    p.players[0].leader.deployedAs = 'upgrade';
    p.players[0].leader.attachedTo = 'host';
    p.players[0].hand = [{ card: 'clone-pilot', ref: 'pilot' }];
    const g = scenario(p);
    let s = step(baseAttack(g.state, g.refs.host!), 'pass');
    expect(s.playModifiers).toHaveLength(1);
    s = step(s, i => i.kind === 'play' && !!i.piloting === piloting);
    expect(ready(s)).toBe(11);
    expect(s.playModifiers).toHaveLength(0);
  });
for (const cards of [0, 2])
  test(`Rey Nobody can discard a hand of ${cards} cards and draw two, or decline`, () => {
    const p = board('rey--nobody');
    p.players[0].hand = resources(cards);
    const g = scenario(p),
      s = step(g.state, i => i.kind === 'use-ability' && i.abilityId === 'deploy');
    expect(
      step(s, i => i.kind === 'choose-mode' && i.mode === 'decline-ability').players.alice!.hand,
    ).toHaveLength(cards);
    let done = step(s, i => i.kind === 'choose-mode' && i.mode === 'use-ability');
    if (done.execution.decision?.kind === 'effect' && done.execution.decision.selection)
      done = step(done, 'accept-effect', done.players.alice!.hand);
    expect(done.players.alice!.hand).toHaveLength(2);
    expect(done.players.alice!.discard).toHaveLength(cards);
  });
test('Rey Nobody front recognizes a Force Pilot played as an upgrade', () => {
  const p = board('rey--nobody');
  p.players[0].hand = [{ card: 'darth-vader--scourge-of-squadrons', ref: 'pilot' }];
  p.players[0].space = [{ card: ids.fighter, ref: 'host' }];
  p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
  const g = scenario(p);
  let s = step(
    step(g.state, i => i.kind === 'play' && !!i.piloting),
    'pass',
  );
  s = target(use(s), g.refs.enemy!);
  expect(s.cards[g.refs.enemy!]!.damage).toBe(1);
});
for (const amount of [0, 1, 2])
  test(`Satine chooses ${amount} healing and damages her base only for actual healing`, () => {
    const p = board('satine-kryze--standing-on-principles');
    p.players[1].ground = [{ card: ids.consular, damage: 1, ref: 'enemy' }];
    const g = scenario(p),
      s = target(use(g.state), g.refs.enemy!);
    const input = choose(s, i => i.kind === 'choose-mode' && i.mode === `heal-${amount}-damage`);
    resume(s, input);
    const done = advance(s, input).state;
    expect(done.cards[g.refs.enemy!]!.damage).toBe(amount ? 0 : 1);
    expect(done.cards[done.players.alice!.base]!.damage).toBe(amount ? 6 : 5);
  });
test('Satine unit heals four with Restore while her front action is absent', () => {
  const s = scenario(board('satine-kryze--standing-on-principles', true)).state;
  expect(
    s.execution.decision!.options.some(
      o => o.intent.kind === 'use-ability' && o.intent.abilityId === 'leader-action',
    ),
  ).toBe(false);
  expect(baseAttack(s).cards[s.players.alice!.base]!.damage).toBe(1);
});

for (const deployed of [false, true])
  test(`Anakin Tempted ${deployed ? 'unit' : 'front'} pays the Force and waives a Villainy Pilot's aspect penalties without allowing its unit role`, () => {
    const p = board('anakin-skywalker--tempted-by-the-dark-side', deployed);
    p.players[0].force = true;
    p.players[0].hand = [
      { card: 'darth-vader--scourge-of-squadrons', ref: 'pilot' },
      { card: ids.marine, ref: 'hero' },
      { card: 'open-fire', ref: 'neutral' },
    ];
    p.players[0].space = [{ card: ids.fighter, ref: 'host' }];
    const g = scenario(p),
      s = use(g.state);
    expect(forceToken(s, 'alice')).toBeUndefined();
    expect(
      s.execution.decision!.options.filter(o => o.intent.kind === 'play').map(o => o.intent),
    ).toEqual([{ kind: 'play', card: g.refs.pilot!, target: g.refs.host!, piloting: 'piloting' }]);
    resume(s, choose(s, 'play'));
    const done = step(s, 'play');
    expect(ready(done)).toBe(9);
    expect(done.cards[done.players.alice!.leader]!.exhausted).toBe(!deployed);
    expect(done.cards[g.refs.pilot!]!.attachedTo!.instanceId).toBe(g.refs.host!);
  });
test('Anakin Tempted has no action without a Force token and his non-unit play can fail after paying it', () => {
  const p = board('anakin-skywalker--tempted-by-the-dark-side');
  let s = scenario(p).state;
  expect(
    s.execution.decision!.options.some(
      o => o.intent.kind === 'use-ability' && o.intent.abilityId === 'leader-action',
    ),
  ).toBe(false);
  p.players[0].force = true;
  s = use(scenario(p).state);
  expect(s.execution.decision!.kind).toBe('action');
  expect(forceToken(s, 'alice')).toBeUndefined();
  expect(s.cards[s.players.alice!.leader]!.exhausted).toBe(true);
});
for (const deployed of [false, true])
  test(`Kallus ${deployed ? 'unit' : 'front'} waives only the nested play's penalty and heals for Heroism cards only on the unit side`, () => {
    const p = board('agent-kallus--reconsider-your-allegiance', deployed);
    p.players[0].hand = [{ card: ids.consular, ref: 'hero' }];
    const g = scenario(p);
    expect(playCost(g.state, g.state.cards[g.refs.hero!]!)).toBeGreaterThan(4);
    const s = step(use(g.state), 'play');
    expect(ready(s)).toBe(7);
    expect(s.cards[s.players.alice!.leader]!.exhausted).toBe(!deployed);
    expect(s.cards[s.players.alice!.base]!.damage).toBe(deployed ? 3 : 5);
  });
test('Kallus unit observes Heroism events as well as units, preserving the event controller after moving to discard', () => {
  const p = board('agent-kallus--reconsider-your-allegiance', true);
  p.players[0].hand = [{ card: 'jam-communications' }];
  p.players[0].ground = [{ card: ids.marine, ref: 'unit' }];
  const g = scenario(p);
  let s = step(g.state, 'play');
  if (s.execution.decision?.selection) s = step(s, 'accept-effect', []);
  if (s.execution.decision?.options.some(o => o.intent.kind === 'decline-effect'))
    s = step(s, 'decline-effect');
  s = pending(s);
  expect(s.cards[s.players.alice!.base]!.damage).toBe(3);
});
test('A next-play Hidden grant is consumed by the next unit, survives a checkpoint, and does not apply to the next round', () => {
  const p = board('third-sister--seething-with-ambition', true);
  p.players[0].hand = [
    { card: ids.marine, ref: 'first' },
    { card: ids.marine, ref: 'second' },
  ];
  p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
  const g = scenario(p);
  let s = step(baseAttack(g.state), 'pass');
  expect(s.playModifiers).toHaveLength(1);
  resume(
    s,
    choose(s, i => i.kind === 'play' && i.card === g.refs.first),
  );
  s = step(s, i => i.kind === 'play' && i.card === g.refs.first);
  expect(effectiveAbilities(s, s.cards[g.refs.first!]!).keywords).toContain('Hidden');
  expect(
    s.execution.decision!.options.some(
      o => o.intent.kind === 'attack' && o.intent.defender === g.refs.first,
    ),
  ).toBe(false);
  s = step(s, 'pass');
  s = step(s, 'play');
  expect(effectiveAbilities(s, s.cards[g.refs.second!]!).keywords).not.toContain('Hidden');
  s = step(step(s, 'pass'), 'pass');
  while (s.phase !== 'action') {
    s = step(s, 'resource');
  }
  expect(effectiveAbilities(s, s.cards[g.refs.first!]!).keywords).not.toContain('Hidden');
});
test('Third Sister front grants Hidden before the unit enters its first attack window', () => {
  const p = board('third-sister--seething-with-ambition');
  p.players[0].hand = [{ card: ids.marine, ref: 'played' }];
  p.players[1].ground = [{ card: ids.consular }];
  const g = scenario(p),
    s = step(use(g.state), 'play');
  expect(effectiveAbilities(s, s.cards[g.refs.played!]!).keywords).toContain('Hidden');
  expect(
    s.execution.decision!.options.some(
      o => o.intent.kind === 'attack' && o.intent.defender === g.refs.played,
    ),
  ).toBe(false);
});
test('Asajj Ambitious front attacks only with token units and gives its attack one power', () => {
  const p = board('asajj-ventress--ambitious-apprentice');
  p.players[0].ground = [
    { card: 'clone-trooper', ref: 'token' },
    { card: ids.marine, ref: 'normal' },
  ];
  const g = scenario(p),
    s = use(g.state);
  expect(s.execution.decision!.options.map(o => o.intent)).toEqual([
    { kind: 'target', card: g.refs.token! },
  ]);
  const done = baseAttack(target(s, g.refs.token!), g.refs.token!);
  expect(done.cards[done.players.bob!.base]!.damage).toBe(3);
});
for (const mine of [false, true])
  test(`Asajj Ambitious unit counts only friendly token attacks and keeps Hidden (${mine})`, () => {
    const p = board('asajj-ventress--ambitious-apprentice', true);
    p.players[mine ? 0 : 1].ground = [{ card: 'clone-trooper', ref: 'token' }];
    p.attackedThisPhase = ['token'];
    const g = scenario(p);
    expect(unitStats(g.state, g.state.cards[g.state.players.alice!.leader]!).power).toBe(
      mine ? 5 : 3,
    );
    expect(
      effectiveAbilities(g.state, g.state.cards[g.state.players.alice!.leader]!).keywords,
    ).toContain('Hidden');
  });
for (const deployed of [false, true])
  test(`Snoke ${deployed ? 'unit' : 'front'} gives Experience to one of the tied strongest friendly Villainy units`, () => {
    const p = board('supreme-leader-snoke--in-the-seat-of-power', deployed);
    p.players[0].ground = [
      { card: ids.trooper, ref: 'one' },
      { card: ids.trooper, ref: 'two' },
      { card: 'battle-droid', ref: 'weak' },
    ];
    p.players[1].ground = [{ card: 'darth-vader--scourge-of-squadrons', ref: 'enemy' }];
    if (deployed)
      p.attachments = ['one', 'one', 'two', 'two'].map(unit => ({ card: 'experience', unit }));
    const g = scenario(p);
    let s = deployed ? baseAttack(g.state) : use(g.state);
    expect(
      s.execution.decision!.options.filter(o => o.intent.kind === 'target').map(o => o.intent),
    ).toEqual([
      { kind: 'target', card: g.refs.one! },
      { kind: 'target', card: g.refs.two! },
    ]);
    resume(
      s,
      choose(s, i => i.kind === 'target' && i.card === g.refs.two),
    );
    s = target(s, g.refs.two!);
    expect(attachedUpgrades(s, s.cards[g.refs.two!]!).map(c => c.cardId)).toEqual(
      Array(deployed ? 3 : 1).fill('experience'),
    );
  });
test('Savage grants Overwhelm to every tied strongest friendly unit and updates after damage changes Grit power', () => {
  const p = board('savage-opress--you-must-have-your-revenge');
  p.players[0].ground = [
    { card: ids.marine, ref: 'one' },
    { card: ids.marine, ref: 'two' },
    { card: 'cobb-vanth--let-me-handle-this', ref: 'grit' },
  ];
  p.players[1].ground = [{ card: ids.marine, ref: 'enemy' }];
  const g = scenario(p);
  for (const ref of ['one', 'two'])
    expect(effectiveAbilities(g.state, g.state.cards[g.refs[ref]!]!).keywords).toContain(
      'Overwhelm',
    );
  expect(effectiveAbilities(g.state, g.state.cards[g.refs.enemy!]!).keywords).not.toContain(
    'Overwhelm',
  );
  g.state.cards[g.refs.grit!]!.damage = 2;
  expect(effectiveAbilities(g.state, g.state.cards[g.refs.grit!]!).keywords).toContain('Overwhelm');
  expect(effectiveAbilities(g.state, g.state.cards[g.refs.one!]!).keywords).not.toContain(
    'Overwhelm',
  );
});
test('Savage unit grants Overwhelm to all other friendly units and has Raid 3 itself', () => {
  const p = board('savage-opress--you-must-have-your-revenge', true);
  p.players[0].ground = [{ card: 'battle-droid', ref: 'weak' }];
  const g = scenario(p);
  expect(effectiveAbilities(g.state, g.state.cards[g.refs.weak!]!).keywords).toContain('Overwhelm');
  expect(baseAttack(g.state).cards[g.state.players.bob!.base]!.damage).toBe(6);
});
test('Dooku Offering Aid heals both players and makes each of them create their own Droid', () => {
  const p = board('count-dooku--offering-aid');
  p.players[1].base.damage = 3;
  const s = use(scenario(p).state);
  expect(s.cards[s.players.alice!.base]!.damage).toBe(4);
  expect(s.cards[s.players.bob!.base]!.damage).toBe(2);
  const droids = units(s, 'battle-droid');
  expect(droids.map(c => c.controller).sort()).toEqual(['alice', 'bob']);
  expect(droids.every(c => c.owner === c.controller && c.exhausted)).toBe(true);
});
test('Dooku Offering Aid unit creates two friendly Droids and restores two without helping the opponent', () => {
  const p = board('count-dooku--offering-aid', true);
  p.players[1].base.damage = 3;
  const s = pending(baseAttack(scenario(p).state));
  expect(s.cards[s.players.alice!.base]!.damage).toBe(3);
  expect(s.cards[s.players.bob!.base]!.damage).toBe(9);
  expect(units(s, 'battle-droid').map(c => c.controller)).toEqual(['alice', 'alice']);
});

test('Anakin waives the same Pilot penalty when offering, selecting and spending Credits after Force payment', () => {
  const p = board('anakin-skywalker--tempted-by-the-dark-side');
  p.players[0].force = true;
  p.players[0].resources = [];
  p.players[0].credits = ['one', 'two', 'three'];
  p.players[0].hand = [{ card: 'darth-vader--scourge-of-squadrons' }];
  p.players[0].space = [{ card: ids.fighter, ref: 'host' }];
  const g = scenario(p),
    s = step(use(g.state), 'play');
  expect(s.execution.frames[0]!.kind).toBe('credit-payment');
  expect(s.execution.decision!.selection!.min).toBe(3);
  expect(s.execution.decision!.selection!.max).toBe(3);
  const selected = ['one', 'two', 'three'].map(k => g.refs[k]!);
  resume(s, choose(s, 'accept-effect', selected));
  const done = step(s, 'accept-effect', selected);
  expect(selected.every(id => done.cards[id]!.zone === 'set-aside')).toBe(true);
  expect(forceToken(done, 'alice')).toBeUndefined();
  expect(attachedUpgrades(done, done.cards[g.refs.host!]!).map(c => c.cardId)).toEqual([
    'darth-vader--scourge-of-squadrons',
  ]);
});
test('Dooku makes the opposing player create their Droid, so only their Moff can double that creation', () => {
  const p = board('count-dooku--offering-aid');
  p.players[1].ground = [{ card: 'moff-jerjerrod--we-shall-redouble-our-efforts', ref: 'moff' }];
  const g = scenario(p),
    s = use(g.state);
  expect(s.execution.decision!.playerId).toBe('bob');
  resume(
    s,
    choose(s, i => i.kind === 'target' && i.card === g.refs.moff),
  );
  const done = target(s, g.refs.moff!);
  expect(units(done, 'battle-droid').filter(c => c.controller === 'alice')).toHaveLength(1);
  expect(units(done, 'battle-droid').filter(c => c.controller === 'bob')).toHaveLength(2);
  expect(done.cards[g.refs.moff!]!.zone).toBe('discard');
});
test('Finn cannot shield a host that loses its final HP when its upgrade is defeated', () => {
  const p = board('finn--this-is-a-rescue');
  p.players[0].ground = [{ card: ids.marine, damage: 3, ref: 'host' }];
  p.attachments = [{ card: 'academy-training', unit: 'host', ref: 'upgrade' }];
  const g = scenario(p),
    s = step(use(g.state), 'accept-effect', [g.refs.upgrade!]);
  expect(s.cards[g.refs.host!]!.zone).toBe('discard');
  expect(Object.values(s.cards).some(c => c.cardId === 'shield')).toBe(false);
});

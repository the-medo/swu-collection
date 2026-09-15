import { expect, test } from 'bun:test';
import { advance, settle } from '../engine/advance.ts';
import { cardDefinition } from '../cards/registry.ts';
import { attachedUpgrades, unitStats } from '../engine/attachments.ts';
import { effectiveAbilities } from '../engine/effective-abilities.ts';
import { encodeState, decodeState } from '../engine/checkpoint.ts';
import { move } from '../engine/state.ts';
import { Projector } from '../projection/projector.ts';
import type { GameState, Intent } from '../engine/model.ts';
import { choose, ids, position } from './helpers.ts';
import { scenario } from './scenario.ts';
import { secContinuations } from './sec-continuations.ts';
function drain(state: GameState): GameState {
  let s = state;
  for (let n = 0; n < 60; n++) {
    if (s.execution.random) {
      s = advance(s, {
        type: 'random',
        gameId: s.gameId,
        expectedRevision: s.revision,
        requestId: s.execution.random.id,
        values: s.execution.random.bounds.map(() => 0),
      }).state;
      continue;
    }
    const options = s.execution.decision?.options;
    if (s.execution.decision?.kind === 'trigger') {
      s = advance(s, choose(s, 'trigger')).state;
      continue;
    }
    return s;
  }
  throw Error('Unsettled helper');
}
const step = (
  s: GameState,
  p: Intent['kind'] | ((i: Intent) => boolean),
  selected: string[] = [],
) => drain(advance(s, choose(s, p, selected)).state);
const target = (s: GameState, id: string) => step(s, i => i.kind === 'target' && i.card === id);
const play = (s: GameState, id: string, host?: string) =>
  step(s, i => i.kind === 'play' && i.card === id && (!host || i.target === host));
const attack = (s: GameState, id: string, defender?: string) =>
  step(
    s,
    i =>
      i.kind === 'attack' && i.attacker === id && i.defender === (defender ?? s.players.bob!.base),
  );
const select = (s: GameState, ...ids: string[]) => step(s, 'accept-effect', ids);
const tokens = (s: GameState, id: string) =>
  attachedUpgrades(s, s.cards[id]!).filter(c => c.cardId === 'experience').length;
const spies = (s: GameState, player = 'alice') =>
  s.ground.filter(id => s.cards[id]!.controller === player && s.cards[id]!.cardId === 'spy').length;
function board(card: string, inHand = true) {
  const p = position();
  p.players[0].resources = Array.from({ length: 22 }, () => ({ card: ids.marine }));
  const d = cardDefinition(card);
  if (inHand) p.players[0].hand = [{ card, ref: 'source' }];
  else if (d.kind === 'unit') p.players[0][d.arena] = [{ card, ref: 'source' }];
  else throw Error();
  return p;
}
for (const [card, n] of [
  ['beloved-orator', 1],
  ['trade-federation-delegates', 2],
  ['ambition-s-reward', 1],
] as const)
  test(`${card} creates exactly ${n} exhausted Spy tokens when played`, () => {
    const p = board(card);
    p.players[0].ground = [{ card: ids.consular, ref: 'host' }];
    const { state, refs } = scenario(p);
    const s = play(state, refs.source!, card === 'ambition-s-reward' ? refs.host : undefined);
    expect(spies(s)).toBe(n);
    expect(
      s.ground.filter(id => s.cards[id]!.cardId === 'spy').every(id => s.cards[id]!.exhausted),
    ).toBe(true);
    expect(s.execution.decision?.kind).toBe('action');
  });
test('Death Trooper chooses both sides before simultaneous damage, and can choose itself', () => {
  const p = board('death-trooper');
  p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
  const { state, refs } = scenario(p);
  let s = play(state, refs.source!);
  s = target(s, refs.source!);
  expect(s.cards[refs.source!]!.damage).toBe(0);
  s = target(s, refs.enemy!);
  expect(s.cards[refs.source!]!.damage).toBe(2);
  expect(s.cards[refs.enemy!]!.damage).toBe(2);
});
test('ISB Agent reveals only its selected event, then deals one damage; declining does neither', () => {
  const p = board('isb-agent');
  p.players[0].hand!.push(
    { card: 'reconnaissance', ref: 'event' },
    { card: ids.fighter, ref: 'secret' },
  );
  p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
  const { state, refs } = scenario(p);
  let s = play(state, refs.source!);
  expect(s.execution.decision!.selection!.cards).toEqual([refs.event!]);
  const declined = select(s);
  expect(declined.cards[refs.enemy!]!.damage).toBe(0);
  s = select(s, refs.event!);
  s = target(s, refs.enemy!);
  expect(s.cards[refs.enemy!]!.damage).toBe(1);
  expect(s.cards[refs.event!]!.zone).toBe('hand');
  expect(s.cards[refs.secret!]!.zone).toBe('hand');
});
test('Academy Disciplinarian readies a low-power unit after damage, including through Shield prevention', () => {
  const p = board('academy-disciplinarian');
  p.players[0].ground = [
    { card: 'supreme-council-aide', ref: 'ally', exhausted: true },
    { card: ids.marine, ref: 'high' },
  ];
  p.attachments = [{ card: 'shield', unit: 'ally' }];
  const { state, refs } = scenario(p);
  let s = play(state, refs.source!);
  expect(
    s.execution.decision!.options.some(
      o => o.intent.kind === 'target' && o.intent.card === refs.high,
    ),
  ).toBe(false);
  s = target(s, refs.ally!);
  expect(s.cards[refs.ally!]!.damage).toBe(0);
  expect(s.cards[refs.ally!]!.exhausted).toBe(false);
  expect(attachedUpgrades(s, s.cards[refs.ally!]!)).toHaveLength(0);
});
for (const [card, amount, filter] of [
  ['alexsandr-kallus--with-new-purpose', 2, 3],
  ['strike-force-x-wing', 2, 1],
] as const)
  test(`${card} damages selected eligible units`, () => {
    const p = board(card);
    p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
    const { state, refs } = scenario(p);
    let s = play(state, refs.source!);
    s = filter === 3 ? select(s, refs.enemy!) : target(s, refs.enemy!);
    expect(s.cards[refs.enemy!]!.damage).toBe(amount);
  });
for (const card of ['fn-trooper-corps', 'theed-security'] as const)
  test(`${card} puts Experience on the chosen unit`, () => {
    const p = board(card);
    p.players[0].ground = [{ card: ids.consular, ref: 'ally' }];
    p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
    p.attachments = [{ card: 'shield', unit: 'enemy' }];
    const { state, refs } = scenario(p);
    const s = target(play(state, refs.source!), refs.ally!);
    expect(tokens(s, refs.ally!)).toBe(1);
    expect(tokens(s, refs.source!)).toBe(0);
  });
for (const [card, max] of [
  ['budget-scheming', 3],
  ['mas-amedda--accomplice-to-power', 2],
] as const)
  test(`${card} gives one Experience to each selected Official`, () => {
    const p = board(card);
    p.players[0].ground = [{ card: 'supreme-council-aide', ref: 'ally' }];
    p.players[1].ground = [
      { card: 'supreme-council-aide', ref: 'enemy' },
      { card: ids.marine, ref: 'invalid' },
    ];
    const { state, refs } = scenario(p);
    let s = play(state, refs.source!);
    expect(s.execution.decision!.selection!.cards).not.toContain(refs.invalid!);
    expect(s.execution.decision!.selection!.max).toBeLessThanOrEqual(max);
    s = select(s, refs.ally!, refs.enemy!);
    expect(tokens(s, refs.ally!)).toBe(1);
    expect(tokens(s, refs.enemy!)).toBe(1);
    expect(tokens(s, refs.source!)).toBe(0);
  });
test('Cad Bane targets remaining HP, including a damaged leader', () => {
  const p = board('cad-bane--impressed-now-');
  p.players[1].leader.deployedAs = 'unit';
  p.players[1].leader.damage = 3;
  p.players[1].ground = [{ card: ids.consular, ref: 'healthy' }];
  const { state, refs } = scenario(p);
  let s = play(state, refs.source!);
  expect(
    s.execution.decision!.options.some(
      o => o.intent.kind === 'target' && o.intent.card === refs.healthy,
    ),
  ).toBe(false);
  s = target(s, s.players.bob!.leader);
  expect(s.cards[s.players.bob!.leader]!.zone).toBe('base');
});
test('Catch Unawares reduces only its defender for the granted attack', () => {
  const p = board('catch-unawares');
  p.players[0].ground = [{ card: ids.consular, ref: 'ally' }];
  p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
  const { state, refs } = scenario(p);
  let s = target(play(state, refs.source!), refs.ally!);
  s = attack(s, refs.ally!, refs.enemy!);
  expect(s.cards[refs.ally!]!.damage).toBe(0);
  expect(s.cards[refs.enemy!]!.damage).toBe(3);
  expect(unitStats(s, s.cards[refs.enemy!]!).power).toBe(3);
});
test('Corporate Warmongering boosts its selected unit once and other friendly units separately', () => {
  const p = board('corporate-warmongering');
  p.players[0].ground = [
    { card: ids.consular, ref: 'chosen' },
    { card: ids.marine, ref: 'other' },
  ];
  p.players[1].ground = [{ card: ids.marine, ref: 'enemy' }];
  const { state, refs } = scenario(p);
  const s = target(play(state, refs.source!), refs.chosen!);
  expect(unitStats(s, s.cards[refs.chosen!]!)).toEqual({ power: 6, hp: 10 });
  expect(unitStats(s, s.cards[refs.other!]!)).toEqual({ power: 4, hp: 4 });
  expect(unitStats(s, s.cards[refs.enemy!]!)).toEqual({ power: 3, hp: 3 });
});
test('Covert Operative captures only eligible enemy non-leaders and rescues them on departure', () => {
  const p = board('covert-operative');
  p.players[1].ground = [
    { card: ids.marine, ref: 'enemy' },
    { card: ids.consular, ref: 'expensive' },
  ];
  p.players[1].leader.deployedAs = 'unit';
  const { state, refs } = scenario(p);
  let s = play(state, refs.source!);
  expect(s.execution.decision!.options.map(o => o.intent)).toEqual([
    { kind: 'target', card: refs.enemy! },
  ]);
  s = target(s, refs.enemy!);
  expect(s.cards[refs.enemy!]!.zone).toBe('captured');
  expect(s.cards[refs.enemy!]!.capturedBy?.instanceId).toBe(refs.source!);
  move(s, s.cards[refs.source!]!, 'hand');
  s.execution.decision = null;
  settle(s);
  expect(s.cards[refs.enemy!]!.zone).toBe('ground');
  expect(s.cards[refs.enemy!]!.exhausted).toBe(true);
});
test('Crosshair may damage another friendly unit, with its base damage still resolving after Shield prevention', () => {
  const p = board('crosshair--filled-with-doubt', false);
  p.players[0].ground!.push({ card: ids.consular, ref: 'ally' });
  p.attachments = [{ card: 'shield', unit: 'ally' }];
  const { state, refs } = scenario(p);
  const d = cardDefinition('crosshair--filled-with-doubt');
  if (d.kind !== 'unit') throw Error();
  let s = attack(state, refs.source!);
  s = target(s, refs.ally!);
  expect(s.cards[s.players.bob!.base]!.damage).toBe(d.power + 2);
  expect(s.cards[refs.ally!]!.damage).toBe(0);
});
test('Dhani heals on play and defeat independently', () => {
  const p = board('dhani-pilgrim');
  p.players[0].base.damage = 5;
  p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
  const { state, refs } = scenario(p);
  let s = play(state, refs.source!);
  expect(s.cards[s.players.alice!.base]!.damage).toBe(4);
  s = attack(s, refs.enemy!, refs.source!);
  expect(s.cards[s.players.alice!.base]!.damage).toBe(3);
});
test('Krennic recovers only the exact milled unit and may decline', () => {
  const p = board('director-krennic--i-lose-nothing-but-time', false);
  p.activePlayer = 'bob';
  p.players[0].deck = [{ card: ids.marine, ref: 'top' }];
  p.players[0].discard = [{ card: ids.marine, ref: 'older' }];
  p.players[1].ground = [{ card: ids.trooper, ref: 'enemy' }];
  const { state, refs } = scenario(p);
  let s = attack(state, refs.enemy!, refs.source!);
  expect(s.execution.decision!.selection!.cards).toEqual([refs.top!]);
  s = select(s, refs.top!);
  expect(s.cards[refs.top!]!.zone).toBe('hand');
  expect(s.cards[refs.older!]!.zone).toBe('discard');
});
test('Furtive Handmaiden pays its discard before drawing', () => {
  const p = board('furtive-handmaiden', false);
  p.players[0].hand = [{ card: ids.marine, ref: 'discard' }];
  const { state, refs } = scenario(p);
  let s = attack(state, refs.source!);
  s = step(s, 'accept-effect');
  s = select(s, refs.discard!);
  expect(s.cards[refs.discard!]!.zone).toBe('discard');
  expect(s.players.alice!.hand).toHaveLength(1);
});
test('General Grievous returns before combat and an Overwhelm attacker deals full excess to the base', () => {
  const p = board('general-grievous--scuttling-to-safety', false);
  p.activePlayer = 'bob';
  p.players[1].ground = [{ card: 'republic-war-walker', ref: 'enemy' }];
  const { state, refs } = scenario(p);
  const d = cardDefinition('republic-war-walker');
  if (d.kind !== 'unit') throw Error();
  const s = attack(state, refs.enemy!, refs.source!);
  expect(s.cards[refs.source!]!.zone).toBe('hand');
  expect(s.cards[s.players.alice!.base]!.damage).toBe(d.power);
});
test('Hunter weakens an exhausted defending unit only during combat', () => {
  const p = board('hunter--extraordinary-tracker', false);
  p.players[1].ground = [{ card: ids.consular, ref: 'enemy', exhausted: true }];
  const { state, refs } = scenario(p);
  const s = attack(state, refs.source!, refs.enemy!);
  expect(s.cards[refs.source!]!.damage).toBe(0);
  expect(unitStats(s, s.cards[refs.enemy!]!).power).toBe(3);
});
test('Junior Senator can return an enemy upgrade while Kaydel defeats only non-unique upgrades', () => {
  for (const card of ['junior-senator', 'kaydel-connix--for-our-survival']) {
    const p = board(card);
    p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
    p.attachments = [
      { card: 'sneaking-suspicion', unit: 'enemy', owner: 'bob', ref: 'ordinary' },
      { card: 'fulcrum', unit: 'enemy', owner: 'bob', ref: 'unique' },
    ];
    const { state, refs } = scenario(p);
    let s = play(state, refs.source!);
    if (card === 'junior-senator') {
      s = select(s, refs.ordinary!);
      expect(s.cards[refs.ordinary!]!.zone).toBe('hand');
    } else {
      s = target(s, refs.enemy!);
      expect(s.cards[refs.ordinary!]!.zone).toBe('discard');
    }
    expect(s.cards[refs.unique!]!.attachedTo?.instanceId).toBe(refs.enemy!);
  }
});
test('Kreia draws three then makes separate private top and bottom choices', () => {
  const p = board('kreia-s-whispers');
  p.players[0].deck = [
    { card: ids.marine, ref: 'first' },
    { card: ids.fighter, ref: 'second' },
    { card: ids.trooper, ref: 'third' },
    { card: ids.marine, ref: 'remain' },
  ];
  const { state, refs } = scenario(p);
  let s = play(state, refs.source!);
  expect(s.players.alice!.hand).toHaveLength(3);
  s = select(s, refs.second!);
  expect(s.execution.decision!.selection!.cards).not.toContain(refs.second!);
  expect(decodeState(encodeState(s))).toEqual(s);
  s = select(s, refs.third!);
  expect(s.players.alice!.deck).toEqual([refs.second!, refs.remain!, refs.third!]);
  expect(s.players.alice!.hand).toEqual([refs.first!]);
});
for (const [card, filter] of [
  ['remote-escort-tank', {}],
  ['rebel-propagandist', {}],
  ['emissaries-from-ryloth', {}],
] as const)
  test(`${card} applies a phase modifier to the chosen unit`, () => {
    const p = board(card);
    p.players[0].ground = [{ card: ids.consular, ref: 'ally' }];
    const { state, refs } = scenario(p);
    const s = target(play(state, refs.source!), refs.ally!);
    if (card === 'remote-escort-tank')
      expect(effectiveAbilities(s, s.cards[refs.ally!]!).keywords).toContain('Sentinel');
    else if (card === 'rebel-propagandist') {
      expect(unitStats(s, s.cards[refs.ally!]!).power).toBe(4);
      expect(effectiveAbilities(s, s.cards[refs.ally!]!).keywords).toContain('Saboteur');
    } else expect(unitStats(s, s.cards[refs.ally!]!).power).toBe(0);
  });
test('Major Partagaz grows only when another friendly Official attacks', () => {
  const p = board('major-partagaz--healthcare-provider', false);
  p.players[0].ground!.push(
    { card: 'supreme-council-aide', ref: 'official' },
    { card: ids.marine, ref: 'marine' },
  );
  const { state, refs } = scenario(p);
  const before = unitStats(state, state.cards[refs.source!]!);
  let s = attack(state, refs.official!);
  expect(unitStats(s, s.cards[refs.source!]!)).toEqual({
    power: before.power + 2,
    hp: before.hp + 2,
  });
  s = step(s, 'pass');
  s = attack(s, refs.marine!);
  expect(unitStats(s, s.cards[refs.source!]!)).toEqual({
    power: before.power + 2,
    hp: before.hp + 2,
  });
});
test('Premor counts friendly ground units and excludes itself in space', () => {
  const p = board('premor-personnel-carrier');
  p.players[0].ground = [{ card: ids.marine }];
  p.players[0].space = [{ card: ids.fighter }];
  p.players[1].ground = [{ card: ids.marine }];
  const { state, refs } = scenario(p);
  expect(tokens(play(state, refs.source!), refs.source!)).toBe(1);
});
test('No One Ever Knew exhausts one enemy for each friendly Official, including Spies', () => {
  const p = board('no-one-ever-knew');
  p.players[0].ground = [{ card: 'spy' }, { card: 'supreme-council-aide' }];
  p.players[1].ground = [
    { card: ids.marine, ref: 'a' },
    { card: ids.consular, ref: 'b' },
    { card: ids.trooper, ref: 'c' },
  ];
  const { state, refs } = scenario(p);
  let s = play(state, refs.source!);
  expect(s.execution.decision!.selection!.min).toBe(2);
  expect(() => select(s, refs.a!)).toThrow();
  s = select(s, refs.a!, refs.b!);
  expect(s.cards[refs.a!]!.exhausted).toBe(true);
  expect(s.cards[refs.b!]!.exhausted).toBe(true);
  expect(s.cards[refs.c!]!.exhausted).toBe(false);
});
test('Pursue the Lead gives the selected hand owner their discard choice, then creates a Spy for a cheap card', () => {
  const p = board('pursue-the-lead');
  p.players[1].hand = [{ card: ids.marine, ref: 'discard' }];
  const { state, refs } = scenario(p);
  let s = step(
    play(state, refs.source!),
    i => i.kind === 'choose-mode' && i.mode === 'discard-enemy',
  );
  expect(s.execution.decision!.playerId).toBe('bob');
  s = select(s, refs.discard!);
  expect(spies(s)).toBe(1);
  expect(s.cards[refs.discard!]!.zone).toBe('discard');
});
test('Reconnaissance draws only while both arenas contain a friendly unit', () => {
  for (const both of [false, true]) {
    const p = board('reconnaissance');
    p.players[0].ground = [{ card: ids.marine }];
    if (both) p.players[0].space = [{ card: ids.fighter }];
    const { state, refs } = scenario(p);
    expect(play(state, refs.source!).players.alice!.hand).toHaveLength(both ? 2 : 0);
  }
});
test('Restore Freedom counts Heroism icons in play and discounts its nested unit play', () => {
  const p = board('restore-freedom');
  p.players[0].ground = [{ card: ids.marine }];
  p.players[0].hand!.push({ card: ids.consular, ref: 'unit' });
  const { state, refs } = scenario(p);
  let s = play(state, refs.source!);
  s = play(s, refs.unit!);
  expect(s.cards[refs.unit!]!.resourcesPaid).toBe(5);
});
test('Undercover Operation can target an already ready played unit and still create its Spy', () => {
  const p = board('undercover-operation');
  p.players[0].ground = [
    { card: ids.marine, ref: 'played' },
    { card: ids.marine, ref: 'old' },
  ];
  const g = scenario(p);
  g.state.phaseHistory.played.push({
    playerId: 'alice',
    card: structuredClone(g.state.cards[g.refs.played!]!),
    traits: ['Rebel', 'Trooper'],
  });
  let s = play(g.state, g.refs.source!);
  expect(s.execution.decision!.options.map(o => o.intent)).toEqual([
    { kind: 'target', card: g.refs.played! },
  ]);
  s = target(s, g.refs.played!);
  expect(spies(s)).toBe(1);
});
test('When Has Become Now resources a replacement only after successfully playing a Plot card', () => {
  const p = board('when-has-become-now');
  p.players[0].resources!.push({ card: 'dogmatic-shock-squad', ref: 'plot' });
  const { state, refs } = scenario(p);
  let s = play(state, refs.source!);
  s = play(s, refs.plot!);
  expect(s.cards[refs.plot!]!.zone).toBe('ground');
  expect(s.players.alice!.resources).toHaveLength(23);
  expect(s.players.alice!.deck).toHaveLength(11);
});
test('Ferrix Uprising doubles friendly units in the chosen target’s arena', () => {
  const p = board('ferrix-uprising');
  p.players[0].ground = [{ card: ids.marine }, { card: ids.consular }];
  p.players[0].space = [{ card: ids.fighter }];
  p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
  const { state, refs } = scenario(p);
  expect(target(play(state, refs.source!), refs.enemy!).cards[refs.enemy!]!.damage).toBe(4);
});
test('Heroic ARC only offers its damage when a friendly unit is damaged', () => {
  for (const damaged of [false, true]) {
    const p = board('heroic-arc-170');
    p.players[0].ground = [{ card: ids.consular, damage: damaged ? 1 : 0 }];
    p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
    const { state, refs } = scenario(p);
    let s = play(state, refs.source!);
    if (damaged) s = target(s, refs.enemy!);
    expect(s.cards[refs.enemy!]!.damage).toBe(damaged ? 2 : 0);
  }
});
test('Hutt Cartel Starfighter deals its own entry damage', () => {
  const { state, refs } = scenario(board('hutt-cartel-starfighter'));
  expect(play(state, refs.source!).cards[refs.source!]!.damage).toBe(2);
});
test('Renewed Friendship returns a unit and makes two Spies even if no unit can be returned', () => {
  for (const available of [false, true]) {
    const p = board('renewed-friendship');
    if (available) p.players[0].discard = [{ card: ids.marine, ref: 'return' }];
    const { state, refs } = scenario(p);
    let s = play(state, refs.source!);
    s = available ? select(s, refs.return!) : select(s);
    expect(spies(s)).toBe(2);
    expect(s.players.alice!.hand).toHaveLength(available ? 1 : 0);
  }
});
test('Renowned Dignitaries heals twice the number of friendly Officials including itself', () => {
  const p = board('renowned-dignitaries');
  p.players[0].base.damage = 10;
  p.players[0].ground = [{ card: 'spy' }, { card: ids.marine }];
  p.players[1].ground = [{ card: 'spy' }];
  const { state, refs } = scenario(p);
  expect(play(state, refs.source!).cards[state.players.alice!.base]!.damage).toBe(6);
});
test('Viper Probe Droid inspects a hand only for its controller and resumes without revealing it', () => {
  const p = board('viper-probe-droid');
  p.players[1].hand = [{ card: ids.marine, ref: 'secret' }];
  const { state, refs } = scenario(p);
  const s = play(state, refs.source!);
  const own = new Projector(s.gameId, { role: 'player', playerId: 'alice' }).project(s);
  expect(own.decision!.inspectedCards.map(c => c.face.cardId)).toEqual([ids.marine]);
  const spectator = new Projector(s.gameId, { role: 'spectator' }).project(s);
  expect(spectator.decision).toBeNull();
  expect(JSON.stringify(spectator)).not.toContain(JSON.stringify(refs.secret!));
  const hidden = structuredClone(s);
  hidden.cards[refs.secret!]!.cardId = ids.fighter;
  const projector = () => new Projector(s.gameId, { role: 'spectator' }, 's'.repeat(32));
  expect(projector().project(hidden)).toEqual(projector().project(s));
  expect(select(s).execution.decision!.kind).toBe('action');
});
test('C-3PO exhausts and returns as costs before choosing its +2/+2 recipient', () => {
  const p = board('c-3po--anything-i-might-do-', false);
  p.players[0].ground!.push({ card: ids.consular, ref: 'ally' });
  const { state, refs } = scenario(p);
  let s = step(state, i => i.kind === 'use-ability' && i.card === refs.source);
  s = select(s, refs.source!);
  expect(s.cards[refs.source!]!.zone).toBe('hand');
  s = target(s, refs.ally!);
  expect(unitStats(s, s.cards[refs.ally!]!)).toEqual({ power: 5, hp: 9 });
});
test('Tarkin returns control to the owner after leaving, including departure before his trigger resolves', () => {
  for (const early of [false, true]) {
    const p = board('grand-moff-tarkin--taking-krennic-s-achievement');
    p.players[1].space = [{ card: ids.fighter, ref: 'vehicle' }];
    const { state, refs } = scenario(p);
    let s = play(state, refs.source!);
    if (early) {
      move(s, s.cards[refs.source!]!, 'hand');
      s.execution.decision = null;
      settle(s);
    }
    s = target(s, refs.vehicle!);
    if (!early) {
      expect(s.cards[refs.vehicle!]!.controller).toBe('alice');
      move(s, s.cards[refs.source!]!, 'hand');
      s.execution.decision = null;
      settle(s);
    }
    while (s.execution.decision?.options.some(o => o.intent.kind === 'delayed'))
      s = step(s, 'delayed');
    expect(s.cards[refs.vehicle!]!.controller).toBe('bob');
    expect(s.delayedEffects).toHaveLength(0);
  }
});
test('Miraj grants Overwhelm to each friendly attacker facing a damaged unit, not just to herself', () => {
  const p = board('miraj-scintel--the-weak-deserve-to-kneel', false);
  p.players[0].ground!.push({ card: ids.consular, ref: 'ally' });
  p.players[1].ground = [{ card: ids.marine, ref: 'enemy', damage: 2 }];
  const { state, refs } = scenario(p);
  const s = attack(state, refs.ally!, refs.enemy!);
  expect(s.cards[s.players.bob!.base]!.damage).toBe(2);
});
const discloseCards = (p: ReturnType<typeof position>, aspects: readonly string[]) => {
  const cards = aspects.map((aspect, n) => ({
    card:
      aspect === 'Command'
        ? 'battlefield-marine'
        : aspect === 'Heroism'
          ? 'rebel-pathfinder'
          : aspect === 'Vigilance'
            ? 'lost-jedi'
            : aspect === 'Cunning'
              ? 'surprise-strike'
              : aspect === 'Villainy'
                ? 'death-star-stormtrooper'
                : 'reckless-rebel',
    ref: `icon${n}`,
  }));
  p.players[0].hand ??= [];
  p.players[0].hand.push(...cards);
  return cards.map(c => c.ref);
};
for (const card of [
  'bardottan-ornithopter',
  'unauthorized-investigation',
  'diplomatic-envoy',
  'duchess-s-investigators',
] as const)
  test(`${card} resolves its accepted disclosure and can decline`, () => {
    const p = board(card);
    const aspects =
      card === 'bardottan-ornithopter'
        ? ['Vigilance']
        : card === 'unauthorized-investigation'
          ? ['Aggression']
          : card === 'diplomatic-envoy'
            ? ['Command']
            : ['Cunning'];
    const aliases = discloseCards(p, aspects);
    p.players[1].hand = [{ card: ids.marine, ref: 'discard' }];
    const { state, refs } = scenario(p);
    const prompt = play(state, refs.source!);
    expect(prompt.execution.decision!.selection!.disclose).toBeDefined();
    const declined = step(prompt, 'decline-effect');
    let s = select(prompt, ...aliases.map(a => refs[a]!));
    if (card === 'bardottan-ornithopter')
      expect(s.players.alice!.hand.length).toBe(declined.players.alice!.hand.length + 1);
    if (card === 'unauthorized-investigation') {
      expect(spies(s)).toBe(2);
      expect(spies(declined)).toBe(1);
    }
    if (card === 'duchess-s-investigators') {
      expect(s.cards[refs.discard!]!.zone).toBe('discard');
      expect(declined.cards[refs.discard!]!.zone).toBe('hand');
    }
    if (card === 'diplomatic-envoy') {
      expect(s.playModifiers).toHaveLength(1);
      expect(declined.playModifiers).toHaveLength(0);
    }
  });
for (const [card, aspects] of [
  ['charged-with-espionage', ['Cunning', 'Cunning']],
  ['charged-with-murder', ['Vigilance', 'Vigilance']],
] as const)
  test(`${card} requires both icons before the opponent is affected`, () => {
    const p = board(card),
      aliases = discloseCards(p, aspects);
    p.players[1].hand = [{ card: ids.consular, ref: 'hand' }];
    p.players[1].ground = [{ card: ids.consular, ref: 'unit', damage: 1 }];
    const { state, refs } = scenario(p);
    const prompt = play(state, refs.source!);
    expect(() => select(prompt, refs[aliases[0]!]!)).toThrow();
    let s = select(prompt, ...aliases.map(a => refs[a]!));
    s = card === 'charged-with-espionage' ? select(s, refs.hand!) : target(s, refs.unit!);
    expect(s.cards[card === 'charged-with-espionage' ? refs.hand! : refs.unit!]!.zone).toBe(
      'discard',
    );
  });
for (const [card, aspects] of [
  ['b2emo--that-s-two-lies', ['Heroism', 'Heroism']],
  ['naboo-security-force', ['Command']],
  ['senate-warden', ['Vigilance']],
] as const)
  test(`${card} gives its disclosed benefit to the selected unit`, () => {
    const p = board(card, card === 'naboo-security-force');
    const aliases = discloseCards(p, aspects);
    p.players[0].ground ??= [];
    p.players[0].ground.push({ card: ids.consular, ref: 'ally' });
    p.players[1].ground = [{ card: 'republic-war-walker', ref: 'enemy' }];
    const { state, refs } = scenario(p);
    let s: GameState;
    if (card === 'naboo-security-force') s = play(state, refs.source!);
    else if (card === 'b2emo--that-s-two-lies') s = attack(state, refs.source!);
    else {
      state.activePlayer = 'bob';
      state.execution.decision = null;
      settle(state);
      s = attack(state, refs.enemy!, refs.source!);
    }
    s = select(s, ...aliases.map(a => refs[a]!));
    s = target(s, refs.ally!);
    if (card === 'senate-warden') expect(tokens(s, refs.ally!)).toBe(1);
    else expect(effectiveAbilities(s, s.cards[refs.ally!]!).keywords).toContain('Sentinel');
  });
for (const [card, icons] of [
  ['ahsoka-tano--i-learned-it-from-you', ['Command', 'Heroism']],
  ['chancellor-valorum--civil-servant', ['Command', 'Command', 'Command']],
  ['soulless-one--swift-and-agile', ['Cunning', 'Cunning', 'Villainy']],
  ['vice-admiral-rampart--on-schedule', ['Command', 'Command', 'Villainy']],
] as const)
  test(`${card} follows its attack with the disclosed instruction`, () => {
    const p = board(card, false);
    const aliases = discloseCards(p, icons);
    p.players[0].ground ??= [];
    p.players[0].ground.push({ card: ids.consular, ref: 'ally' });
    p.players[0].resources![0]!.exhausted = true;
    p.players[0].resources![1]!.exhausted = true;
    const { state, refs } = scenario(p);
    const resources = state.players.alice!.resources.length;
    let s = attack(state, refs.source!);
    s = select(s, ...aliases.map(a => refs[a]!));
    if (card === 'ahsoka-tano--i-learned-it-from-you') {
      s = target(s, refs.ally!);
      s = attack(s, refs.ally!);
      expect(s.cards[refs.ally!]!.exhausted).toBe(true);
    }
    if (card === 'chancellor-valorum--civil-servant')
      expect(s.players.alice!.resources).toHaveLength(resources + 1);
    if (card === 'soulless-one--swift-and-agile') {
      s = select(s, ...s.execution.decision!.selection!.cards.slice(0, 2));
      expect(s.players.alice!.resources.every(id => !s.cards[id]!.exhausted)).toBe(true);
    }
    if (card === 'vice-admiral-rampart--on-schedule') {
      s = select(s, refs.ally!);
      expect(tokens(s, refs.ally!)).toBe(1);
    }
  });
test('Saw’s U-wing offers another ready Aggression unit only after surviving its attack', () => {
  const p = board('saw-gerrera-s-u-wing--breaking-the-rules', false);
  p.players[0].ground = [
    { card: 'reckless-rebel', ref: 'ally' },
    { card: ids.marine, ref: 'ineligible' },
  ];
  const { state, refs } = scenario(p);
  let s = attack(state, refs.source!);
  expect(
    s.execution.decision!.options.some(
      o => o.intent.kind === 'target' && o.intent.card === refs.ineligible,
    ),
  ).toBe(false);
  s = target(s, refs.ally!);
  s = attack(s, refs.ally!);
  expect(s.cards[refs.ally!]!.exhausted).toBe(true);
});
test('Synara readies resources for both arenas and Senator Chuchi grants Restore to another Official', () => {
  const p = board('synara-san--harboring-a-secret', false);
  p.players[0].space = [{ card: ids.fighter }];
  p.players[0].resources!.forEach(c => (c.exhausted = true));
  const { state, refs } = scenario(p);
  let s = attack(state, refs.source!);
  expect(s.execution.decision!.selection!.min).toBe(2);
  s = select(s, ...s.execution.decision!.selection!.cards.slice(0, 2));
  expect(s.players.alice!.resources.filter(id => !s.cards[id]!.exhausted)).toHaveLength(2);
  const q = board('senator-chuchi--voice-for-the-voiceless', false);
  q.players[0].ground!.push({ card: 'supreme-council-aide', ref: 'ally' });
  q.players[0].base.damage = 6;
  const g = scenario(q);
  s = target(attack(g.state, g.refs.source!), g.refs.ally!);
  expect(s.cards[s.players.alice!.base]!.damage).toBe(5);
  s = step(s, 'pass');
  s = attack(s, g.refs.ally!);
  expect(s.cards[s.players.alice!.base]!.damage).toBe(3);
});
test('Nute’s optional Sentinel targets another friendly Official and Taylander needs initiative', () => {
  const p = board('nute-gunray--escaping-justice');
  p.players[0].ground = [
    { card: 'supreme-council-aide', ref: 'ally' },
    { card: ids.marine, ref: 'other' },
  ];
  const { state, refs } = scenario(p);
  const s = target(play(state, refs.source!), refs.ally!);
  expect(effectiveAbilities(s, s.cards[refs.ally!]!).keywords).toContain('Sentinel');
  expect(effectiveAbilities(s, s.cards[refs.other!]!).keywords).not.toContain('Sentinel');
  for (const initiative of ['alice', 'bob']) {
    const q = board('taylander-shuttle', false);
    q.initiative.holder = initiative;
    const g = scenario(q);
    expect(spies(attack(g.state, g.refs.source!))).toBe(initiative === 'alice' ? 1 : 0);
  }
});
test('With Thunderous Applause and Relief Request must select a different second unit after Disclose', () => {
  for (const card of ['with-thunderous-applause', 'relief-request']) {
    const p = board(card);
    const aliases = discloseCards(p, [card === 'relief-request' ? 'Vigilance' : 'Command']);
    p.players[0].ground = [
      { card: ids.consular, ref: 'first', damage: 4 },
      { card: ids.consular, ref: 'second', damage: 3 },
    ];
    const { state, refs } = scenario(p);
    let s = target(play(state, refs.source!), refs.first!);
    s = select(s, ...aliases.map(a => refs[a]!));
    expect(
      s.execution.decision!.options.some(
        o => o.intent.kind === 'target' && o.intent.card === refs.first,
      ),
    ).toBe(false);
    s = target(s, refs.second!);
    if (card === 'relief-request') {
      expect(s.cards[refs.first!]!.damage).toBe(1);
      expect(s.cards[refs.second!]!.damage).toBe(0);
    } else {
      expect(unitStats(s, s.cards[refs.first!]!).power).toBe(5);
      expect(unitStats(s, s.cards[refs.second!]!).power).toBe(5);
    }
  }
});
test('Nala Se distributes at most four healing among other units, including enemy units', () => {
  const p = board('nala-se--chief-medical-scientist', false),
    aliases = discloseCards(p, ['Vigilance', 'Vigilance']);
  p.players[0].ground!.push({ card: ids.consular, ref: 'ally', damage: 3 });
  p.players[1].ground = [{ card: ids.consular, ref: 'enemy', damage: 3 }];
  const { state, refs } = scenario(p);
  let s = select(attack(state, refs.source!), ...aliases.map(a => refs[a]!));
  expect(s.execution.decision!.selection!.cards).not.toContain(refs.source!);
  s = select(s, refs.ally!, refs.ally!, refs.ally!, refs.enemy!);
  expect(s.cards[refs.ally!]!.damage).toBe(0);
  expect(s.cards[refs.enemy!]!.damage).toBe(2);
});
test('Clandestine Connections pays its optional cost before choosing either base', () => {
  const p = position();
  p.players[0].ground = [{ card: ids.consular, ref: 'ally' }];
  p.players[0].resources = [{ card: ids.marine }, { card: ids.marine }];
  p.attachments = [{ card: 'clandestine-connections', unit: 'ally', owner: 'bob' }];
  const { state, refs } = scenario(p);
  let s = step(attack(state, refs.ally!), 'accept-effect');
  s = target(s, s.players.alice!.base);
  expect(s.cards[s.players.alice!.base]!.damage).toBe(2);
  expect(s.players.alice!.resources.every(id => s.cards[id]!.exhausted)).toBe(true);
});
function defeatBoard(card: string) {
  const p = board(card, false),
    d = cardDefinition(card);
  if (d.kind !== 'unit') throw Error();
  p.players[0][d.arena]![0]!.damage = d.hp - 1;
  p.activePlayer = 'bob';
  p.players[1][d.arena] = [
    { card: d.arena === 'ground' ? ids.consular : 'mercenary-fleet', ref: 'killer' },
  ];
  return p;
}
for (const card of [
  'imperial-occupier',
  'inspiring-senator',
  'assassin-probe',
  'maarva-andor--we-ve-been-sleeping',
  'lightmaker--i-have-an-idea',
  'unruly-astromech',
  'inner-rim-coalition',
] as const)
  test(`${card} resolves its defeated ability under its last controller`, () => {
    const p = defeatBoard(card);
    p.players[0].ground ??= [];
    p.players[0].ground.push({ card: ids.marine, ref: 'ally', exhausted: true });
    p.players[1].ground ??= [];
    p.players[1].ground.push({ card: ids.consular, ref: 'enemy', exhausted: true });
    const { state, refs } = scenario(p);
    let s = attack(state, refs.killer!, refs.source!);
    if (card === 'imperial-occupier') expect(spies(s)).toBe(1);
    if (card === 'inspiring-senator') expect(s.playModifiers[0]?.discount).toBe(1);
    if (card === 'assassin-probe') expect(s.cards[refs.enemy!]!.damage).toBe(1);
    if (card === 'maarva-andor--we-ve-been-sleeping') expect(tokens(s, refs.ally!)).toBe(1);
    if (card === 'unruly-astromech') {
      s = target(s, refs.enemy!);
      expect(s.cards[refs.enemy!]!.exhausted).toBe(true);
    }
    if (card === 'inner-rim-coalition') {
      s = target(s, refs.ally!);
      expect(s.cards[refs.ally!]!.exhausted).toBe(false);
    }
    if (card === 'lightmaker--i-have-an-idea') {
      s = step(s, i => i.kind === 'choose-mode' && i.mode === 'ground');
      s = select(s, ...s.execution.decision!.selection!.cards);
      expect(s.cards[refs.enemy!]!.exhausted).toBe(true);
    }
    expect(s.cards[refs.source!]!.zone).toBe('discard');
  });
test('Arihnda Pryce sacrifices another friendly unit after her own defeat', () => {
  const p = defeatBoard('arihnda-pryce--on-the-road-to-power');
  p.players[0].ground!.push({ card: ids.marine, ref: 'ally' });
  const { state, refs } = scenario(p);
  const s = target(attack(state, refs.killer!, refs.source!), refs.ally!);
  expect(s.cards[refs.ally!]!.zone).toBe('discard');
  expect(s.cards[s.players.bob!.base]!.damage).toBe(4);
});
test('Chancellor’s Shuttle recognizes the controlled Palpatine leader when defeated', () => {
  const p = defeatBoard('the-chancellor-s-shuttle--grim-harbinger');
  p.players[0].leader = { card: 'chancellor-palpatine--playing-both-sides' };
  p.players[0].ground = [{ card: ids.marine, ref: 'ally' }];
  const { state, refs } = scenario(p);
  const s = target(attack(state, refs.killer!, refs.source!), refs.ally!);
  expect(tokens(s, refs.ally!)).toBe(1);
});
test('ISB Shuttle detects a prior friendly defeat and Political Bully detects another Official', () => {
  const p = board('isb-shuttle');
  p.players[0].discard = [{ card: ids.marine, ref: 'departed' }];
  p.defeatedThisPhase = ['departed'];
  let g = scenario(p);
  expect(spies(play(g.state, g.refs.source!))).toBe(1);
  const q = board('political-bully');
  q.players[0].ground = [{ card: 'spy' }];
  q.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
  g = scenario(q);
  expect(target(play(g.state, g.refs.source!), g.refs.enemy!).cards[g.refs.enemy!]!.damage).toBe(2);
});
test('It’s Not Over Yet rejects units that attacked or entered this phase', () => {
  const p = board('it-s-not-over-yet');
  p.players[0].ground = [
    { card: ids.marine, ref: 'eligible', exhausted: true },
    { card: ids.marine, ref: 'new', exhausted: true },
  ];
  p.enteredThisPhase = ['new'];
  const { state, refs } = scenario(p);
  let s = play(state, refs.source!);
  expect(
    s.execution.decision!.options.some(
      o => o.intent.kind === 'target' && o.intent.card === refs.new,
    ),
  ).toBe(false);
  s = target(s, refs.eligible!);
  expect(s.cards[refs.eligible!]!.exhausted).toBe(false);
  expect(spies(s)).toBe(1);
});
test('Escape Pod captures its friendly non-Vehicle without defeating it', () => {
  const p = board('escape-pod');
  p.players[0].ground = [{ card: ids.marine, ref: 'ally' }];
  const { state, refs } = scenario(p);
  const s = target(play(state, refs.source!), refs.ally!);
  expect(s.cards[refs.ally!]!.zone).toBe('captured');
  expect(s.cards[refs.ally!]!.capturedBy?.instanceId).toBe(refs.source!);
  expect(s.phaseHistory.defeated).toHaveLength(0);
});
test('Regulations Bureaucrat exhausts the selected ordinary resource rather than a Credit', () => {
  const p = board('regulations-bureaucrat', false);
  p.players[1].resources = [{ card: ids.marine, ref: 'resource' }];
  p.players[1].credits = ['credit'];
  const { state, refs } = scenario(p);
  let s = step(state, i => i.kind === 'use-ability' && i.card === refs.source);
  s = step(s, i => i.kind === 'choose-mode' && i.mode === 'enemy');
  expect(s.execution.decision!.playerId).toBe('alice');
  expect(s.execution.decision!.selection!.cards).toEqual([refs.resource!]);
  s = select(s, refs.resource!);
  expect(s.cards[refs.resource!]!.exhausted).toBe(true);
  expect(s.cards[refs.source!]!.exhausted).toBe(true);
});
test('Nemik’s Manifesto gives Rebel directly and counts other Rebels for its defeated damage', () => {
  const p = position();
  p.activePlayer = 'bob';
  p.players[0].ground = [{ card: ids.trooper, ref: 'host', damage: 0 }, { card: ids.marine }];
  p.players[1].ground = [{ card: ids.consular, ref: 'killer' }];
  p.attachments = [{ card: 'nemik-s-manifesto', unit: 'host', owner: 'bob' }];
  const { state, refs } = scenario(p);
  let s = attack(state, refs.killer!, refs.host!);
  s = target(s, s.players.bob!.base);
  expect(s.cards[s.players.bob!.base]!.damage).toBe(1);
});
test('Special Modifications permits a Spy only when attached to a Transport', () => {
  const p = board('special-modifications');
  p.players[0].space = [{ card: 'consular-s-cruiser', ref: 'transport' }];
  const { state, refs } = scenario(p);
  let s = play(state, refs.source!, refs.transport!);
  s = step(s, i => i.kind === 'choose-mode' && i.mode === 'create-spy');
  expect(spies(s)).toBe(1);
});
test('Stolen Starpath Unit counts matching titles in the defending hand', () => {
  const p = position();
  p.players[0].ground = [{ card: ids.consular, ref: 'host' }];
  p.players[1].hand = [{ card: ids.marine }, { card: ids.marine }, { card: ids.fighter }];
  p.attachments = [{ card: 'stolen-starpath-unit', unit: 'host' }];
  const { state, refs } = scenario(p);
  let s = attack(state, refs.host!);
  s = drain(advance(s, { ...choose(s, 'accept-effect'), namedCardId: ids.marine }).state);
  expect(spies(s)).toBe(2);
});
test('Valiant Commando sacrifices after base combat damage and Chopper lets each player choose a discard', () => {
  const p = board('valiant-commando', false);
  let g = scenario(p);
  const d = cardDefinition('valiant-commando');
  if (d.kind !== 'unit') throw Error();
  let s = step(
    attack(g.state, g.refs.source!),
    i => i.kind === 'choose-mode' && i.mode === 'sacrifice',
  );
  expect(s.cards[s.players.bob!.base]!.damage).toBe(d.power + 3);
  expect(s.cards[g.refs.source!]!.zone).toBe('discard');
  const q = board('chopper--war-hero', false);
  q.players[0].hand = [{ card: ids.marine, ref: 'a' }];
  q.players[1].hand = [{ card: ids.fighter, ref: 'b' }];
  g = scenario(q);
  s = select(attack(g.state, g.refs.source!), g.refs.a!);
  expect(s.execution.decision!.playerId).toBe('bob');
  s = select(s, g.refs.b!);
  expect(s.cards[g.refs.a!]!.zone).toBe('discard');
  expect(s.cards[g.refs.b!]!.zone).toBe('discard');
});
test('Convene searches only Official units and creates its Spy after the search', () => {
  const p = board('convene-the-senate');
  p.players[0].deck = [
    { card: 'supreme-council-aide', ref: 'official' },
    { card: ids.marine, ref: 'ineligible' },
  ];
  const { state, refs } = scenario(p);
  let s = play(state, refs.source!);
  expect(s.execution.decision!.selection!.cards).toEqual([refs.official!]);
  expect(spies(s)).toBe(0);
  s = step(s, 'search', [refs.official!]);
  expect(s.players.alice!.hand).toEqual([refs.official!]);
  expect(spies(s)).toBe(1);
});
test('Orn Free Taa counts Law cards in discard and searches for the Law trait', () => {
  const p = board('orn-free-taa--political-power-broker');
  p.players[0].discard = [{ card: 'charged-with-murder' }, { card: ids.marine }];
  p.players[0].deck = [{ card: 'charged-with-espionage', ref: 'law' }, { card: ids.marine }];
  const { state, refs } = scenario(p);
  let s = play(state, refs.source!);
  expect(s.execution.decision!.selection!.cards).toEqual([refs.law!]);
  s = step(s, 'search', [refs.law!]);
  const d = cardDefinition('orn-free-taa--political-power-broker');
  if (d.kind !== 'unit') throw Error();
  expect(unitStats(s, s.cards[refs.source!]!).power).toBe(d.power + 1);
});
test('Chairman Papanoida observes either player drawing once during the action phase', () => {
  const p = board('chairman-papanoida--undaunted-diplomat', false);
  p.players[0].hand = [
    { card: 'reconnaissance', ref: 'event' },
    { card: 'reckless-rebel', ref: 'red' },
    { card: 'reckless-rebel', ref: 'red2' },
  ];
  p.players[0].space = [{ card: ids.fighter }];
  const { state, refs } = scenario(p);
  let s = play(state, refs.event!);
  s = select(s, refs.red!, refs.red2!);
  expect(spies(s)).toBe(1);
  expect(s.execution.decision!.kind).toBe('action');
});
for (const c of secContinuations())
  test(`${c.name}: suspended instruction resumes in a fresh process`, () => {
    const child = Bun.spawnSync(
      [process.execPath, new URL('./fixtures/resume.ts', import.meta.url).pathname],
      {
        stdin: Buffer.from(JSON.stringify({ state: encodeState(c.state), input: c.input })),
        stdout: 'pipe',
        stderr: 'pipe',
      },
    );
    expect(child.exitCode).toBe(0);
    expect(child.stderr.toString()).toBe('');
    expect(JSON.parse(child.stdout.toString())).toEqual(advance(c.state, c.input));
  });

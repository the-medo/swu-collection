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
import { lofContinuations } from './lof-continuations.ts';
import { forceToken } from '../engine/force.ts';
import { modifyUnit } from '../engine/lasting.ts';
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
    if (s.execution.decision?.kind === 'trigger-player') {
      s = advance(s, choose(s, 'trigger-player')).state;
      continue;
    }
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
for (const [card, amount, filter] of [
  ['ravening-gundark', 1, {}],
  ['purge-trooper', 2, { force: true }],
  ['stinger-mantis--where-are-we-going-', 2, { exhausted: true }],
  ['jedi-knight', 2, {}],
  ['hyena-bomber', 2, { ally: true }],
  ['mace-windu--leaping-into-action', 4, { forceCost: true }],
  ['drain-essence', 2, {}],
  ['sorcerous-blast', 3, { forceCost: true }],
] as const)
  test(`${card}: damage uses the selected legal physical unit`, () => {
    const p = board(card);
    p.players[0].force = true;
    p.players[0].ground = [{ card: ids.trooper }];
    p.players[1].ground = [{ card: 'jedi-guardian', ref: 'enemy', exhausted: true }];
    const { state, refs } = scenario(p);
    let s = play(state, refs.source!);
    if ('forceCost' in filter) s = step(s, 'accept-effect');
    s = target(s, refs.enemy!);
    expect(s.cards[refs.enemy!]!.damage).toBe(amount);
    expect(s.execution.decision?.kind).toBe('action');
    if (card === 'drain-essence') expect(forceToken(s, 'alice')).toBeDefined();
    if ('forceCost' in filter) expect(forceToken(s, 'alice')).toBeUndefined();
  });
for (const [card, power, hp] of [
  ['overpower', 3, 3],
  ['force-slow', -8, 0],
  ['whirlwind-of-power', -2, -2],
] as const)
  test(`${card}: its phase modifier changes the chosen copy and expires`, () => {
    const p = board(card);
    p.players[1].ground = [{ card: 'jedi-guardian', ref: 'enemy', exhausted: true }];
    const { state, refs } = scenario(p);
    const s = target(play(state, refs.source!), refs.enemy!);
    expect(unitStats(s, s.cards[refs.enemy!]!)).toEqual({
      power: Math.max(0, 4 + power),
      hp: 8 + hp,
    });
    expect(s.lastingEffects.some(e => e.target.instanceId === refs.enemy)).toBe(true);
  });
test('Whirlwind uses the Force-unit prerequisite at resolution and can defeat through HP loss', () => {
  const p = board('whirlwind-of-power');
  p.players[0].ground = [{ card: 'jedi-sentinel' }];
  p.players[1].ground = [{ card: ids.marine, ref: 'enemy' }];
  const { state, refs } = scenario(p),
    s = target(play(state, refs.source!), refs.enemy!);
  expect(s.cards[refs.enemy!]!.zone).toBe('discard');
});
test('Calm in the Storm rewards actual exhaustion, not an already exhausted unit', () => {
  const p = board('calm-in-the-storm');
  p.players[0].ground = [
    { card: ids.marine, ref: 'ready' },
    { card: ids.marine, ref: 'exhausted', exhausted: true },
  ];
  const { state, refs } = scenario(p),
    s = play(state, refs.source!);
  const yes = target(s, refs.ready!);
  expect(tokens(yes, refs.ready!)).toBe(2);
  expect(attachedUpgrades(yes, yes.cards[refs.ready!]!)).toHaveLength(3);
  expect(yes.cards[refs.ready!]!.exhausted).toBe(true);
  const no = target(s, refs.exhausted!);
  expect(attachedUpgrades(no, no.cards[refs.exhausted!]!)).toHaveLength(0);
});
test('Consumed by the Dark Side grants two Experience before damage; a Shield prevents only damage', () => {
  const p = board('consumed-by-the-dark-side');
  p.players[0].ground = [{ card: ids.marine, ref: 'ally' }];
  p.attachments = [{ card: 'shield', unit: 'ally' }];
  const { state, refs } = scenario(p),
    s = target(play(state, refs.source!), refs.ally!);
  expect(tokens(s, refs.ally!)).toBe(2);
  expect(s.cards[refs.ally!]!.damage).toBe(0);
  expect(attachedUpgrades(s, s.cards[refs.ally!]!)).toHaveLength(2);
});
for (const card of ['cure-wounds', 'do-or-do-not', 'unleash-rage'])
  test(`${card}: unavailable Force does not perform its conditional effect`, () => {
    const p = board(card);
    p.players[0].ground = [{ card: ids.consular, ref: 'ally', damage: 4 }];
    const { state, refs } = scenario(p),
      s = play(state, refs.source!);
    expect(s.cards[refs.ally!]!.damage).toBe(4);
    expect(unitStats(s, s.cards[refs.ally!]!).power).toBe(3);
    expect(s.players.alice!.hand.length).toBe(card === 'do-or-do-not' ? 1 : 0);
  });
test('Cure Wounds heals six after spending Force; Do or Do Not draws two only on payment', () => {
  for (const card of ['cure-wounds', 'do-or-do-not']) {
    const p = board(card);
    p.players[0].force = true;
    p.players[0].ground = [{ card: 'jedi-guardian', ref: 'ally', damage: 7 }];
    const { state, refs } = scenario(p);
    let s = play(state, refs.source!);
    s = step(s, 'accept-effect');
    if (card === 'cure-wounds') s = target(s, refs.ally!);
    expect(forceToken(s, 'alice')).toBeUndefined();
    if (card === 'cure-wounds') expect(s.cards[refs.ally!]!.damage).toBe(1);
    else expect(s.players.alice!.hand).toHaveLength(2);
  }
});
for (const card of ['youngling-padawan', 'directed-by-the-force'])
  test(`${card}: creates the Force token before any optional unit play`, () => {
    const p = board(card);
    p.players[0].hand!.push({ card: ids.marine, ref: 'marine' });
    const { state, refs } = scenario(p);
    let s = play(state, refs.source!);
    expect(forceToken(s, 'alice')).toBeDefined();
    if (card === 'directed-by-the-force') {
      s = play(s, refs.marine!);
      expect(s.cards[refs.marine!]!.zone).toBe('ground');
    }
  });
test('Ataru uses modified power and readies an eligible exhausted Force unit', () => {
  const p = board('ataru-onslaught');
  p.players[0].ground = [
    { card: 'jedi-guardian', ref: 'yes', exhausted: true },
    { card: 'jedi-guardian', ref: 'no', exhausted: true },
  ];
  p.attachments = [{ card: 'experience', unit: 'no' }];
  const { state, refs } = scenario(p),
    s = play(state, refs.source!);
  expect(
    s.execution.decision!.options.some(
      o => o.intent.kind === 'target' && o.intent.card === refs.no,
    ),
  ).toBe(false);
  expect(target(s, refs.yes!).cards[refs.yes!]!.exhausted).toBe(false);
});
for (const [card, force, count, shield] of [
  ['priestesses-of-the-force--eternal', true, 0, 1],
  ['paladin-training-corvette', false, 1, 0],
  ['in-the-shadows', false, 1, 0],
] as const)
  test(`${card}: a selected subset receives tokens once per unit`, () => {
    const p = board(card);
    p.players[0].force = force;
    p.players[0].ground = [
      { card: 'jedi-in-hiding', ref: 'a' },
      { card: 'jedi-in-hiding', ref: 'b' },
    ];
    const { state, refs } = scenario(p);
    let s = play(state, refs.source!);
    if (force) s = step(s, 'accept-effect');
    s = select(s, refs.a!);
    expect(tokens(s, refs.a!)).toBe(count);
    expect(attachedUpgrades(s, s.cards[refs.a!]!).filter(c => c.cardId === 'shield')).toHaveLength(
      shield,
    );
    expect(attachedUpgrades(s, s.cards[refs.b!]!)).toHaveLength(0);
  });
test('Heavy Blaster Cannon deals three separate packets to the same unit and consumes one Shield', () => {
  const p = board('heavy-blaster-cannon');
  p.players[0].ground = [{ card: ids.marine, ref: 'host' }];
  p.players[1].ground = [{ card: 'jedi-guardian', ref: 'enemy' }];
  p.attachments = [{ card: 'shield', unit: 'enemy' }];
  const { state, refs } = scenario(p),
    s = target(play(state, refs.source!, refs.host!), refs.enemy!);
  expect(s.cards[refs.enemy!]!.damage).toBe(2);
  expect(attachedUpgrades(s, s.cards[refs.enemy!]!)).toHaveLength(0);
});
test('It’s Worse defeats an eligible unit through Shields but excludes deployed leaders', () => {
  const p = board('it-s-worse');
  p.players[1].leader = { card: ids.leader, deployedAs: 'unit', ref: 'leader' };
  p.players[1].ground = [{ card: ids.marine, ref: 'enemy' }];
  p.attachments = [{ card: 'shield', unit: 'enemy' }];
  const { state, refs } = scenario(p),
    s = play(state, refs.source!);
  expect(
    s.execution.decision!.options.some(
      o => o.intent.kind === 'target' && o.intent.card === refs.leader,
    ),
  ).toBe(false);
  expect(target(s, refs.enemy!).cards[refs.enemy!]!.zone).toBe('discard');
});
for (const [card, amount, kind] of [
  ['acclamator-assault-ship', 5, 'modify'],
  ['scythe--intimidating-silhouette', 2, 'modify'],
  ['peli-motto--i-should-charge-you-more', 1, 'experience'],
  ['medical-frigate', 2, 'heal'],
] as const)
  test(`${card}: On Attack resolves before combat and affects the selected other unit`, () => {
    const p = board(card, false);
    p.players[0].ground = [
      ...(p.players[0].ground ?? []),
      { card: 'eighth-brother--hunt-together', ref: 'ally', damage: 2 },
    ];
    if (card === 'peli-motto--i-should-charge-you-more')
      p.players[0].ground!.push({ card: 'b2emo--that-s-two-lies', ref: 'droid' });
    const { state, refs } = scenario(p);
    let s = attack(state, refs.source!);
    const chosen = refs[card === 'peli-motto--i-should-charge-you-more' ? 'droid' : 'ally']!;
    s = target(s, chosen);
    if (kind === 'experience') expect(tokens(s, chosen)).toBe(1);
    else if (kind === 'heal') expect(s.cards[chosen]!.damage).toBe(0);
    else
      expect(unitStats(s, s.cards[chosen]!).power).toBe(
        unitStats(state, state.cards[chosen]!).power + amount,
      );
  });
test('Darth Malak readies only with a deployed Sith leader; Vernestra requires Force', () => {
  for (const deployed of [false, true]) {
    const p = board('darth-malak--covetous-apprentice');
    p.players[0].leader = {
      card: 'darth-maul--sith-revealed',
      ...(deployed ? { deployedAs: 'unit' as const } : {}),
    };
    const { state, refs } = scenario(p);
    let s = play(state, refs.source!);
    if (deployed) s = target(s, refs.source!);
    expect(s.cards[refs.source!]!.exhausted).toBe(!deployed);
  }
  const p = board('vernestra-rwoh--precocious-knight');
  p.players[0].force = true;
  const { state, refs } = scenario(p),
    s = step(play(state, refs.source!), 'accept-effect');
  expect(s.cards[refs.source!]!.exhausted).toBe(false);
  expect(forceToken(s, 'alice')).toBeUndefined();
});
test('Darth Sidious defeats every low-HP non-Sith unit, with simultaneous opposing departures', () => {
  const p = board('darth-sidious--the-phantom-menace');
  p.players[0].force = true;
  p.players[0].ground = [
    { card: ids.marine, ref: 'ally' },
    { card: 'sith-assassin', ref: 'sith' },
  ];
  p.players[1].ground = [
    { card: ids.marine, ref: 'enemy' },
    { card: 'jedi-guardian', ref: 'large' },
  ];
  const { state, refs } = scenario(p),
    s = step(play(state, refs.source!), 'accept-effect');
  expect(s.cards[refs.ally!]!.zone).toBe('discard');
  expect(s.cards[refs.enemy!]!.zone).toBe('discard');
  expect(s.cards[refs.sith!]!.zone).toBe('ground');
  expect(s.cards[refs.large!]!.zone).toBe('ground');
});
test('Death Field excludes enemy Vehicles and friendly units, then checks for a Force unit', () => {
  const p = board('death-field');
  p.players[0].ground = [{ card: 'jedi-guardian', ref: 'ally' }];
  p.players[1].ground = [
    { card: 'jedi-guardian', ref: 'enemy' },
    { card: 'trexler-armored-marauder', ref: 'vehicle' },
  ];
  const { state, refs } = scenario(p),
    s = play(state, refs.source!);
  expect(s.cards[refs.enemy!]!.damage).toBe(2);
  expect(s.cards[refs.ally!]!.damage).toBe(0);
  expect(s.cards[refs.vehicle!]!.damage).toBe(0);
  expect(s.players.alice!.hand).toHaveLength(1);
});
test('Always Two protects selected unique Sith, gives four tokens each, and defeats the other friendly units', () => {
  const p = board('always-two');
  p.players[0].ground = [
    { card: 'darth-malak--covetous-apprentice', ref: 'a' },
    { card: 'darth-sidious--the-phantom-menace', ref: 'b' },
    { card: ids.marine, ref: 'other' },
  ];
  p.players[1].ground = [{ card: ids.marine, ref: 'enemy' }];
  const { state, refs } = scenario(p),
    s = select(play(state, refs.source!), refs.a!, refs.b!);
  expect(attachedUpgrades(s, s.cards[refs.a!]!)).toHaveLength(4);
  expect(tokens(s, refs.b!)).toBe(2);
  expect(s.cards[refs.other!]!.zone).toBe('discard');
  expect(s.cards[refs.enemy!]!.zone).toBe('ground');
});
test('Dooku and Go into Hiding protect existing copies, with the v8 Sentinel exception', () => {
  for (const card of ['dooku--it-is-too-late', 'go-into-hiding']) {
    const p = board(card);
    p.players[0].ground = [{ card: 'tuk-ata', ref: 'ally' }];
    p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
    const { state, refs } = scenario(p);
    let s = play(state, refs.source!);
    if (card === 'go-into-hiding') s = target(s, refs.ally!);
    expect(
      s.execution.decision!.options.some(
        o => o.intent.kind === 'attack' && o.intent.defender === refs.ally,
      ),
    ).toBe(false);
    modifyUnit(s, s.cards[refs.ally!]!, s.cards[refs.ally!]!, {
      kind: 'modify',
      power: 0,
      hp: 0,
      duration: 'phase',
      abilities: { keywords: ['Sentinel'] },
    });
    s.execution.decision = null;
    settle(s);
    expect(
      s.execution.decision!.options.some(
        o => o.intent.kind === 'attack' && o.intent.defender === refs.ally,
      ),
    ).toBe(true);
  }
});
test('Cin Drallig plays a Lightsaber on himself for free and only then readies', () => {
  const p = board('cin-drallig--esteemed-blademaster');
  p.players[0].hand!.push({ card: 'heirloom-lightsaber', ref: 'saber' });
  const { state, refs } = scenario(p);
  let s = play(state, refs.source!);
  const paid = s.players.alice!.resources.filter(id => s.cards[id]!.exhausted).length;
  s = play(s, refs.saber!, refs.source!);
  expect(s.cards[refs.source!]!.exhausted).toBe(false);
  expect(s.cards[refs.saber!]!.attachedTo?.instanceId).toBe(refs.source);
  expect(s.players.alice!.resources.filter(id => s.cards[id]!.exhausted).length).toBe(paid);
});
for (const [card, shield, experience, hidden] of [
  ['soresu-stance', 1, 0, false],
  ['three-lessons', 1, 1, true],
  ['the-burden-of-masters', 0, 2, false],
] as const)
  test(`${card}: nested unit play pays the cost and binds follow-through to that new copy`, () => {
    const p = board(card);
    p.players[0].hand!.push({ card: 'jedi-guardian', ref: 'unit' });
    p.players[0].discard = [{ card: 'jedi-sentinel', ref: 'discard' }];
    const { state, refs } = scenario(p);
    let s = play(state, refs.source!);
    if (card === 'the-burden-of-masters') s = select(s, refs.discard!);
    s = play(s, refs.unit!);
    expect(s.cards[refs.unit!]!.zone).toBe('ground');
    expect(tokens(s, refs.unit!)).toBe(experience);
    expect(
      attachedUpgrades(s, s.cards[refs.unit!]!).filter(c => c.cardId === 'shield'),
    ).toHaveLength(shield);
    expect(effectiveAbilities(s, s.cards[refs.unit!]!).keywords?.includes('Hidden') ?? false).toBe(
      hidden,
    );
  });
test('Baylan gives the returned card’s owner a free play decision, preserving the original ownership', () => {
  const p = board('baylan-skoll--enigmatic-master');
  p.players[0].force = true;
  p.players[1].ground = [{ card: ids.marine, ref: 'enemy' }];
  const { state, refs } = scenario(p);
  let s = step(play(state, refs.source!), 'accept-effect');
  s = target(s, refs.enemy!);
  expect(s.execution.decision!.playerId).toBe('bob');
  expect(s.cards[refs.enemy!]!.zone).toBe('hand');
  s = play(s, refs.enemy!);
  expect(s.cards[refs.enemy!]!.controller).toBe('bob');
  expect(s.cards[refs.enemy!]!.zone).toBe('ground');
  expect(s.cards[refs.enemy!]!.incarnation).toBeGreaterThan(state.cards[refs.enemy!]!.incarnation);
});
test('Watto’s opponent chooses the benefit, but the original controller draws or chooses a recipient', () => {
  const p = board('watto--no-money--no-parts--no-deal', false);
  const { state, refs } = scenario(p),
    s = attack(state, refs.source!);
  expect(s.execution.decision!.playerId).toBe('bob');
  const draw = step(s, i => i.kind === 'choose-mode' && i.mode === 'draw-a-card');
  expect(draw.players.alice!.hand).toHaveLength(1);
  expect(draw.players.bob!.hand).toHaveLength(0);
  let token = step(s, i => i.kind === 'choose-mode' && i.mode === 'give-experience');
  expect(token.execution.decision!.playerId).toBe('alice');
  token = target(token, refs.source!);
  expect(tokens(token, refs.source!)).toBe(1);
});
test('Adept and Gunship pay exhaustion before target choice; Adept also consumes Force', () => {
  for (const card of ['adept-of-anger', 'heavy-missile-gunship']) {
    const p = board(card, false);
    p.players[0].force = true;
    p.players[1].ground = [{ card: 'jedi-guardian', ref: 'enemy' }];
    const { state, refs } = scenario(p);
    let s = step(state, i => i.kind === 'use-ability' && i.card === refs.source);
    expect(s.cards[refs.source!]!.exhausted).toBe(true);
    s = target(s, refs.enemy!);
    if (card === 'adept-of-anger') {
      expect(forceToken(s, 'alice')).toBeUndefined();
      expect(s.cards[refs.enemy!]!.exhausted).toBe(true);
    } else expect(s.cards[refs.enemy!]!.damage).toBe(2);
  }
});
test('Caretaker can exhaust for no benefit before a Force play, then draws after a Force play', () => {
  const p = board('caretaker-matron', false);
  p.players[0].hand = [{ card: 'youngling-padawan', ref: 'force' }];
  const { state, refs } = scenario(p);
  const empty = step(state, i => i.kind === 'use-ability' && i.card === refs.source);
  expect(empty.players.alice!.hand).toHaveLength(1);
  let s = play(state, refs.force!);
  s = step(s, 'pass');
  s = step(s, i => i.kind === 'use-ability' && i.card === refs.source);
  expect(s.players.alice!.hand).toHaveLength(1);
});
test('Niman Strike attacks a unit while exhausted; Pounce restricts the attacker to Creatures', () => {
  for (const card of ['niman-strike', 'pounce']) {
    const p = board(card);
    p.players[0].ground = [
      {
        card: card === 'pounce' ? 'wampa' : 'jedi-guardian',
        ref: 'ally',
        exhausted: card === 'niman-strike',
      },
    ];
    p.players[1].ground = [{ card: 'jedi-guardian', ref: 'enemy' }];
    const { state, refs } = scenario(p);
    let s = play(state, refs.source!);
    if (card === 'niman-strike') {
      s = target(s, refs.ally!);
      expect(
        s.execution.decision!.options.some(
          o => o.intent.kind === 'attack' && o.intent.defender === s.players.bob!.base,
        ),
      ).toBe(false);
    }
    s = attack(s, refs.ally!, refs.enemy!);
    if (card === 'niman-strike') expect(s.cards[refs.enemy!]!.damage).toBe(5);
    else expect(s.cards[refs.enemy!]!.zone).toBe('discard');
  }
});
for (const [card, count, filter] of [
  ['dagoyan-master', 5, 'Force'],
  ['luthen-rael--masquerading-antiquarian', 5, 'Item'],
  ['pillio-star-compass', 3, 'Unit'],
] as const)
  test(`${card}: privately searches only the specified prefix and reveals the selected copy`, () => {
    const p = board(card, card !== 'luthen-rael--masquerading-antiquarian');
    p.players[0].force = true;
    p.players[0].deck = [
      { card: filter === 'Item' ? 'heirloom-lightsaber' : 'jedi-guardian', ref: 'found' },
      ...Array.from({ length: 8 }, () => ({ card: 'it-s-worse' })),
    ];
    p.players[0].ground ??= [];
    p.players[0].ground!.push({ card: ids.marine, ref: 'host' });
    const { state, refs } = scenario(p);
    let s =
      card === 'luthen-rael--masquerading-antiquarian'
        ? attack(state, refs.source!)
        : play(state, refs.source!, card === 'pillio-star-compass' ? refs.host : undefined);
    if (card === 'dagoyan-master') s = step(s, 'accept-effect');
    expect(s.execution.decision?.selection?.cards).toEqual([refs.found!]);
    expect(
      new Projector(s.gameId, { role: 'player', playerId: 'alice' }).project(s).decision
        ?.inspectedCards,
    ).toHaveLength(count);
    expect(new Projector(s.gameId, { role: 'spectator' }).project(s).decision).toBeNull();
    s = step(s, 'search', [refs.found!]);
    expect(s.cards[refs.found!]!.zone).toBe('hand');
    expect(s.players.alice!.deck).toHaveLength(8);
    expect(
      s.facts.some(f => f.type === 'revealed' && f.cards.some(c => c.instanceId === refs.found)),
    ).toBe(true);
  });
function defeatBoard(card: string) {
  const p = board(card, false);
  p.players[0].hand = [{ card: 'it-s-worse', ref: 'removal' }];
  p.players[0].force = true;
  return p;
}
const removeSource = (state: GameState, refs: Record<string, string>) =>
  target(play(state, refs.removal!), refs.source!);
for (const card of [
  'eeth-koth--spiritual-warrior',
  'jedi-in-hiding',
  'savage-opress--imbued-with-hate',
  'deceptive-shade',
])
  test(`${card}: its defeated ability uses its departure source and optional Force payment`, () => {
    const p = defeatBoard(card);
    p.players[1].hand = [{ card: ids.marine, ref: 'discard' }];
    const { state, refs } = scenario(p);
    let s = removeSource(state, refs);
    if (card === 'deceptive-shade') {
      expect(s.playModifiers.some(m => m.phaseAbilities?.keywords?.includes('Ambush'))).toBe(true);
      return;
    }
    const declined = step(s, 'decline-effect');
    if (card === 'savage-opress--imbued-with-hate')
      expect(declined.cards[declined.players.alice!.base]!.damage).toBe(9);
    s = step(s, 'accept-effect');
    expect(forceToken(s, 'alice')).toBeUndefined();
    if (card === 'eeth-koth--spiritual-warrior') {
      expect(s.cards[refs.source!]!.zone).toBe('resources');
      expect(s.cards[refs.source!]!.exhausted).toBe(true);
    } else if (card === 'jedi-in-hiding') {
      expect(s.execution.decision!.playerId).toBe('bob');
      s = select(s, refs.discard!);
      expect(s.cards[refs.discard!]!.zone).toBe('discard');
    } else expect(s.cards[s.players.alice!.base]!.damage).toBe(0);
  });
for (const [card, tokenKind] of [
  ['lor-san-tekka--secret-keeper', 'experience'],
  ['tauntaun', 'shield'],
] as const)
  test(`${card}: a defeated source gives its token only to an eligible chosen survivor`, () => {
    const p = defeatBoard(card);
    p.players[0].ground!.push({
      card: 'plo-koon--i-don-t-believe-in-chance',
      ref: 'ally',
      damage: 1,
    });
    const { state, refs } = scenario(p),
      s = target(removeSource(state, refs), refs.ally!);
    expect(
      attachedUpgrades(s, s.cards[refs.ally!]!).filter(c => c.cardId === tokenKind),
    ).toHaveLength(1);
    expect(s.cards[refs.source!]!.zone).toBe('discard');
  });
test('Loth-cat exhausts on play and after defeat; HK-87 deals one simultaneous ground-wide packet', () => {
  const p = defeatBoard('loth-cat');
  p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
  const a = scenario(p),
    s = target(removeSource(a.state, a.refs), a.refs.enemy!);
  expect(s.cards[a.refs.enemy!]!.exhausted).toBe(true);
  const q = defeatBoard('hk-87-assassin-droid');
  q.players[0].ground!.push({ card: ids.marine, ref: 'ally' });
  q.players[1].ground = [{ card: ids.marine, ref: 'enemy' }];
  q.players[1].space = [{ card: ids.fighter, ref: 'space' }];
  const b = scenario(q),
    r = removeSource(b.state, b.refs);
  expect(r.cards[b.refs.ally!]!.damage).toBe(2);
  expect(r.cards[b.refs.enemy!]!.damage).toBe(2);
  expect(r.cards[b.refs.space!]!.damage).toBe(0);
});
test('J-type Nubian Starship draws on play and requires its controller to discard on defeat', () => {
  const p = board('j-type-nubian-starship');
  const a = scenario(p),
    s = play(a.state, a.refs.source!);
  expect(s.players.alice!.hand).toHaveLength(1);
  const q = defeatBoard('j-type-nubian-starship');
  q.players[0].hand!.push({ card: ids.marine, ref: 'discard' });
  const b = scenario(q),
    r = select(removeSource(b.state, b.refs), b.refs.discard!);
  expect(r.players.alice!.hand).toHaveLength(0);
});
test('Sifo-Dyas discards every selected Clone and grants separate free phase play permissions', () => {
  const p = defeatBoard('sifo-dyas--commissioning-an-army');
  p.players[0].deck = [
    { card: 'point-rain-reclaimer', ref: 'a' },
    { card: 'clone-pilot', ref: 'b' },
    ...Array.from({ length: 8 }, () => ({ card: ids.marine })),
  ];
  const { state, refs } = scenario(p);
  let s = removeSource(state, refs);
  expect(s.execution.decision?.selection?.budget?.max).toBe(4);
  s = step(s, 'search', [refs.a!, refs.b!]);
  expect(s.grantedPlays.map(g => g.target.instanceId).sort()).toEqual([refs.a!, refs.b!].sort());
  expect(s.cards[refs.a!]!.zone).toBe('discard');
  expect(s.cards[refs.b!]!.zone).toBe('discard');
  s = step(s, 'pass');
  const paid = s.players.alice!.resources.filter(id => s.cards[id]!.exhausted).length;
  s = play(s, refs.b!);
  expect(s.cards[refs.b!]!.zone).toBe('ground');
  expect(s.players.alice!.resources.filter(id => s.cards[id]!.exhausted).length).toBe(paid);
});
test('Drengir gains the defeated defender’s printed cost as Experience after combat', () => {
  const p = board('drengir-spawn', false);
  p.attachments = [{ card: 'shield', unit: 'source' }];
  p.players[1].ground = [{ card: ids.trooper, ref: 'enemy' }];
  const { state, refs } = scenario(p),
    s = attack(state, refs.source!, refs.enemy!);
  expect(tokens(s, refs.source!)).toBe(1);
});
test('Dume grants Experience at regroup start to other friendly non-Vehicles', () => {
  const p = board('dume--redeem-the-future', false);
  p.players[0].ground!.push({ card: ids.marine, ref: 'ally' });
  p.players[0].space = [{ card: ids.fighter, ref: 'vehicle' }];
  const { state, refs } = scenario(p),
    s = step(step(state, 'pass'), 'pass');
  expect(tokens(s, refs.ally!)).toBe(1);
  expect(tokens(s, refs.source!)).toBe(0);
  expect(tokens(s, refs.vehicle!)).toBe(0);
});
test('The Daughter spends Force after base damage; the Father can regain it after replaced self-damage', () => {
  const p = board('the-daughter--embodiment-of-light', false);
  p.players[0].force = true;
  p.players[1].ground = [{ card: ids.marine, ref: 'enemy' }];
  const { state, refs } = scenario(p);
  let s = attack(step(state, 'pass'), refs.enemy!, state.players.alice!.base);
  s = step(s, 'accept-effect');
  expect(s.cards[s.players.alice!.base]!.damage).toBe(1);
  const q = board('the-father--maintaining-balance', false);
  q.players[0].force = true;
  q.players[0].hand = [{ card: 'do-or-do-not', ref: 'event' }];
  q.attachments = [{ card: 'shield', unit: 'source' }];
  const b = scenario(q);
  let t = step(play(b.state, b.refs.event!), 'accept-effect');
  expect(t.players.alice!.hand).toHaveLength(2);
  expect(forceToken(t, 'alice')).toBeUndefined();
  t = target(t, b.refs.source!);
  expect(forceToken(t, 'alice')).toBeDefined();
  expect(t.cards[b.refs.source!]!.damage).toBe(0);
});
test('Force Speed returns selected non-unique upgrades before combat, leaving unselected copies', () => {
  const p = board('force-speed');
  p.players[0].ground = [{ card: ids.consular, ref: 'ally' }];
  p.players[1].ground = [{ card: 'jedi-guardian', ref: 'enemy' }];
  p.attachments = [
    { card: 'academy-training', unit: 'enemy', ref: 'first' },
    { card: 'academy-training', unit: 'enemy', ref: 'second' },
  ];
  const { state, refs } = scenario(p);
  let s = target(play(state, refs.source!), refs.ally!);
  s = attack(s, refs.ally!, refs.enemy!);
  s = select(s, refs.first!);
  expect(s.cards[refs.first!]!.zone).toBe('hand');
  expect(s.cards[refs.second!]!.zone).toBe('ground');
  expect(s.cards[refs.enemy!]!.damage).toBe(3);
});
test('Corrupted Saber weakens the defending unit; Jedi and Sith Holocrons grant their distinct attack abilities', () => {
  for (const card of ['corrupted-saber', 'jedi-holocron', 'sith-holocron']) {
    const p = position();
    p.players[0].ground = [
      { card: 'jedi-guardian', ref: 'host' },
      { card: ids.consular, ref: 'ally', damage: 3 },
    ];
    p.players[1].ground = [{ card: 'jedi-guardian', ref: 'enemy' }];
    p.attachments = [{ card, unit: 'host' }];
    const { state, refs } = scenario(p);
    let s = attack(state, refs.host!, refs.enemy!);
    if (card === 'corrupted-saber') expect(s.cards[refs.host!]!.damage).toBe(4);
    if (card === 'jedi-holocron') {
      s = target(s, refs.ally!);
      expect(s.cards[refs.ally!]!.damage).toBe(0);
    }
    if (card === 'sith-holocron') {
      s = target(s, refs.ally!);
      expect(s.cards[refs.ally!]!.damage).toBe(5);
      expect(s.cards[refs.enemy!]!.damage).toBe(7);
    }
  }
});
test('Luke and Eighth Brother observe another qualifying unit play and spend Force once', () => {
  for (const card of ['luke-skywalker--a-hero-s-beginning', 'eighth-brother--hunt-together']) {
    const p = board(card, false);
    p.players[0].force = true;
    p.players[0].hand = [{ card: 'plo-koon--i-don-t-believe-in-chance', ref: 'played' }];
    const { state, refs } = scenario(p);
    let s = step(play(state, refs.played!), 'accept-effect');
    if (card.startsWith('luke'))
      expect(attachedUpgrades(s, s.cards[refs.source!]!)).toHaveLength(2);
    else {
      s = target(s, refs.source!);
      expect(unitStats(s, s.cards[refs.source!]!).hp).toBe(
        unitStats(state, state.cards[refs.source!]!).hp + 2,
      );
    }
    expect(forceToken(s, 'alice')).toBeUndefined();
  }
});
test('Disturbance and Last Words distinguish leaving play from defeat in the current phase', () => {
  for (const card of ['disturbance-in-the-force', 'last-words']) {
    const p = board(card);
    p.players[0].hand!.push({ card: 'it-s-worse', ref: 'removal' });
    p.players[0].ground = [
      { card: ids.marine, ref: 'departing' },
      { card: ids.consular, ref: 'ally' },
    ];
    const { state, refs } = scenario(p);
    const early = play(state, refs.source!);
    expect(early.execution.decision?.kind).toBe('action');
    expect(attachedUpgrades(early, early.cards[refs.ally!]!)).toHaveLength(0);
    let s = target(play(state, refs.removal!), refs.departing!);
    s = step(s, 'pass');
    s = target(play(s, refs.source!), refs.ally!);
    expect(attachedUpgrades(s, s.cards[refs.ally!]!)).toHaveLength(card === 'last-words' ? 2 : 1);
    if (card === 'disturbance-in-the-force') expect(forceToken(s, 'alice')).toBeDefined();
  }
});
test('Flight of the Inquisitor returns separate Force-unit and Lightsaber-upgrade copies', () => {
  const p = board('flight-of-the-inquisitor');
  p.players[0].discard = [
    { card: 'jedi-guardian', ref: 'unit' },
    { card: 'heirloom-lightsaber', ref: 'saber' },
    { card: ids.marine, ref: 'other' },
  ];
  const { state, refs } = scenario(p);
  let s = select(play(state, refs.source!), refs.unit!);
  s = select(s, refs.saber!);
  expect(s.cards[refs.unit!]!.zone).toBe('hand');
  expect(s.cards[refs.saber!]!.zone).toBe('hand');
  expect(s.cards[refs.other!]!.zone).toBe('discard');
});
for (const card of ['focus-determines-reality', 'rampage'])
  test(`${card}: the phase-wide instruction affects only current matching friendly units`, () => {
    const p = board(card);
    p.players[0].ground = [
      { card: 'jedi-guardian', ref: 'force' },
      { card: 'wampa', ref: 'creature' },
    ];
    p.players[1].ground = [{ card: 'jedi-guardian', ref: 'enemy' }];
    const { state, refs } = scenario(p),
      s = play(state, refs.source!);
    if (card === 'rampage') {
      expect(unitStats(s, s.cards[refs.creature!]!)).toEqual({ power: 6, hp: 7 });
      expect(unitStats(s, s.cards[refs.force!]!)).toEqual({ power: 4, hp: 8 });
    } else {
      expect(effectiveAbilities(s, s.cards[refs.force!]!).keywords).toContain('Saboteur');
      expect(effectiveAbilities(s, s.cards[refs.creature!]!).keywords).not.toContain('Saboteur');
      expect(effectiveAbilities(s, s.cards[refs.force!]!).raid).toBe(1);
    }
    expect(unitStats(s, s.cards[refs.enemy!]!)).toEqual({ power: 4, hp: 8 });
  });
test('Impossible Escape may exhaust a friendly unit or spend Force before exhausting the enemy and drawing', () => {
  for (const mode of ['exhaust-a-unit', 'use-the-force']) {
    const p = board('impossible-escape');
    p.players[0].force = true;
    p.players[0].ground = [{ card: ids.marine, ref: 'ally' }];
    p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
    const { state, refs } = scenario(p);
    let s = step(play(state, refs.source!), i => i.kind === 'choose-mode' && i.mode === mode);
    s = mode === 'exhaust-a-unit' ? target(s, refs.ally!) : step(s, 'accept-effect');
    s = target(s, refs.enemy!);
    expect(s.cards[refs.enemy!]!.exhausted).toBe(true);
    expect(s.players.alice!.hand).toHaveLength(1);
    expect(s.cards[refs.ally!]!.exhausted).toBe(mode === 'exhaust-a-unit');
  }
});
test('Jocasta moves the chosen friendly upgrade to a different eligible host, preserving its copy', () => {
  const p = board('jocasta-nu--the-gift-of-knowledge');
  p.players[0].ground = [{ card: ids.marine, ref: 'old' }];
  p.attachments = [{ card: 'academy-training', unit: 'old', ref: 'upgrade' }];
  const { state, refs } = scenario(p);
  let s = target(play(state, refs.source!), refs.old!);
  s = select(s, refs.upgrade!);
  expect(
    s.execution.decision!.options.some(
      o => o.intent.kind === 'target' && o.intent.card === refs.old,
    ),
  ).toBe(false);
  s = target(s, refs.source!);
  expect(s.cards[refs.upgrade!]!.attachedTo?.instanceId).toBe(refs.source);
  expect(s.cards[refs.upgrade!]!.incarnation).toBe(state.cards[refs.upgrade!]!.incarnation);
});
for (const card of ['kaadu', 'refugee-of-the-path', 'point-rain-reclaimer'])
  test(`${card}: the played benefit checks its printed recipient condition`, () => {
    const p = board(card);
    p.players[0].force = true;
    p.players[0].ground = [{ card: 'jedi-sentinel', ref: 'ally' }];
    const { state, refs } = scenario(p);
    let s = play(state, refs.source!);
    s = target(s, card === 'point-rain-reclaimer' ? refs.source! : refs.ally!);
    if (card === 'kaadu')
      expect(effectiveAbilities(s, s.cards[refs.ally!]!).keywords).toContain('Overwhelm');
    else
      expect(
        attachedUpgrades(s, s.cards[card === 'point-rain-reclaimer' ? refs.source! : refs.ally!]!),
      ).toHaveLength(1);
  });
test('Lightsaber Throw discards its chosen hand card before damage, then draws', () => {
  const p = board('lightsaber-throw');
  p.players[0].hand!.push(
    { card: 'heirloom-lightsaber', ref: 'saber' },
    { card: ids.marine, ref: 'other' },
  );
  p.players[1].ground = [{ card: 'jedi-guardian', ref: 'enemy' }];
  const { state, refs } = scenario(p);
  let s = step(play(state, refs.source!), 'accept-effect');
  expect(s.execution.decision!.selection?.cards).toEqual([refs.saber!]);
  s = select(s, refs.saber!);
  expect(s.cards[refs.saber!]!.zone).toBe('discard');
  s = target(s, refs.enemy!);
  expect(s.cards[refs.enemy!]!.damage).toBe(4);
  expect(s.players.alice!.hand).toHaveLength(2);
});
test('Quinlan checks modified power during the attack; T-6 Shuttle gets Experience before defending', () => {
  const p = board('quinlan-vos--dark-disciple', false);
  p.attachments = [{ card: 'academy-training', unit: 'source' }];
  const a = scenario(p),
    s = target(attack(a.state, a.refs.source!), a.state.players.bob!.base);
  expect(s.cards[s.players.bob!.base]!.damage).toBe(8);
  const q = position();
  q.players[0].space = [{ card: ids.fighter, ref: 'attacker' }];
  q.players[1].space = [{ card: 't-6-shuttle-1974--stay-close', ref: 'shuttle' }];
  const b = scenario(q),
    t = target(attack(b.state, b.refs.attacker!, b.refs.shuttle!), b.refs.shuttle!);
  expect(tokens(t, b.refs.shuttle!)).toBe(1);
});
test('Saesee Tiin deals simultaneous one-point damage to the selected units only with initiative', () => {
  const p = board('saesee-tiin--courageous-warrior');
  p.players[0].ground = [{ card: ids.marine, ref: 'ally' }];
  p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
  const { state, refs } = scenario(p),
    s = select(play(state, refs.source!), refs.ally!, refs.enemy!);
  expect(s.cards[refs.ally!]!.damage).toBe(1);
  expect(s.cards[refs.enemy!]!.damage).toBe(1);
  p.initiative.holder = 'bob';
  const b = scenario(p);
  expect(play(b.state, b.refs.source!).execution.decision!.kind).toBe('action');
});
test('Zuckuss names before milling the defending deck and only a matching title grants attack power', () => {
  const p = board('zuckuss--the-findsman', false);
  p.players[1].deck = [{ card: ids.marine, ref: 'top' }];
  const { state, refs } = scenario(p),
    s = attack(state, refs.source!);
  const d = cardDefinition('zuckuss--the-findsman');
  if (d.kind !== 'unit') throw Error();
  for (const match of [false, true]) {
    const t = drain(
      advance(s, { ...choose(s, 'accept-effect'), namedCardId: match ? ids.marine : ids.fighter })
        .state,
    );
    expect(t.cards[refs.top!]!.zone).toBe('discard');
    expect(t.cards[t.players.bob!.base]!.damage).toBe(d.power + (match ? 4 : 0));
    expect(unitStats(t, t.cards[refs.source!]!).power).toBe(d.power);
  }
});
test('Played and defeated dual triggers have the same printed choices on either timing', () => {
  const p = board('loth-cat');
  p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
  const a = scenario(p);
  expect(target(play(a.state, a.refs.source!), a.refs.enemy!).cards[a.refs.enemy!]!.exhausted).toBe(
    true,
  );
  const q = board('savage-opress--imbued-with-hate');
  const b = scenario(q);
  expect(play(b.state, b.refs.source!).cards[b.state.players.alice!.base]!.damage).toBe(9);
  const r = defeatBoard('dagoyan-master');
  r.players[0].deck = [{ card: 'jedi-guardian', ref: 'force' }];
  const c = scenario(r);
  let t = step(removeSource(c.state, c.refs), 'accept-effect');
  t = step(t, 'search', [c.refs.force!]);
  expect(t.cards[c.refs.force!]!.zone).toBe('hand');
});

for (const c of lofContinuations())
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
test('Temporary unit modifiers expire at the phase boundary and do not affect later copies', () => {
  const p = board('overpower');
  p.players[0].ground = [{ card: ids.consular, ref: 'ally' }];
  const { state, refs } = scenario(p);
  let s = target(play(state, refs.source!), refs.ally!);
  expect(unitStats(s, s.cards[refs.ally!]!)).toEqual({ power: 6, hp: 10 });
  s = step(step(s, 'pass'), 'pass');
  expect(unitStats(s, s.cards[refs.ally!]!)).toEqual({ power: 3, hp: 7 });
  expect(effectiveAbilities(s, s.cards[refs.ally!]!).keywords).not.toContain('Overwhelm');
});

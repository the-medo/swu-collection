import { expect, test } from 'bun:test';
import type { CardEffect } from '../cards/definition.ts';
import { cardDefinition } from '../cards/registry.ts';
import { advance, settle } from '../engine/advance.ts';
import { attachedUpgrades, unitStats } from '../engine/attachments.ts';
import { decodeState, encodeState } from '../engine/checkpoint.ts';
import { effectiveAbilities } from '../engine/effective-abilities.ts';
import { modifyUnit } from '../engine/lasting.ts';
import type { EngineInput, GameState } from '../engine/model.ts';
import { effectFrames } from '../engine/triggers.ts';
import {
  attack,
  choose,
  ids,
  ordered,
  play,
  position,
  resources,
  scenario,
  step,
  target,
} from './ic27-helpers.ts';

function board(card: string, inHand = false) {
  const p = position(),
    d = cardDefinition(card);
  p.players[0].resources = resources();
  p.players[0][inHand || d.kind !== 'unit' ? 'hand' : d.arena] = [{ card, ref: 'card' }];
  return p;
}
function unit(card: string) {
  const d = cardDefinition(card);
  if (d.kind !== 'unit') throw new Error('Expected a unit');
  return d;
}
const damage = (s: GameState, who = 'bob') => s.cards[s.players[who]!.base]!.damage;
const stats = (s: GameState, id: string) => unitStats(s, s.cards[id]!);
const tokens = (s: GameState, id: string, token = 'experience') =>
  attachedUpgrades(s, s.cards[id]!).filter(c => c.cardId === token).length;
const targets = (s: GameState) =>
  s.execution.decision!.options.flatMap(o => (o.intent.kind === 'target' ? [o.intent.card] : []));
const attacks = (s: GameState) =>
  s.execution.decision!.options.flatMap(o =>
    o.intent.kind === 'attack' ? [o.intent.defender] : [],
  );
function effects(state: GameState, list: CardEffect[], source = state.players.alice!.leader) {
  const s = structuredClone(state);
  s.execution.decision = null;
  s.execution.frames = [
    ...effectFrames('alice', s.cards[source]!, list),
    { kind: 'flush-triggers' },
    { kind: 'action' },
  ];
  settle(s);
  return ordered(s);
}
function defeat(state: GameState, id: string) {
  return effects(state, [{ kind: 'on-unit', target: 'source', operation: { kind: 'defeat' } }], id);
}
function blank(state: GameState, id: string) {
  modifyUnit(state, state.cards[id]!, state.cards[id]!, {
    kind: 'modify',
    power: 0,
    hp: 0,
    duration: 'phase',
    loseAbilities: true,
  });
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
  expect(child.exitCode).toBe(0);
  expect(child.stderr.toString()).toBe('');
  expect(JSON.parse(child.stdout.toString())).toEqual(advance(s, input));
}

// Printed text is pinned in fixtures/early-set-foundations.json. Keyword
// expectations use Comprehensive Rules v8, including exhausted Ambush attacks.
for (const card of [
  'cell-block-guard',
  'cloud-city-wing-guard',
  'echo-base-defender',
  'system-patrol-craft',
  'black-sun-starfighter',
  'niima-outpost-constables',
  'pyke-sentinel',
  'village-protectors',
  'armored-saber-tank',
  'b1-security-team',
  'falchion-ion-tank',
  'patrolling-aat',
])
  test(`${card}: Sentinel protects its arena and base`, () => {
    const p = position(),
      d = unit(card);
    p.players[0][d.arena] = [{ card: d.arena === 'ground' ? ids.marine : ids.fighter }];
    p.players[1][d.arena] = [
      { card, ref: 'sentinel' },
      { card: d.arena === 'ground' ? ids.marine : ids.fighter },
    ];
    const g = scenario(p);
    expect(attacks(g.state)).toEqual([g.refs.sentinel!]);
  });

for (const card of [
  'crafty-smuggler',
  'seventh-fleet-defender',
  'wilderness-fighter',
  'hutt-s-henchmen',
  'village-protectors',
])
  test(`${card}: Shielded creates exactly one Shield on the played copy`, () => {
    const p = board(card, true),
      d = unit(card);
    p.players[0][d.arena] = [{ card, ref: 'old' }];
    const g = scenario(p),
      s = play(g.state, g.refs.card!);
    expect(tokens(s, g.refs.card!, 'shield')).toBe(1);
    expect(tokens(s, g.refs.old!, 'shield')).toBe(0);
  });

for (const [card, raid, overwhelm] of [
  ['auzituck-liberator-gunship', 0, false],
  ['syndicate-lackeys', 0, false],
  ['mercenary-company', 0, true],
  ['cloud-rider', 0, false],
  ['modded-cohort', 2, false],
  ['phase-ii-clone-trooper', 0, false],
] as const)
  test(`${card}: Ambush may attack while exhausted or be declined`, () => {
    for (const decline of [false, true]) {
      const p = board(card, true),
        d = unit(card);
      p.players[1][d.arena] = [
        { card: d.arena === 'ground' ? ids.trooper : ids.fighter, ref: 'enemy' },
      ];
      const g = scenario(p);
      let s = play(g.state, g.refs.card!);
      expect(s.cards[g.refs.card!]!.exhausted).toBe(true);
      expect(targets(s)).toEqual([g.refs.enemy!]);
      s = decline ? step(s, 'decline-effect') : target(s, g.refs.enemy!);
      expect(s.cards[g.refs.enemy!]!.zone).toBe(decline ? d.arena : 'discard');
      expect(damage(s)).toBe(!decline && overwhelm ? d.power + raid - 1 : 0);
      expect(
        s.facts.filter(
          f => f.type === 'readied' && f.cards?.some(c => c.instanceId === g.refs.card),
        ),
      ).toHaveLength(0);
    }
  });

for (const [card, raid, restore] of [
  ['cantina-braggart', 2, 0],
  ['green-squadron-a-wing', 2, 0],
  ['regional-sympathizers', 0, 2],
  ['restored-arc-170', 0, 1],
  ['sundari-peacekeeper', 2, 2],
  ['twin-pod-cloud-car', 0, 2],
  ['ryloth-militia', 1, 0],
  ['soldier-of-the-501st', 1, 0],
] as const)
  test(`${card}: Raid and Restore resolve during an attack`, () => {
    const p = board(card);
    p.players[0].base.damage = 5;
    const g = scenario(p),
      s = attack(g.state, g.refs.card!);
    expect(damage(s)).toBe(unit(card).power + raid);
    expect(damage(s, 'alice')).toBe(5 - restore);
    expect(stats(s, g.refs.card!).power).toBe(unit(card).power);
  });

for (const card of [
  'scout-bike-pursuer',
  'death-watch-loyalist',
  'heroic-renegade',
  'wroshyr-tree-tender',
  'dwarf-spider-droid',
  'wookiee-warrior',
])
  test(`${card}: Grit counts damage and disappears with ability loss`, () => {
    const p = board(card),
      d = unit(card);
    p.players[0][d.arena]![0]!.damage = 1;
    const g = scenario(p);
    expect(damage(attack(g.state, g.refs.card!))).toBe(d.power + 1);
    blank(g.state, g.refs.card!);
    expect(stats(g.state, g.refs.card!).power).toBe(d.power);
  });

for (const card of [
  'at-st',
  'death-watch-loyalist',
  'advanced-recon-commando',
  'dendup-s-loyalist',
])
  test(`${card}: excess combat damage overwhelms the base`, () => {
    const p = board(card);
    p.players[1].ground = [{ card: ids.trooper, ref: 'enemy' }];
    const g = scenario(p),
      s = attack(g.state, g.refs.card!, g.refs.enemy!);
    expect(s.cards[g.refs.enemy!]!.zone).toBe('discard');
    expect(damage(s)).toBe(unit(card).power - 1);
  });

for (const card of [
  'jawa-scavenger',
  'house-kast-soldier',
  'resourceful-pursuers',
  'bold-recon-commando',
  'droid-starfighter',
])
  test(`${card}: Saboteur bypasses Sentinel and removes the chosen defender's Shield`, () => {
    const p = board(card),
      d = unit(card);
    p.players[1][d.arena] = [
      { card: d.arena === 'ground' ? 'cell-block-guard' : 'system-patrol-craft' },
      { card: d.arena === 'ground' ? ids.consular : 'eta-2-light-interceptor', ref: 'enemy' },
    ];
    p.attachments = [{ card: 'shield', unit: 'enemy' }];
    const g = scenario(p);
    expect(attacks(g.state)).toContain(g.state.players.bob!.base);
    const s = attack(g.state, g.refs.card!, g.refs.enemy!);
    expect(tokens(s, g.refs.enemy!, 'shield')).toBe(0);
    expect(s.cards[g.refs.enemy!]!.damage).toBe(d.power);
  });

test('2-1B heals another unit on either side, may decline, and resumes the target choice', () => {
  const p = board('2-1b-surgical-droid');
  p.players[0].ground!.push({ card: ids.consular, damage: 3, ref: 'ally' });
  p.players[1].ground = [{ card: ids.consular, damage: 1, ref: 'enemy' }];
  const g = scenario(p),
    pending = attack(g.state, g.refs.card!);
  expect(targets(pending)).toEqual(expect.arrayContaining([g.refs.ally, g.refs.enemy]));
  expect(targets(pending)).not.toContain(g.refs.card);
  resume(
    pending,
    choose(pending, i => i.kind === 'target' && i.card === g.refs.ally),
  );
  expect(target(pending, g.refs.ally!).cards[g.refs.ally!]!.damage).toBe(1);
  expect(target(pending, g.refs.enemy!).cards[g.refs.enemy!]!.damage).toBe(0);
  expect(step(pending, 'decline-effect').cards[g.refs.ally!]!.damage).toBe(3);
});

test('Motti can ready a Villainy unit on either side after leaving play, or decline', () => {
  const p = board('admiral-motti--brazen-and-scornful');
  p.players[0].ground!.push(
    { card: ids.trooper, exhausted: true, ref: 'ally' },
    { card: ids.marine, exhausted: true, ref: 'wrong' },
  );
  p.players[1].ground = [{ card: ids.trooper, exhausted: true, ref: 'enemy' }];
  const g = scenario(p),
    pending = defeat(g.state, g.refs.card!);
  expect(pending.cards[g.refs.card!]!.zone).toBe('discard');
  expect(targets(pending).sort()).toEqual([g.refs.ally!, g.refs.enemy!].sort());
  resume(
    pending,
    choose(pending, i => i.kind === 'target' && i.card === g.refs.enemy),
  );
  expect(target(pending, g.refs.enemy!).cards[g.refs.enemy!]!.exhausted).toBe(false);
  expect(target(pending, g.refs.ally!).cards[g.refs.ally!]!.exhausted).toBe(false);
  expect(step(pending, 'decline-effect').cards[g.refs.ally!]!.exhausted).toBe(true);
});

test('Ardent Sympathizer follows initiative ownership even after it has been claimed', () => {
  for (const holder of ['alice', 'bob'])
    for (const claimed of [false, true]) {
      const p = board('ardent-sympathizer');
      p.initiative = { holder, claimed };
      const g = scenario(p);
      expect(stats(g.state, g.refs.card!).power).toBe(holder === 'alice' ? 5 : 3);
      blank(g.state, g.refs.card!);
      expect(stats(g.state, g.refs.card!).power).toBe(3);
    }
});

test('Cantina Bouncer may return itself or either side, excludes leaders and discards attachments', () => {
  const p = board('cantina-bouncer', true);
  p.players[1].leader.deployedAs = 'unit';
  p.players[1].ground = [{ card: ids.marine, ref: 'enemy' }];
  p.attachments = [{ card: 'shield', unit: 'enemy', ref: 'shield' }];
  const g = scenario(p),
    pending = play(g.state, g.refs.card!);
  expect(targets(pending)).toEqual(expect.arrayContaining([g.refs.card, g.refs.enemy]));
  expect(targets(pending)).not.toContain(pending.players.bob!.leader);
  const s = target(pending, g.refs.enemy!);
  expect(s.cards[g.refs.enemy!]!.zone).toBe('hand');
  expect(s.cards[g.refs.shield!]!.zone).toBe('set-aside');
  expect(target(pending, g.refs.card!).cards[g.refs.card!]!.zone).toBe('hand');
  expect(step(pending, 'decline-effect').cards[g.refs.enemy!]!.zone).toBe('ground');
});

for (const card of ['confiscate', 'disabling-fang-fighter'])
  test(`${card}: defeats an upgrade on either side`, () => {
    const p = board(card, true);
    p.players[0].ground = [{ card: ids.marine, ref: 'ally' }];
    p.players[1].ground = [{ card: ids.marine, ref: 'enemy' }];
    p.attachments = [
      { card: 'resilient', unit: 'ally', ref: 'upgrade' },
      { card: 'shield', unit: 'enemy', ref: 'shield' },
    ];
    const g = scenario(p),
      pending = play(g.state, g.refs.card!);
    expect(targets(pending).sort()).toEqual([g.refs.upgrade!, g.refs.shield!].sort());
    expect(pending.execution.decision!.options.some(o => o.intent.kind === 'decline-effect')).toBe(
      card === 'disabling-fang-fighter',
    );
    expect(target(pending, g.refs.upgrade!).cards[g.refs.upgrade!]!.zone).toBe('discard');
    expect(target(pending, g.refs.shield!).cards[g.refs.shield!]!.zone).toBe('set-aside');
  });

for (const [card, power, hp] of [
  ['disarm', -4, 0],
  ['moment-of-glory', 4, 4],
] as const)
  test(`${card}: modifies the selected unit for this phase only`, () => {
    const p = board(card, true);
    p.players[0].ground = [{ card: ids.marine, ref: 'ally' }];
    p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
    const g = scenario(p),
      pending = play(g.state, g.refs.card!);
    expect(targets(pending).includes(g.refs.ally!)).toBe(card !== 'disarm');
    let s = target(pending, g.refs.enemy!);
    expect(stats(s, g.refs.enemy!)).toEqual({ power: Math.max(0, 3 + power), hp: 7 + hp });
    s = step(s, 'pass');
    s = step(s, 'pass');
    expect(stats(s, g.refs.enemy!)).toEqual({ power: 3, hp: 7 });
  });

test('Distant Patroller grants an optional Shield to a Vigilance unit on either side', () => {
  const p = board('distant-patroller');
  p.players[0].ground = [{ card: ids.consular, ref: 'ally' }];
  p.players[1].ground = [
    { card: ids.consular, ref: 'enemy' },
    { card: ids.trooper, ref: 'wrong' },
  ];
  const g = scenario(p),
    pending = defeat(g.state, g.refs.card!);
  expect(targets(pending).sort()).toEqual([g.refs.ally!, g.refs.enemy!].sort());
  expect(tokens(target(pending, g.refs.enemy!), g.refs.enemy!, 'shield')).toBe(1);
  expect(tokens(step(pending, 'decline-effect'), g.refs.ally!, 'shield')).toBe(0);
});

for (const [card, ally] of [
  ['general-dodonna--massassi-group-commander', ids.marine],
  ['general-veers--blizzard-force-commander', ids.trooper],
] as const)
  test(`${card}: aura excludes itself and enemies and ends when the source is blanked or defeated`, () => {
    const p = board(card);
    p.players[0].ground!.push({ card: ally, ref: 'ally' }, { card: 'warrior-drone', ref: 'wrong' });
    p.players[1].ground = [{ card: ally, ref: 'enemy' }];
    const g = scenario(p),
      d = unit(ally),
      source = unit(card);
    expect(stats(g.state, g.refs.ally!)).toEqual({ power: d.power + 1, hp: d.hp + 1 });
    expect(stats(g.state, g.refs.card!)).toEqual({ power: source.power, hp: source.hp });
    expect(stats(g.state, g.refs.enemy!)).toEqual({ power: d.power, hp: d.hp });
    expect(stats(g.state, g.refs.wrong!)).toEqual({ power: 1, hp: 4 });
    const s = defeat(g.state, g.refs.card!);
    expect(stats(s, g.refs.ally!)).toEqual({ power: d.power, hp: d.hp });
    blank(g.state, g.refs.card!);
    expect(stats(g.state, g.refs.ally!)).toEqual({ power: d.power, hp: d.hp });
  });

test('Patrolling V-wing draws exactly one card when played, including the TWI reprint', () => {
  const g = scenario(board('patrolling-v-wing', true)),
    top = g.state.players.alice!.deck[0]!;
  const s = play(g.state, g.refs.card!);
  expect(s.players.alice!.hand).toEqual([top]);
  expect(s.players.alice!.deck).toHaveLength(11);
});

for (const [card, ally, enemy, count, optional] of [
  ['wing-leader', ids.marine, ids.marine, 2, false],
  ['mandalorian-warrior', 'clan-wren-rescuer', 'clan-wren-rescuer', 1, true],
  ['outland-tie-vanguard', ids.marine, ids.trooper, 1, true],
] as const)
  test(`${card}: Experience target restrictions and optionality follow the printed text`, () => {
    const p = board(card, true);
    p.players[0].ground = [{ card: ally, ref: 'ally' }];
    p.players[1].ground = [
      { card: enemy, ref: 'enemy' },
      { card: ids.consular, ref: 'wrong' },
    ];
    const g = scenario(p),
      pending = play(g.state, g.refs.card!);
    expect(targets(pending)).toContain(g.refs.ally!);
    expect(targets(pending)).not.toContain(g.refs.card!);
    expect(targets(pending)).not.toContain(g.refs.wrong!);
    expect(targets(pending).includes(g.refs.enemy!)).toBe(card !== 'wing-leader');
    expect(pending.execution.decision!.options.some(o => o.intent.kind === 'decline-effect')).toBe(
      optional,
    );
    expect(tokens(target(pending, g.refs.ally!), g.refs.ally!)).toBe(count);
    if (optional) expect(tokens(step(pending, 'decline-effect'), g.refs.ally!)).toBe(0);
  });

test('Follower of the Way and Protector of the Throne gain their bonuses from any upgrade and lose them when it leaves', () => {
  for (const card of ['follower-of-the-way', 'protector-of-the-throne']) {
    const p = board(card);
    p.attachments = [{ card: 'shield', unit: 'card', ref: 'upgrade' }];
    const g = scenario(p),
      d = unit(card);
    if (card === 'follower-of-the-way')
      expect(stats(g.state, g.refs.card!)).toEqual({ power: d.power + 1, hp: d.hp + 1 });
    else
      expect(effectiveAbilities(g.state, g.state.cards[g.refs.card!]!).keywords).toContain(
        'Sentinel',
      );
    const pending = effects(g.state, [{ kind: 'defeat-upgrade', optional: false }]);
    const s = target(pending, g.refs.upgrade!);
    expect(stats(s, g.refs.card!)).toEqual({ power: d.power, hp: d.hp });
    expect(effectiveAbilities(s, s.cards[g.refs.card!]!).keywords).not.toContain('Sentinel');
  }
});

test('Gamorrean Retainer needs another friendly Command unit, including a deployed leader', () => {
  for (const support of ['none', 'enemy', 'friendly', 'leader']) {
    const p = board('gamorrean-retainer');
    if (support === 'friendly') p.players[0].ground!.push({ card: ids.marine, ref: 'support' });
    if (support === 'enemy') p.players[1].ground = [{ card: ids.marine }];
    if (support === 'leader')
      p.players[0].leader = { card: 'grand-moff-tarkin--oversector-governor', deployedAs: 'unit' };
    const g = scenario(p);
    expect(
      effectiveAbilities(g.state, g.state.cards[g.refs.card!]!).keywords!.includes('Sentinel'),
    ).toBe(support === 'friendly' || support === 'leader');
    if (support === 'friendly') {
      const s = defeat(g.state, g.refs.support!);
      expect(effectiveAbilities(s, s.cards[g.refs.card!]!).keywords).not.toContain('Sentinel');
    }
  }
});

test('Privateer Scyk gains Shielded only with another friendly Cunning unit at entry', () => {
  for (const support of ['none', 'enemy', 'friendly']) {
    const p = board('privateer-scyk', true);
    if (support === 'friendly') p.players[0].ground = [{ card: 'crafty-smuggler', ref: 'support' }];
    if (support === 'enemy') p.players[1].ground = [{ card: 'crafty-smuggler' }];
    const g = scenario(p);
    let s = play(g.state, g.refs.card!);
    expect(tokens(s, g.refs.card!, 'shield')).toBe(support === 'friendly' ? 1 : 0);
    if (support === 'friendly') {
      s = defeat(s, g.refs.support!);
      expect(tokens(s, g.refs.card!, 'shield')).toBe(1);
      expect(effectiveAbilities(s, s.cards[g.refs.card!]!).keywords).not.toContain('Shielded');
    }
  }
});

test('Daring Raid may damage either base or a unit, and Shields prevent the full damage', () => {
  const p = board('daring-raid', true);
  p.players[1].ground = [{ card: ids.marine, ref: 'enemy' }];
  p.attachments = [{ card: 'shield', unit: 'enemy', ref: 'shield' }];
  const g = scenario(p),
    pending = play(g.state, g.refs.card!);
  expect(damage(target(pending, pending.players.alice!.base), 'alice')).toBe(2);
  expect(damage(target(pending, pending.players.bob!.base))).toBe(2);
  const s = target(pending, g.refs.enemy!);
  expect(s.cards[g.refs.enemy!]!.damage).toBe(0);
  expect(tokens(s, g.refs.enemy!, 'shield')).toBe(0);
});

for (const card of ['rival-s-fall', 'fell-the-dragon'])
  test(`${card}: defeat uses live power and the printed leader restriction`, () => {
    const p = board(card, true);
    p.players[1].leader.deployedAs = 'unit';
    p.players[1].ground = [
      { card: ids.marine, ref: 'boosted' },
      { card: ids.marine, ref: 'small' },
    ];
    p.attachments = [
      { card: 'experience', unit: 'boosted' },
      { card: 'experience', unit: 'boosted' },
    ];
    const g = scenario(p),
      pending = play(g.state, g.refs.card!);
    expect(targets(pending)).toContain(g.refs.boosted!);
    expect(targets(pending).includes(g.refs.small!)).toBe(card === 'rival-s-fall');
    expect(targets(pending).includes(pending.players.bob!.leader)).toBe(card === 'rival-s-fall');
    expect(target(pending, g.refs.boosted!).cards[g.refs.boosted!]!.zone).toBe('discard');
  });

test('Rhokai Gunship requires a damage target after defeat and can damage either base', () => {
  const g = scenario(board('rhokai-gunship'));
  const pending = defeat(g.state, g.refs.card!);
  expect(pending.cards[g.refs.card!]!.zone).toBe('discard');
  expect(pending.execution.decision!.options.some(o => o.intent.kind === 'decline-effect')).toBe(
    false,
  );
  expect(damage(target(pending, pending.players.bob!.base))).toBe(1);
  expect(damage(target(pending, pending.players.alice!.base), 'alice')).toBe(1);
});

test('Wookiee Warrior draws only with another friendly Wookiee, not itself or an enemy', () => {
  for (const support of ['none', 'enemy', 'friendly']) {
    const p = board('wookiee-warrior', true);
    if (support !== 'none')
      p.players[support === 'friendly' ? 0 : 1].ground = [{ card: 'wroshyr-tree-tender' }];
    const g = scenario(p),
      s = play(g.state, g.refs.card!);
    expect(s.players.alice!.hand).toHaveLength(support === 'friendly' ? 1 : 0);
  }
});

for (const [card, power, hp] of [
  ['332nd-stalwart', 1, 1],
  ['41st-elite-corps', 0, 3],
  ['clone-heavy-gunner', 2, 0],
  ['echo--valiant-arc-trooper', 2, 2],
] as const)
  test(`${card}: Coordinate counts self, tokens and deployed leaders and updates after a defeat`, () => {
    const p = board(card),
      d = unit(card);
    p.players[0].ground!.push({ card: 'battle-droid', ref: 'token' });
    p.players[0].leader.deployedAs = 'unit';
    p.players[1].ground = [{ card: ids.marine }];
    const g = scenario(p);
    expect(stats(g.state, g.refs.card!)).toEqual({ power: d.power + power, hp: d.hp + hp });
    const s = defeat(g.state, g.refs.token!);
    expect(stats(s, g.refs.card!)).toEqual({ power: d.power, hp: d.hp });
    blank(g.state, g.refs.card!);
    expect(stats(g.state, g.refs.card!)).toEqual({ power: d.power, hp: d.hp });
  });

for (const [card, token, count] of [
  ['batch-brothers', 'clone-trooper', 1],
  ['captain-rex--lead-by-example', 'clone-trooper', 2],
  ['battle-droid-escort', 'battle-droid', 1],
  ['droid-deployment', 'battle-droid', 2],
  ['drop-in', 'clone-trooper', 2],
] as const)
  test(`${card}: creates the printed number of exhausted tokens under its controller`, () => {
    const g = scenario(board(card, true)),
      s = play(g.state, g.refs.card!);
    const created = Object.values(s.cards).filter(c => c.cardId === token && c.zone === 'ground');
    expect(created).toHaveLength(count);
    expect(created.every(c => c.controller === 'alice' && c.owner === 'alice' && c.exhausted)).toBe(
      true,
    );
  });

for (const card of ['battle-droid-escort', 'confederate-courier', 'wartime-trade-official'])
  test(`${card}: creates one Battle Droid after defeat without inheriting its attachments`, () => {
    const p = board(card);
    p.attachments = [{ card: 'experience', unit: 'card' }];
    const g = scenario(p),
      s = defeat(g.state, g.refs.card!);
    const created = Object.values(s.cards).filter(
      c => c.cardId === 'battle-droid' && c.zone === 'ground',
    );
    expect(created).toHaveLength(1);
    expect(s.cards[g.refs.card!]!.zone).toBe('discard');
    expect(created[0]!.exhausted).toBe(true);
    expect(attachedUpgrades(s, created[0]!)).toHaveLength(0);
  });

test('Blood Sport damages both sides and deployed leaders simultaneously, leaving space and bases untouched', () => {
  const p = board('blood-sport', true);
  p.players[0].ground = [{ card: 'battle-droid-escort', ref: 'escort' }];
  p.players[0].space = [{ card: ids.fighter, ref: 'ship' }];
  p.players[1].ground = [{ card: ids.marine, ref: 'enemy' }];
  p.players[1].leader.deployedAs = 'unit';
  p.attachments = [
    { card: 'shield', unit: 'enemy', ref: 'shield' },
    { card: 'shield', unit: 'enemy' },
  ];
  const g = scenario(p),
    pending = play(g.state, g.refs.card!);
  resume(
    pending,
    choose(pending, i => i.kind === 'target' && i.card === g.refs.shield),
  );
  const s = target(pending, g.refs.shield!);
  expect(s.cards[s.players.bob!.leader]!.damage).toBe(2);
  expect(s.cards[g.refs.ship!]!.damage).toBe(0);
  expect(s.cards[g.refs.enemy!]!.damage).toBe(0);
  expect(damage(s)).toBe(0);
  expect(damage(s, 'alice')).toBe(0);
  expect(s.cards[g.refs.escort!]!.zone).toBe('discard');
  const created = Object.values(s.cards).filter(
    c => c.cardId === 'battle-droid' && c.zone === 'ground',
  );
  expect(created).toHaveLength(1);
  expect(created[0]!.damage).toBe(0);
});

test('Wookiee Warrior checks for another Wookiee after an earlier trigger completes its attack', () => {
  const p = board('wookiee-warrior', true);
  p.players[0].ground = [
    { card: 'luminara-unduli--besieged-general', ref: 'luminara' },
    { card: 'wroshyr-tree-tender', damage: 1, ref: 'wookiee' },
  ];
  p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
  const g = scenario(p);
  // Keep the real simultaneous trigger choice so Luminara can attack first.
  let s = advance(
    g.state,
    choose(g.state, i => i.kind === 'play' && i.card === g.refs.card),
  ).state;
  const trigger = s.execution.frames
    .flatMap(f => (f.kind === 'trigger-batch' ? f.triggers : []))
    .find(t => t.source.instanceId === g.refs.luminara)!;
  s = step(s, i => i.kind === 'trigger' && i.triggerId === trigger.id);
  s = target(s, g.refs.wookiee!);
  s = attack(s, g.refs.wookiee!, g.refs.enemy!);
  expect(s.cards[g.refs.wookiee!]!.zone).toBe('discard');
  expect(s.players.alice!.hand).toHaveLength(0);
});

test('Strategic Analysis draws three cards in order and handles a short deck', () => {
  for (const count of [1, 3, 5]) {
    const p = board('strategic-analysis', true);
    p.players[0].deck = p.players[0].deck!.slice(0, count);
    const g = scenario(p),
      top = g.state.players.alice!.deck.slice(0, 3),
      s = play(g.state, g.refs.card!);
    expect(s.players.alice!.hand).toEqual(top);
    expect(s.players.alice!.deck).toHaveLength(Math.max(0, count - 3));
    expect(damage(s, 'alice')).toBe(Math.max(0, 3 - count) * 3);
  }
});

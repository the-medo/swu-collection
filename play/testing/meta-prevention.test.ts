import { expect, test } from 'bun:test';
import type { CardEffect, UnitOperation } from '../cards/definition.ts';
import { advance, settle } from '../engine/advance.ts';
import { attachedUpgrades, unitStats } from '../engine/attachments.ts';
import { decodeState, encodeState } from '../engine/checkpoint.ts';
import { effectiveAbilities } from '../engine/effective-abilities.ts';
import { modifyUnit } from '../engine/lasting.ts';
import type { GameState, Intent } from '../engine/model.ts';
import { effectFrames } from '../engine/triggers.ts';
import { Projector } from '../projection/projector.ts';
import { scenario } from './scenario.ts';
import { choose, ids, position } from './helpers.ts';
const queen = 'queen-amidala--championing-her-people',
  chewie = 'chewbacca--faithful-first-mate',
  rey = 'rey--skywalker',
  mando = 'the-mandalorian--devoted-rescuer',
  corsair = 'gorian-shard-s-corsair--pirate-warship',
  boba = 'boba-fett--feared-bounty-hunter';
const resources = () => Array.from({ length: 16 }, () => ({ card: ids.marine }));
const step = (
  s: GameState,
  i: Intent['kind'] | ((i: Intent) => boolean),
  selections: string[] = [],
) => advance(s, choose(s, i, selections)).state;
const target = (s: GameState, id: string) => step(s, i => i.kind === 'target' && i.card === id);
const play = (s: GameState, id: string) =>
  step(s, i => i.kind === 'play' && i.card === id && !i.target);
const attack = (s: GameState, id: string, to: string) =>
  step(s, i => i.kind === 'attack' && i.attacker === id && i.defender === to);
function effects(s: GameState, list: CardEffect[], actor = 'alice', source?: string) {
  const state = structuredClone(s);
  state.execution.decision = null;
  state.execution.frames = [
    ...effectFrames(actor, state.cards[source ?? state.players[actor]!.leader]!, list),
    { kind: 'flush-triggers' },
    { kind: 'action' },
  ];
  settle(state);
  return state;
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
  expect(child.stderr.toString()).toBe('');
  expect(child.exitCode).toBe(0);
  expect(JSON.parse(child.stdout.toString())).toEqual(advance(s, i));
}
const damage = (amount: number): CardEffect => ({
  kind: 'damage-units',
  filter: { controller: 'enemy' },
  amount,
});
const selected = (operation: UnitOperation): CardEffect => ({
  kind: 'select-unit',
  filter: { controller: 'enemy' },
  bind: 'unit',
  optional: false,
  effects: [{ kind: 'on-unit', target: 'unit', operation }],
});

test('Amidala creates two Spies and can sacrifice only another friendly unit sharing a trait', () => {
  const p = position();
  p.players[0].hand = [{ card: queen, ref: 'queen' }];
  p.players[0].resources = resources();
  p.players[0].space = [{ card: 'n-1-starfighter', ref: 'naboo' }];
  p.players[0].ground = [{ card: ids.marine, ref: 'marine' }];
  p.players[1].space = [{ card: 'n-1-starfighter', ref: 'enemy' }];
  const { state, refs } = scenario(p);
  const played = play(state, refs.queen!);
  expect(played.ground.map(id => played.cards[id]!.cardId).filter(id => id === 'spy')).toHaveLength(
    2,
  );
  const pending = effects(
    played,
    [{ kind: 'damage-units', amount: 3, filter: { name: 'Queen Amidala' } }],
    'bob',
  );
  const options = pending.execution.decision!.options.map(o => o.intent);
  expect(options).toContainEqual({ kind: 'target', card: refs.naboo! });
  expect(options).not.toContainEqual({ kind: 'target', card: refs.marine! });
  expect(options).not.toContainEqual({ kind: 'target', card: refs.enemy! });
  expect(options).not.toContainEqual({ kind: 'target', card: refs.queen! });
  resume(
    pending,
    choose(pending, i => i.kind === 'target' && i.card === refs.naboo),
  );
  const saved = target(pending, refs.naboo!);
  expect(saved.cards[refs.queen!]!.damage).toBe(0);
  expect(saved.cards[refs.naboo!]!.zone).toBe('discard');
  expect(saved.cards[refs.marine!]!.zone).toBe('ground');
  const declined = step(pending, 'decline-effect');
  expect(declined.cards[refs.queen!]!.zone).toBe('discard');
  expect(declined.cards[refs.naboo!]!.zone).toBe('space');
});

test('Amidala chooses her own Shield or a trait sacrifice, but cannot decline mandatory prevention', () => {
  const p = position();
  p.players[1].ground = [{ card: queen, ref: 'queen' }];
  p.players[1].space = [{ card: 'n-1-starfighter', ref: 'friend' }];
  p.attachments = [{ card: 'shield', unit: 'queen', ref: 'shield' }];
  const { state, refs } = scenario(p);
  const pending = effects(state, [
    { kind: 'damage-units', amount: 3, filter: { name: 'Queen Amidala' } },
  ]);
  expect(pending.execution.decision!.options.map(o => o.intent.kind)).toEqual(['target', 'target']);
  const shield = target(pending, refs.shield!);
  expect(shield.cards[refs.friend!]!.zone).toBe('space');
  expect(shield.cards[refs.shield!]!.zone).toBe('set-aside');
  const sacrifice = target(pending, refs.friend!);
  expect(sacrifice.cards[refs.shield!]!.zone).toBe('ground');
  expect(sacrifice.cards[refs.friend!]!.zone).toBe('discard');
});

test('Mandalorian enters Shielded, can protect another friendly unit and can decline that prevention', () => {
  const p = position();
  p.players[0].hand = [{ card: mando, ref: 'mando' }];
  p.players[0].resources = resources();
  p.players[0].ground = [{ card: ids.marine, ref: 'friend' }];
  const { state, refs } = scenario(p);
  const played = play(state, refs.mando!);
  const shield = attachedUpgrades(played, played.cards[refs.mando!]!)[0]!;
  const pending = effects(
    played,
    [
      {
        kind: 'damage-units',
        amount: 2,
        filter: { name: 'Battlefield Marine', controller: 'enemy' },
      },
    ],
    'bob',
  );
  expect(pending.execution.decision!.playerId).toBe('alice');
  const view = new Projector(pending.gameId, {
    role: 'player',
    playerId: 'alice',
  }).project(pending);
  expect(view.decision?.source?.cardId).toBe(mando);
  expect(view.decision?.presentation).toEqual({
    title: 'Prevent damage',
    text: 'Battlefield Marine would take 2 damage. Use a replacement effect, or skip it.',
  });
  resume(
    pending,
    choose(pending, i => i.kind === 'target' && i.card === shield.instanceId),
  );
  const saved = target(pending, shield.instanceId);
  expect(saved.cards[refs.friend!]!.damage).toBe(0);
  expect(saved.cards[shield.instanceId]!.zone).toBe('set-aside');
  const declined = step(pending, 'decline-effect');
  expect(declined.cards[refs.friend!]!.damage).toBe(2);
  expect(declined.cards[shield.instanceId]!.zone).toBe('ground');
});

test('One exact Shield cannot protect two simultaneous targets, and reserved remote prevention recovers', () => {
  const p = position();
  p.players[1].ground = [
    { card: ids.marine, ref: 'one' },
    { card: ids.marine, ref: 'two' },
    { card: mando, ref: 'mando' },
  ];
  p.attachments = [
    { card: 'shield', unit: 'mando', ref: 's1' },
    { card: 'shield', unit: 'mando', ref: 's2' },
  ];
  const { state, refs } = scenario(p);
  const pending = effects(state, [
    { kind: 'damage-units', amount: 2, filter: { name: 'Battlefield Marine' } },
  ]);
  const second = target(pending, refs.s1!);
  expect(second.execution.decision!.options.map(o => o.intent)).toEqual([
    { kind: 'target', card: refs.s2! },
    { kind: 'decline-effect' },
  ]);
  expect(second.cards[refs.s1!]!.zone).toBe('ground');
  expect(decodeState(encodeState(second))).toEqual(second);
  resume(
    second,
    choose(second, i => i.kind === 'target' && i.card === refs.s2),
  );
  const done = target(second, refs.s2!);
  expect(done.cards[refs.one!]!.damage).toBe(0);
  expect(done.cards[refs.two!]!.damage).toBe(0);
  const spent = step(second, 'decline-effect');
  expect(spent.cards[refs.two!]!.damage).toBe(2);
  expect(spent.cards[refs.s2!]!.zone).toBe('ground');
  const forged = structuredClone(second);
  const f = forged.execution.frames[0];
  if (f?.kind !== 'damage') throw new Error('Expected damage');
  f.assignments[0]!.prevention!.source.instanceId = refs.one!;
  expect(() => decodeState(encodeState(forged))).toThrow('replacement');
});

test('Amidala sacrifice and simultaneous lethal damage preserve all defeat observers', () => {
  const p = position();
  p.players[1].ground = [
    { card: queen, ref: 'queen' },
    { card: 'rancor-keeper', ref: 'keeper' },
  ];
  p.players[1].space = [{ card: 'n-1-starfighter', ref: 'naboo' }];
  const { state, refs } = scenario(p);
  const pending = effects(state, [damage(6)]);
  const done = target(pending, refs.naboo!);
  expect(done.cards[refs.queen!]!.zone).toBe('ground');
  expect(done.cards[refs.queen!]!.damage).toBe(0);
  expect(done.cards[refs.naboo!]!.zone).toBe('discard');
  expect(done.cards[refs.keeper!]!.zone).toBe('discard');
  expect(done.execution.frames[0]!.kind).toBe('action');
});

test('Protection from enemy defeat is face-aware, permits friendly defeat and does not block lethal damage', () => {
  for (const card of [chewie, rey]) {
    const p = position();
    p.players[1].ground = [{ card, ref: 'protected' }];
    const { state, refs } = scenario(p);
    const direct = target(
      effects(state, [{ kind: 'defeat-unit', filter: {}, optional: false }]),
      refs.protected!,
    );
    expect(direct.cards[refs.protected!]!.zone).toBe('ground');
    const own = effects(state, [{ kind: 'defeat-units', filter: {} }], 'bob');
    expect(own.cards[refs.protected!]!.zone).toBe('discard');
    const lethal = effects(state, [damage(10)]);
    expect(lethal.cards[refs.protected!]!.zone).toBe('discard');
    const reduced = effects(state, [
      {
        kind: 'modify-units',
        filter: { controller: 'enemy' },
        operation: { kind: 'modify', power: 0, hp: -10, duration: 'phase' },
      },
    ]);
    expect(reduced.cards[refs.protected!]!.zone).toBe('discard');
  }
});

test('Chewbacca blocks enemy return-to-hand while Rey can return, and Rey blocks control transfer', () => {
  for (const card of [chewie, rey]) {
    const p = position();
    p.players[1].ground = [{ card, ref: 'unit' }];
    const { state, refs } = scenario(p);
    const done = target(effects(state, [selected({ kind: 'return-to-hand' })]), refs.unit!);
    expect(done.cards[refs.unit!]!.zone).toBe(card === chewie ? 'ground' : 'hand');
    const taken = target(
      effects(state, [selected({ kind: 'take-control', player: 'self' })]),
      refs.unit!,
    );
    expect(taken.cards[refs.unit!]!.controller).toBe(card === rey ? 'bob' : 'alice');
  }
});

test('Chewbacca grants both protections to his Vehicle as a Pilot, and ability loss removes protection', () => {
  const p = position();
  p.players[0].hand = [{ card: chewie, ref: 'pilot' }];
  p.players[0].resources = resources();
  p.players[0].space = [{ card: ids.fighter, ref: 'ship' }];
  const { state, refs } = scenario(p);
  const input = choose(
    state,
    i => i.kind === 'play' && i.card === refs.pilot && i.target === refs.ship,
  );
  resume(state, input);
  const piloted = advance(state, input).state;
  expect(unitStats(piloted, piloted.cards[refs.ship!]!)).toEqual({ power: 5, hp: 4 });
  expect(
    effectiveAbilities(piloted, piloted.cards[refs.pilot!]!).enemyAbilityImmunity ?? [],
  ).toHaveLength(0);
  const attempted = target(
    effects(piloted, [{ kind: 'defeat-unit', filter: {}, optional: false }], 'bob'),
    refs.ship!,
  );
  expect(attempted.cards[refs.ship!]!.zone).toBe('space');
  const returned = target(
    effects(piloted, [selected({ kind: 'return-to-hand' })], 'bob'),
    refs.ship!,
  );
  expect(returned.cards[refs.ship!]!.zone).toBe('space');
  const blank = structuredClone(piloted);
  modifyUnit(blank, blank.cards[blank.players.bob!.leader]!, blank.cards[refs.ship!]!, {
    kind: 'modify',
    power: 0,
    hp: 0,
    duration: 'phase',
    loseAbilities: true,
  });
  const defeated = target(
    effects(blank, [{ kind: 'defeat-unit', filter: {}, optional: false }], 'bob'),
    refs.ship!,
  );
  expect(defeated.cards[refs.ship!]!.zone).toBe('discard');
  expect(defeated.cards[refs.pilot!]!.zone).toBe('discard');
});

test('Blocked defeat does not satisfy an if-you-do continuation or count as a defeated enemy', () => {
  const p = position();
  p.players[1].ground = [{ card: rey, ref: 'rey' }];
  const { state, refs } = scenario(p);
  const pending = effects(state, [
    {
      kind: 'select-unit',
      bind: 'chosen',
      filter: {},
      optional: false,
      effects: [
        {
          kind: 'on-unit',
          target: 'chosen',
          operation: { kind: 'defeat' },
          ifYouDo: [{ kind: 'draw-cards', amount: 1 }],
        },
      ],
    },
  ]);
  const done = target(pending, refs.rey!);
  expect(done.players.alice!.hand).toHaveLength(0);
  const sweep = effects(state, [{ kind: 'defeat-units', filter: {}, damageEnemyBase: 2 }]);
  expect(sweep.cards[sweep.players.bob!.base]!.damage).toBe(0);
});

test('Corsair bypasses Shields and optional prevention for friendly Underworld damage on play and attack', () => {
  const p = position();
  p.players[0].hand = [{ card: corsair, ref: 'corsair' }];
  p.players[0].resources = resources();
  p.players[1].ground = [{ card: mando, ref: 'mando' }];
  p.attachments = [{ card: 'shield', unit: 'mando', ref: 'shield' }];
  const { state, refs } = scenario(p);
  const played = target(play(state, refs.corsair!), refs.mando!);
  expect(played.cards[refs.mando!]!.damage).toBe(2);
  expect(played.cards[refs.shield!]!.zone).toBe('ground');
  played.cards[refs.corsair!]!.exhausted = false;
  played.activePlayer = 'alice';
  played.execution.decision = null;
  settle(played);
  const done = target(attack(played, refs.corsair!, played.players.bob!.base), refs.mando!);
  expect(done.cards[refs.mando!]!.zone).toBe('discard');
  expect(done.cards[done.players.bob!.base]!.damage).toBe(6);
});

test('Corsair applies to combat and divided damage, but not unrelated friendly or enemy sources', () => {
  const p = position();
  p.players[0].space = [
    { card: corsair, ref: 'corsair' },
    { card: 'pirate-snub-fighter', ref: 'pirate' },
  ];
  p.players[1].space = [{ card: ids.consular, ref: 'target', movedArena: true }];
  p.attachments = [{ card: 'shield', unit: 'target', ref: 'shield' }];
  const { state, refs } = scenario(p);
  const hit = attack(state, refs.pirate!, refs.target!);
  expect(hit.cards[refs.shield!]!.zone).toBe('space');
  expect(hit.cards[refs.target!]!.damage).toBeGreaterThan(0);
  const normal = effects(state, [
    { kind: 'damage-units', filter: { controller: 'enemy' }, amount: 1 },
  ]);
  expect(normal.cards[refs.shield!]!.zone).toBe('set-aside');
  expect(normal.cards[refs.target!]!.damage).toBe(0);
  const pending = effects(
    state,
    [{ kind: 'divide-damage', filter: { controller: 'enemy' }, amount: 1, optional: false }],
    'alice',
    refs.corsair!,
  );
  const split = step(pending, 'accept-effect', [refs.target!]);
  expect(split.cards[refs.shield!]!.zone).toBe('space');
  expect(split.cards[refs.target!]!.damage).toBe(1);
});

test('Boba enters Shielded as a unit and uses only his upgrade ability when piloting', () => {
  const p = position();
  p.players[0].hand = [{ card: boba, ref: 'boba' }];
  p.players[0].resources = resources();
  p.players[0].space = [{ card: 'emissary-s-sheathipede', ref: 'ship' }];
  p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
  const { state, refs } = scenario(p);
  const unit = play(state, refs.boba!);
  expect(attachedUpgrades(unit, unit.cards[refs.boba!]!).map(c => c.cardId)).toEqual(['shield']);
  const pilot = step(
    state,
    i => i.kind === 'play' && i.card === refs.boba && i.target === refs.ship,
  );
  expect(attachedUpgrades(pilot, pilot.cards[refs.ship!]!).map(c => c.cardId)).toEqual([boba]);
  for (const amount of [1, 2]) {
    const mode = step(
      pilot,
      i => i.kind === 'choose-mode' && i.mode === (amount === 1 ? 'one' : 'two'),
    );
    resume(
      mode,
      choose(mode, i => i.kind === 'target' && i.card === refs.enemy),
    );
    const done = target(mode, refs.enemy!);
    expect(done.cards[refs.enemy!]!.damage).toBe(amount);
  }
  const skipped = step(step(pilot, 'choose-mode'), 'decline-effect');
  expect(skipped.cards[refs.enemy!]!.damage).toBe(0);
});

test('Boba on a non-Transport offers only one damage, and protection choices expose no hidden cards', () => {
  const p = position();
  p.players[0].hand = [
    { card: boba, ref: 'boba' },
    { card: ids.marine, ref: 'secret' },
  ];
  p.players[0].resources = resources();
  p.players[0].space = [{ card: ids.fighter, ref: 'ship' }];
  p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
  const { state, refs } = scenario(p);
  const pilot = step(
    state,
    i => i.kind === 'play' && i.card === refs.boba && i.target === refs.ship,
  );
  expect(pilot.execution.decision!.options.some(o => o.intent.kind === 'choose-mode')).toBe(false);
  expect(target(pilot, refs.enemy!).cards[refs.enemy!]!.damage).toBe(1);
  const spectator = new Projector(pilot.gameId, { role: 'spectator' }, 'p'.repeat(32)).project(
    pilot,
  );
  expect(spectator.decision).toBeNull();
  expect(JSON.stringify(spectator)).not.toContain(refs.secret!);
});

test('Unpreventable indirect damage and zero damage never offer sacrifices or consume Shields', () => {
  const p = position();
  p.players[1].ground = [
    { card: queen, ref: 'queen' },
    { card: mando, ref: 'mando' },
  ];
  p.players[1].space = [{ card: 'n-1-starfighter', ref: 'naboo' }];
  p.attachments = [{ card: 'shield', unit: 'mando', ref: 'shield' }];
  const { state, refs } = scenario(p);
  const zero = effects(state, [damage(0)]);
  expect(zero.execution.frames[0]!.kind).toBe('action');
  const pending = effects(state, [{ kind: 'indirect-damage', recipient: 'enemy', amount: 2 }]);
  const done = step(pending, 'accept-effect', [refs.queen!, refs.queen!]);
  expect(done.cards[refs.queen!]!.damage).toBe(2);
  expect(done.cards[refs.naboo!]!.zone).toBe('space');
  expect(done.cards[refs.shield!]!.zone).toBe('ground');
  expect(done.execution.frames[0]!.kind).toBe('action');
});

test('Losing prevention abilities removes the optional choices without suppressing an attached Shield', () => {
  const p = position();
  p.players[1].ground = [
    { card: queen, ref: 'queen' },
    { card: mando, ref: 'mando' },
  ];
  p.players[1].space = [{ card: 'n-1-starfighter', ref: 'naboo' }];
  p.attachments = [{ card: 'shield', unit: 'mando', ref: 'shield' }];
  const { state, refs } = scenario(p);
  for (const id of [refs.queen!, refs.mando!])
    modifyUnit(state, state.cards[state.players.alice!.leader]!, state.cards[id]!, {
      kind: 'modify',
      power: 0,
      hp: 0,
      duration: 'phase',
      loseAbilities: true,
    });
  const done = effects(state, [damage(1)]);
  expect(done.execution.frames[0]!.kind).toBe('action');
  expect(done.cards[refs.queen!]!.damage).toBe(1);
  expect(done.cards[refs.naboo!]!.damage).toBe(1);
  expect(done.cards[refs.mando!]!.damage).toBe(0);
  expect(done.cards[refs.shield!]!.zone).toBe('set-aside');
});

test('A remote Shield prevents Overwhelm excess while the defender still deals combat damage', () => {
  const p = position();
  p.players[0].ground = [{ card: ids.consular, ref: 'attacker' }];
  p.players[1].ground = [
    { card: queen, ref: 'queen' },
    { card: mando, ref: 'mando' },
  ];
  p.attachments = [{ card: 'shield', unit: 'mando', ref: 'shield' }];
  const { state, refs } = scenario(p);
  modifyUnit(state, state.cards[refs.attacker!]!, state.cards[refs.attacker!]!, {
    kind: 'modify',
    power: 3,
    hp: 0,
    duration: 'phase',
    abilities: { keywords: ['Overwhelm'] },
  });
  const pending = attack(state, refs.attacker!, refs.queen!);
  const done = target(pending, refs.shield!);
  expect(done.cards[done.players.bob!.base]!.damage).toBe(0);
  expect(done.cards[refs.queen!]!.damage).toBe(0);
  expect(done.cards[refs.attacker!]!.damage).toBe(5);
});

test('Corsair ability loss restores ordinary prevention and does not make opposing Underworld damage unpreventable', () => {
  const p = position();
  p.players[0].space = [{ card: corsair, ref: 'corsair' }];
  p.players[0].ground = [{ card: ids.consular, ref: 'own' }];
  p.players[1].space = [{ card: 'pirate-snub-fighter', ref: 'enemy' }];
  p.players[1].ground = [{ card: ids.consular, ref: 'target' }];
  p.attachments = [
    { card: 'shield', unit: 'target', ref: 'shield' },
    { card: 'shield', unit: 'own', ref: 'own-shield' },
  ];
  const { state, refs } = scenario(p);
  const enemy = effects(
    state,
    [{ kind: 'damage-units', filter: { controller: 'enemy', arena: 'ground' }, amount: 1 }],
    'bob',
    refs.enemy!,
  );
  expect(enemy.cards[refs.own!]!.damage).toBe(0);
  expect(enemy.cards[refs['own-shield']!]!.zone).toBe('set-aside');
  modifyUnit(state, state.cards[state.players.bob!.leader]!, state.cards[refs.corsair!]!, {
    kind: 'modify',
    power: 0,
    hp: 0,
    duration: 'phase',
    loseAbilities: true,
  });
  const blank = effects(
    state,
    [{ kind: 'damage-units', filter: { controller: 'enemy', arena: 'ground' }, amount: 1 }],
    'alice',
    refs.corsair!,
  );
  expect(blank.cards[refs.target!]!.damage).toBe(0);
  expect(blank.cards[refs.shield!]!.zone).toBe('set-aside');
});

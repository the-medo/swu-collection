import { expect, test } from 'bun:test';
import type { CardEffect } from '../cards/definition.ts';
import { advance, settle } from '../engine/advance.ts';
import { attachedUpgrades, isUnit, unitStats } from '../engine/attachments.ts';
import { unitIsLeader } from '../engine/attributes.ts';
import { encodeState, decodeState } from '../engine/checkpoint.ts';
import { effectiveAbilities } from '../engine/effective-abilities.ts';
import { modifyUnit } from '../engine/lasting.ts';
import type { GameState, Intent } from '../engine/model.ts';
import { isUpgrade, exhaustibleLeaders } from '../engine/roles.ts';
import { effectFrames } from '../engine/triggers.ts';
import { Projector } from '../projection/projector.ts';
import { gameViewSchema } from '../view/parse.ts';
import { scenario } from './scenario.ts';
import { choose, ids, position } from './helpers.ts';
const boba = 'boba-fett--any-methods-necessary',
  vader = 'darth-vader--victor-squadron-leader',
  luke = 'luke-skywalker--hero-of-yavin';
const resources = (n = 6) => Array.from({ length: n }, () => ({ card: ids.marine }));
const step = (
  s: GameState,
  i: Intent['kind'] | ((i: Intent) => boolean),
  selections: string[] = [],
) => advance(s, choose(s, i, selections)).state;
const target = (s: GameState, id: string) => step(s, i => i.kind === 'target' && i.card === id);
const use = (s: GameState, id = 'deploy') =>
  step(s, i => i.kind === 'use-ability' && i.abilityId === id);
const attack = (s: GameState, id: string, to: string) =>
  step(s, i => i.kind === 'attack' && i.attacker === id && i.defender === to);
function effects(s: GameState, list: CardEffect[], actor = 'alice') {
  const state = structuredClone(s);
  state.execution.decision = null;
  state.execution.frames = [
    ...effectFrames(actor, state.cards[state.players[actor]!.leader]!, list),
    { kind: 'flush-triggers' },
    { kind: 'action' },
  ];
  settle(state);
  return state;
}
function unitEffect(
  name: string,
  operation: Extract<CardEffect, { kind: 'on-unit' }>['operation'],
): CardEffect {
  return {
    kind: 'select-unit',
    filter: { name },
    bind: 'unit',
    optional: false,
    allowMissing: true,
    effects: [{ kind: 'on-unit', target: 'unit', operation }],
  };
}
function resume(s: GameState, input: ReturnType<typeof choose>) {
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
function pilots(card: string) {
  const p = position();
  p.players[0].leader = { card, ref: 'leader' };
  p.players[0].resources = resources();
  p.players[0].space = [
    { card: ids.fighter, ref: 'fighter' },
    { card: 'shuttle-st-149--under-krennic-s-authority', ref: 'occupied' },
  ];
  p.players[0].ground = [
    { card: 'skyhopper-canyon-runner', ref: 'ground' },
    { card: ids.marine, ref: 'character' },
  ];
  p.players[1].space = [{ card: ids.fighter, ref: 'enemy' }];
  p.attachments = [{ card: 'academy-graduate', unit: 'occupied', owner: 'alice' }];
  return p;
}
function deployed(card: string, host = 'fighter') {
  const p = pilots(card);
  p.players[0].leader = {
    card,
    ref: 'leader',
    deployedAs: 'upgrade',
    attachedTo: host,
    abilityUses: { deploy: 1 },
  };
  return scenario(p);
}

test('Pilot leader deployment offers unit or an exact eligible Vehicle in either arena and recovers before attachment', () => {
  for (const card of [boba, vader, luke]) {
    const p = pilots(card);
    p.players[0].leader.exhausted = true;
    const { state, refs } = scenario(p);
    const pending = use(state);
    expect(pending.cards[refs.leader!]!.abilityUses.deploy).toBe(1);
    expect(pending.execution.decision!.options.map(o => o.intent)).toEqual([
      { kind: 'choose-mode', mode: 'deploy-unit' },
      { kind: 'target', card: refs.ground! },
      { kind: 'target', card: refs.fighter! },
    ]);
    resume(
      pending,
      choose(pending, i => i.kind === 'target' && i.card === refs.fighter),
    );
    let done = target(pending, refs.fighter!);
    if (card === boba) done = step(done, 'accept-effect', []);
    const leader = done.cards[refs.leader!]!,
      host = done.cards[refs.fighter!]!;
    expect(leader).toMatchObject({
      deployedAs: 'upgrade',
      zone: 'space',
      exhausted: false,
      attachedTo: { instanceId: refs.fighter },
      abilityUses: { deploy: 1 },
    });
    expect(isUpgrade(done, leader)).toBe(true);
    expect(isUnit(done, leader)).toBe(false);
    expect(unitIsLeader(done, host)).toBe(true);
    expect(exhaustibleLeaders(done, 'alice')).not.toContain(leader);
    expect(exhaustibleLeaders(done, 'alice')).toContain(host);
    expect(done.players.alice!.resources.every(id => !done.cards[id]!.exhausted)).toBe(true);
    const view = new Projector(done.gameId, { role: 'spectator' }).project(done);
    expect(gameViewSchema.safeParse(view).success).toBe(true);
    expect(view.cards.find(c => c.face?.cardId === card)).toMatchObject({
      deployedAs: 'upgrade',
      face: { kind: 'upgrade', printedKind: 'leader' },
    });
  }
});

test('Pilot leaders retain independent vanilla unit faces and consume the same Epic use in either role', () => {
  for (const card of [boba, vader, luke]) {
    const { state, refs } = scenario(pilots(card));
    const pending = use(state);
    const done = step(pending, i => i.kind === 'choose-mode' && i.mode === 'deploy-unit');
    expect(done.cards[refs.leader!]!).toMatchObject({
      deployedAs: 'unit',
      zone: 'ground',
      exhausted: false,
      abilityUses: { deploy: 1 },
    });
    expect(done.execution.frames[0]!.kind).toBe('action');
    expect(effectiveAbilities(done, done.cards[refs.leader!]!).triggers).toEqual([]);
    expect(done.space.filter(id => done.cards[id]!.cardId === 'tie-fighter')).toHaveLength(0);
  }
});

test('An early pilot Epic can be spent without deployment; no host is needed for its unit option', () => {
  const p = position();
  p.players[0].leader = { card: vader, ref: 'leader' };
  p.players[0].resources = resources(5);
  const early = scenario(p);
  const used = use(early.state);
  expect(used.cards[early.refs.leader!]!).toMatchObject({
    zone: 'base',
    deployedAs: null,
    abilityUses: { deploy: 1 },
  });
  p.players[0].resources = resources();
  const ready = scenario(p);
  expect(use(ready.state).execution.decision!.options.map(o => o.intent)).toEqual([
    { kind: 'choose-mode', mode: 'deploy-unit' },
  ]);
});

test('Vader creates two exhausted TIE tokens only after deploying on an already existing host', () => {
  const { state, refs } = scenario(pilots(vader));
  const done = target(use(state), refs.fighter!);
  const tokens = done.space.map(id => done.cards[id]!).filter(c => c.cardId === 'tie-fighter');
  expect(tokens).toHaveLength(2);
  expect(tokens.every(c => c.exhausted && c.controller === 'alice' && c.attachedTo === null)).toBe(
    true,
  );
  expect(unitStats(done, done.cards[refs.fighter!]!)).toEqual({ power: 7, hp: 6 });
  expect(done.cards[refs.fighter!]!.exhausted).toBe(false);
});

test('Boba divides zero through four simultaneous damage among any units, overallocates HP, and recovers', () => {
  const p = pilots(boba);
  p.players[1].ground = [{ card: ids.marine, ref: 'marine' }];
  const { state, refs } = scenario(p);
  const pending = target(use(state), refs.fighter!);
  expect(pending.execution.decision!.selection).toMatchObject({ min: 0, max: 4 });
  expect(pending.execution.decision!.selection!.cards).not.toContain(refs.leader!);
  expect(pending.execution.decision!.selection!.cards).not.toContain(state.players.bob!.base);
  const choice = choose(pending, 'accept-effect', [
    refs.enemy!,
    refs.enemy!,
    refs.enemy!,
    refs.marine!,
  ]);
  resume(pending, choice);
  const done = advance(pending, choice).state;
  expect(done.cards[refs.enemy!]!.zone).toBe('discard');
  expect(done.cards[refs.marine!]!.damage).toBe(1);
  expect(done.execution.frames[0]!.kind).toBe('action');
  expect(step(pending, 'accept-effect', [refs.marine!]).cards[refs.marine!]!.damage).toBe(1);
  expect(step(pending, 'accept-effect', []).cards[refs.marine!]!.damage).toBe(0);
  expect(() => step(pending, 'accept-effect', Array(5).fill(refs.marine!))).toThrow();
});

test('Pilot defeat or a bounce returns the same leader exhausted with Epic usage retained', () => {
  for (const to of ['discard', 'hand'] as const) {
    const { state, refs } = deployed(boba);
    const pending = effects(
      state,
      [
        {
          kind: 'select-upgrades',
          filter: {},
          min: 1,
          max: 1,
          bind: 'u',
          effects: [{ kind: 'move-upgrades', group: 'u', to }],
        },
      ],
      'bob',
    );
    resume(pending, choose(pending, 'accept-effect', [refs.leader!]));
    const done = step(pending, 'accept-effect', [refs.leader!]);
    expect(done.cards[refs.leader!]!).toMatchObject({
      zone: 'base',
      deployedAs: null,
      exhausted: true,
      attachedTo: null,
      abilityUses: { deploy: 1 },
    });
    expect(unitIsLeader(done, done.cards[refs.fighter!]!)).toBe(false);
    expect(unitStats(done, done.cards[refs.fighter!]!)).toEqual({ power: 2, hp: 1 });
  }
});

test('Defeating a host defeats its pilot, including protected Luke, and leader-host bounce replaces with defeat', () => {
  for (const operation of [{ kind: 'defeat' }, { kind: 'return-to-hand' }] as const) {
    const { state, refs } = deployed(luke);
    const pending = effects(state, [unitEffect('TIE/ln Fighter', operation)], 'bob');
    const done = target(pending, refs.fighter!);
    expect(done.cards[refs.fighter!]!.zone).toBe('discard');
    expect(done.cards[refs.leader!]!).toMatchObject({
      zone: 'base',
      deployedAs: null,
      exhausted: true,
    });
  }
});

test('Luke resists direct enemy upgrade defeat, but not friendly removal or rule defeat after a bounce', () => {
  const { state, refs } = deployed(luke);
  const remove: CardEffect = {
    kind: 'select-upgrades',
    filter: {},
    min: 1,
    max: 1,
    bind: 'u',
    effects: [{ kind: 'move-upgrades', group: 'u', to: 'discard' }],
  };
  const blocked = step(effects(state, [remove], 'bob'), 'accept-effect', [refs.leader!]);
  expect(blocked.cards[refs.leader!]!.deployedAs).toBe('upgrade');
  const own = step(effects(state, [remove]), 'accept-effect', [refs.leader!]);
  expect(own.cards[refs.leader!]!.zone).toBe('base');
  const bounced = step(
    effects(
      state,
      [{ ...remove, effects: [{ kind: 'move-upgrades', group: 'u', to: 'hand' }] }],
      'bob',
    ),
    'accept-effect',
    [refs.leader!],
  );
  expect(bounced.cards[refs.leader!]!.zone).toBe('base');
});

test('Luke grants a Fighter an optional attack ability, but a non-Fighter Vehicle receives only stats and leader status', () => {
  const { state, refs } = deployed(luke);
  const pending = attack(state, refs.fighter!, state.players.bob!.base);
  resume(
    pending,
    choose(pending, i => i.kind === 'target' && i.card === refs.enemy),
  );
  const done = target(pending, refs.enemy!);
  expect(done.cards[refs.enemy!]!.zone).toBe('discard');
  expect(done.cards[done.players.bob!.base]!.damage).toBe(6);
  expect(step(pending, 'decline-effect').cards[refs.enemy!]!.zone).toBe('space');
  const other = deployed(luke, 'ground');
  expect(effectiveAbilities(other.state, other.state.cards[other.refs.ground!]!).triggers).toEqual(
    [],
  );
  expect(unitIsLeader(other.state, other.state.cards[other.refs.ground!]!)).toBe(true);
});

test('Losing the Fighter host abilities removes Luke attack grant, while Luke keeps his own protection and host leader status', () => {
  const { state, refs } = deployed(luke);
  modifyUnit(state, state.cards[state.players.bob!.leader]!, state.cards[refs.fighter!]!, {
    kind: 'modify',
    power: 0,
    hp: 0,
    duration: 'phase',
    loseAbilities: true,
  });
  expect(effectiveAbilities(state, state.cards[refs.fighter!]!).triggers).toEqual([]);
  expect(effectiveAbilities(state, state.cards[refs.leader!]!).enemyAbilityImmunity).toContain(
    'defeat',
  );
  expect(unitIsLeader(state, state.cards[refs.fighter!]!)).toBe(true);
});

test('Luke granted attack ability is captured for Support even when the borrower is not a Fighter', () => {
  const p = pilots(luke);
  p.players[0].space![0] = { card: 'remnant-interceptor', ref: 'fighter' };
  p.players[0].leader = {
    card: luke,
    ref: 'leader',
    deployedAs: 'upgrade',
    attachedTo: 'fighter',
    abilityUses: { deploy: 1 },
  };
  const { state, refs } = scenario(p);
  state.execution.decision = null;
  state.execution.frames = [
    ...effectFrames('alice', state.cards[refs.fighter!]!, [{ kind: 'support' }]),
    { kind: 'flush-triggers' },
    { kind: 'action' },
  ];
  settle(state);
  const attacking = attack(state, refs.character!, state.players.bob!.base);
  const batch = attacking.execution.frames[0];
  if (batch?.kind !== 'trigger-batch') throw new Error('Expected borrowed trigger batch');
  const ability = batch.triggers.find(t => t.abilityId.endsWith('fighter-attack'))!;
  const pending = step(attacking, i => i.kind === 'trigger' && i.triggerId === ability.id);
  resume(
    pending,
    choose(pending, i => i.kind === 'target' && i.card === refs.enemy),
  );
  const done = target(pending, refs.enemy!);
  expect(done.cards[refs.enemy!]!.zone).toBe('discard');
  expect(done.cards[done.players.bob!.base]!.damage).toBe(3);
  expect(done.attacks).toHaveLength(0);
});

test('Vader can exhaust without an earlier Vehicle attack and excludes token Vehicle attacks', () => {
  for (const history of ['none', 'token', 'unit']) {
    const p = position();
    p.players[0].leader = { card: vader, ref: 'leader' };
    p.players[0].space = [{ card: history === 'token' ? 'tie-fighter' : ids.fighter, ref: 'ship' }];
    p.attackedThisPhase = history === 'none' ? [] : ['ship'];
    const { state, refs } = scenario(p);
    const done = use(state, 'vehicle-squadron');
    expect(done.cards[refs.leader!]!.exhausted).toBe(true);
    expect(done.space.filter(id => done.cards[id]!.cardId === 'tie-fighter')).toHaveLength(
      history === 'none' ? 0 : 1,
    );
  }
});

test('Luke remembers a Fighter attack after that unit leaves play, includes tokens, and pays exhaust before checking', () => {
  const p = position();
  p.players[0].leader = { card: luke, ref: 'leader' };
  p.players[0].space = [{ card: 'tie-fighter', ref: 'ship' }];
  p.players[1].ground = [{ card: ids.marine, ref: 'enemy' }];
  p.attackedThisPhase = ['ship'];
  const { state, refs } = scenario(p);
  const departed = target(
    effects(state, [unitEffect('TIE Fighter', { kind: 'defeat' })]),
    refs.ship!,
  );
  const pending = use(departed, 'fighter-damage');
  resume(
    pending,
    choose(pending, i => i.kind === 'target' && i.card === refs.enemy),
  );
  expect(target(pending, refs.enemy!).cards[refs.enemy!]!.damage).toBe(1);
  p.attackedThisPhase = [];
  const none = scenario(p);
  const done = use(none.state, 'fighter-damage');
  expect(done.cards[none.refs.leader!]!.exhausted).toBe(true);
  expect(done.execution.frames[0]!.kind).toBe('action');
});

test('Boba observes actual noncombat damage once per simultaneous event and spends exhaust before choosing either player', () => {
  const p = position();
  p.players[0].leader = { card: boba, ref: 'leader' };
  p.players[1].ground = [
    { card: ids.marine, ref: 'one' },
    { card: ids.marine, ref: 'two' },
  ];
  const { state, refs } = scenario(p);
  const pending = effects(state, [{ kind: 'damage-units', filter: {}, amount: 1 }]);
  expect(pending.execution.frames[0]!.kind).toBe('effect');
  resume(pending, choose(pending, 'accept-effect'));
  const paid = step(pending, 'accept-effect');
  expect(paid.cards[refs.leader!]!.exhausted).toBe(true);
  for (const player of ['alice', 'bob']) {
    const choice = step(paid, i => i.kind === 'choose-player' && i.playerId === player);
    expect(choice.execution.decision!.playerId).toBe(player);
    resume(choice, choose(choice, 'accept-effect', [choice.players[player]!.base]));
    const done = step(choice, 'accept-effect', [choice.players[player]!.base]);
    expect(done.cards[done.players[player]!.base]!.damage).toBe(1);
    expect(done.execution.frames[0]!.kind).toBe('action');
  }
  expect(step(pending, 'decline-effect').cards[refs.leader!]!.exhausted).toBe(false);
});

test('Boba does not trigger from prevented, zero, enemy or combat damage, or while deployed', () => {
  for (const testCase of ['shield', 'zero', 'enemy', 'combat', 'deployed']) {
    const p = position();
    p.players[0].leader = {
      card: boba,
      ref: 'leader',
      deployedAs: testCase === 'deployed' ? 'unit' : null,
    };
    p.players[0].ground = [{ card: ids.marine, ref: 'own' }];
    p.players[1].ground = [{ card: ids.marine, ref: 'enemy' }];
    if (testCase === 'shield') p.attachments = [{ card: 'shield', unit: 'enemy' }];
    const { state, refs } = scenario(p);
    let done: GameState;
    if (testCase === 'combat') done = attack(state, refs.own!, state.players.bob!.base);
    else
      done = effects(
        state,
        [
          {
            kind: 'damage-units',
            filter: { controller: 'enemy' },
            amount: testCase === 'zero' ? 0 : 1,
          },
        ],
        testCase === 'enemy' ? 'bob' : 'alice',
      );
    expect(done.execution.frames[0]!.kind).toBe('action');
  }
});

test('Boba can respond to an On Attack indirect ability before combat and does not retrigger endlessly on his own indirect damage', () => {
  const p = position();
  p.players[0].leader = { card: boba, ref: 'leader' };
  p.players[0].space = [{ card: 'tie-bomber', ref: 'ship' }];
  const { state, refs } = scenario(p);
  const indirect = attack(state, refs.ship!, state.players.bob!.base);
  const pending = step(indirect, 'accept-effect', Array(3).fill(state.players.bob!.base));
  const paid = step(pending, 'accept-effect');
  const choice = step(paid, i => i.kind === 'choose-player' && i.playerId === 'bob');
  const done = step(choice, 'accept-effect', [state.players.bob!.base]);
  expect(done.cards[done.players.bob!.base]!.damage).toBe(4);
  expect(done.execution.frames[0]!.kind).toBe('action');
  expect(done.attacks).toHaveLength(0);
});

test('Pilot leader scenarios and checkpoints reject another leader card, missing hosts, role mismatches and exhaustion', () => {
  const { state, refs } = deployed(boba);
  for (const patch of [
    { exhausted: true },
    { attachedTo: null },
    { deployedAs: 'unit' as const },
  ]) {
    const invalid = structuredClone(state);
    Object.assign(invalid.cards[refs.leader!]!, patch);
    expect(() => decodeState(encodeState(invalid))).toThrow();
  }
  const p = pilots(boba);
  p.attachments!.push({ card: boba, unit: 'fighter' });
  expect(() => scenario(p)).toThrow();
  p.attachments = [];
  p.players[0].leader = { card: boba, deployedAs: 'upgrade', attachedTo: 'missing' };
  expect(() => scenario(p)).toThrow();
});

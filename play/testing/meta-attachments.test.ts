import { expect, test } from 'bun:test';
import type { CardEffect } from '../cards/definition.ts';
import { advance, settle } from '../engine/advance.ts';
import { attachedUpgrades, unitStats } from '../engine/attachments.ts';
import { cardTraits, unitIsLeader } from '../engine/attributes.ts';
import { decodeState, encodeState } from '../engine/checkpoint.ts';
import { effectiveAbilities } from '../engine/effective-abilities.ts';
import { modifyUnit } from '../engine/lasting.ts';
import type { GameState, Intent } from '../engine/model.ts';
import { exhaustibleLeaders } from '../engine/roles.ts';
import { playCost } from '../engine/state.ts';
import { matchingUnits } from '../engine/targets.ts';
import { effectFrames } from '../engine/triggers.ts';
import { Projector } from '../projection/projector.ts';
import { gameViewSchema } from '../view/parse.ts';
import { scenario } from './scenario.ts';
import { choose, ids, position } from './helpers.ts';
const dark = 'the-darksaber--icon-of-leadership',
  disguise = 'leia-s-disguise',
  sabine = 'sabine-wren--i-learned-the-hard-way',
  shuttle = 'shuttle-st-149--under-krennic-s-authority',
  zeb = 'zeb-orrelios--fists-work-every-time',
  rex = 'captain-rex--into-the-firefight';
const resources = () => Array.from({ length: 14 }, () => ({ card: ids.marine }));
const step = (
  s: GameState,
  i: Intent['kind'] | ((i: Intent) => boolean),
  selected: string[] = [],
) => advance(s, choose(s, i, selected)).state;
const target = (s: GameState, id: string) => step(s, i => i.kind === 'target' && i.card === id);
const play = (s: GameState, id: string, host?: string) =>
  step(s, i => i.kind === 'play' && i.card === id && i.target === host);
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
function on(
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
function trigger(s: GameState, ability: string) {
  const f = s.execution.frames[0];
  if (f?.kind !== 'trigger-batch') throw new Error('Expected trigger batch');
  const t = f.triggers.find(t => t.abilityId === ability)!;
  return step(s, i => i.kind === 'trigger' && i.triggerId === t.id);
}
function resolveDamage(s: GameState, base: string) {
  for (let n = 0; n < 30 && s.execution.frames[0]?.kind !== 'action'; n++) {
    const d = s.execution.decision!;
    const o =
      d.options.find(o => o.intent.kind === 'target' && o.intent.card === base) ??
      d.options.find(o => o.intent.kind === 'trigger') ??
      d.options[0]!;
    s = step(s, i => i === o.intent, d.selection?.cards.slice(0, d.selection.min) ?? []);
  }
  expect(s.execution.frames[0]?.kind).toBe('action');
  return s;
}

test('Darksaber requires a unique non-Vehicle and gives its host leader status, traits and aspect payment', () => {
  const p = position();
  p.players[0].resources = resources();
  p.players[0].hand = [
    { card: dark, ref: 'dark' },
    { card: disguise, ref: 'disguise' },
  ];
  p.players[0].ground = [
    { card: rex, ref: 'rex' },
    { card: ids.marine, ref: 'marine' },
  ];
  p.players[0].space = [{ card: shuttle, ref: 'vehicle' }];
  const { state, refs } = scenario(p);
  const options = state.execution.decision!.options.flatMap(o =>
    o.intent.kind === 'play' && o.intent.card === refs.dark ? [o.intent.target] : [],
  );
  expect(options).toEqual([refs.rex!]);
  expect(playCost(state, state.cards[refs.disguise!]!)).toBe(4);
  const done = play(state, refs.dark!, refs.rex!);
  const host = done.cards[refs.rex!]!;
  expect(unitIsLeader(done, host)).toBe(true);
  expect(cardTraits(done, host)).toContain('Mandalorian');
  expect(effectiveAbilities(done, host).providesAspects).toBe(true);
  expect(playCost(done, done.cards[refs.disguise!]!)).toBe(2);
  expect(exhaustibleLeaders(done, 'alice')).toContain(host);
  expect(matchingUnits(done, 'alice', { nonLeader: true })).not.toContain(host);
  expect(unitStats(done, host)).toEqual({ power: 11, hp: 9 });
  const view = new Projector(done.gameId, { role: 'spectator' }).project(done);
  expect(gameViewSchema.safeParse(view).success).toBe(true);
  expect(view.cards.find(c => c.face?.cardId === rex)!.face).toMatchObject({
    kind: 'unit',
    printedKind: 'unit',
    leaderUnit: true,
    traits: ['Republic', 'Clone', 'Trooper', 'Mandalorian'],
  });
});

test('Darksaber attributes survive host ability loss but its granted aspect payment does not', () => {
  const p = position();
  p.players[0].ground = [{ card: rex, ref: 'host' }];
  p.players[0].hand = [{ card: disguise, ref: 'spell' }];
  p.attachments = [{ card: dark, unit: 'host', ref: 'dark' }];
  const { state, refs } = scenario(p);
  modifyUnit(state, state.cards[state.players.bob!.leader]!, state.cards[refs.host!]!, {
    kind: 'modify',
    power: 0,
    hp: 0,
    duration: 'phase',
    loseAbilities: true,
  });
  expect(unitIsLeader(state, state.cards[refs.host!]!)).toBe(true);
  expect(cardTraits(state, state.cards[refs.host!]!)).toContain('Mandalorian');
  expect(playCost(state, state.cards[refs.spell!]!)).toBe(4);
});

test('Darksaber host is defeated instead of returning or changing control and goes to its printed owner discard', () => {
  for (const operation of [
    { kind: 'return-to-hand' },
    { kind: 'take-control', player: 'enemy' },
  ] as const) {
    const p = position();
    p.players[0].ground = [{ card: sabine, ref: 'host' }];
    p.attachments = [{ card: dark, unit: 'host', ref: 'dark' }];
    const { state, refs } = scenario(p);
    const pending = effects(state, [on('Sabine Wren', operation)]);
    const done = target(pending, refs.host!);
    expect(done.cards[refs.host!]!.zone).toBe('discard');
    expect(done.cards[refs.host!]!.controller).toBe('alice');
    expect(done.cards[refs.dark!]!.zone).toBe('discard');
    expect(cardTraits(done, done.cards[refs.host!]!)).toEqual(['Jedi', 'Mandalorian', 'Spectre']);
    expect(done.departedUnits[0]!.leaderUnit).toBe(true);
    expect(decodeState(encodeState(done))).toEqual(done);
  }
});

test('Removing Darksaber immediately removes granted traits and leader status without changing the host incarnation', () => {
  const p = position();
  p.players[0].ground = [{ card: rex, ref: 'host' }];
  p.attachments = [{ card: dark, unit: 'host', ref: 'dark' }];
  const { state, refs } = scenario(p);
  const pending = effects(state, [
    {
      kind: 'select-upgrades',
      filter: {},
      min: 1,
      max: 1,
      bind: 'chosen',
      effects: [{ kind: 'move-upgrades', group: 'chosen', to: 'hand' }],
    },
  ]);
  const done = step(pending, 'accept-effect', [refs.dark!]);
  expect(unitIsLeader(done, done.cards[refs.host!]!)).toBe(false);
  expect(cardTraits(done, done.cards[refs.host!]!)).not.toContain('Mandalorian');
  expect(done.cards[refs.host!]!.incarnation).toBe(state.cards[refs.host!]!.incarnation);
  expect(done.cards[refs.dark!]!.zone).toBe('hand');
});

test('Leia disguise grants Underworld and shields a friendly unit when its host is any Leia unit', () => {
  const p = position();
  p.players[0].leader = {
    card: 'leia-organa--someone-who-loves-you',
    deployedAs: 'unit',
    ref: 'leia',
  };
  p.players[0].resources = resources();
  p.players[0].hand = [{ card: disguise, ref: 'disguise' }];
  p.players[0].ground = [{ card: ids.marine, ref: 'friend' }];
  p.players[1].ground = [{ card: ids.marine, ref: 'enemy' }];
  const { state, refs } = scenario(p);
  const pending = play(state, refs.disguise!, refs.leia!);
  expect(
    pending.execution.decision!.options.some(
      o => o.intent.kind === 'target' && o.intent.card === refs.enemy,
    ),
  ).toBe(false);
  resume(
    pending,
    choose(pending, i => i.kind === 'target' && i.card === refs.friend),
  );
  const done = target(pending, refs.friend!);
  expect(attachedUpgrades(done, done.cards[refs.friend!]!).map(c => c.cardId)).toEqual(['shield']);
  expect(cardTraits(done, done.cards[refs.leia!]!)).toContain('Underworld');
  const view = new Projector(done.gameId, { role: 'spectator' }).project(done);
  expect(
    view.cards.find(c => c.face?.cardId === 'leia-organa--someone-who-loves-you')!.face,
  ).toMatchObject({ kind: 'unit', printedKind: 'leader', leaderUnit: true, power: 4, hp: 4 });
});

test('Leia disguise on another character grants the trait without a Shield; the trait survives ability loss', () => {
  const p = position();
  p.players[0].resources = resources();
  p.players[0].hand = [{ card: disguise, ref: 'disguise' }];
  p.players[0].ground = [{ card: ids.marine, ref: 'host' }];
  const { state, refs } = scenario(p);
  const done = play(state, refs.disguise!, refs.host!);
  expect(done.execution.frames[0]!.kind).toBe('action');
  expect(attachedUpgrades(done, done.cards[refs.host!]!)).toHaveLength(1);
  modifyUnit(done, done.cards[done.players.bob!.leader]!, done.cards[refs.host!]!, {
    kind: 'modify',
    power: 0,
    hp: 0,
    duration: 'phase',
    loseAbilities: true,
  });
  expect(cardTraits(done, done.cards[refs.host!]!)).toContain('Underworld');
});

test('Sabine Shielded produces one optional ground exhaustion with exact copies and recovery', () => {
  const p = position();
  p.players[0].resources = resources();
  p.players[0].hand = [{ card: sabine, ref: 'sabine' }];
  p.players[1].ground = [
    { card: ids.marine, ref: 'a' },
    { card: ids.marine, ref: 'b' },
  ];
  p.players[1].space = [{ card: ids.fighter, ref: 'space' }];
  const { state, refs } = scenario(p);
  const pending = play(state, refs.sabine!);
  expect(attachedUpgrades(pending, pending.cards[refs.sabine!]!).map(c => c.cardId)).toEqual([
    'shield',
  ]);
  expect(
    pending.execution.decision!.options.some(
      o => o.intent.kind === 'target' && o.intent.card === refs.space,
    ),
  ).toBe(false);
  resume(
    pending,
    choose(pending, i => i.kind === 'target' && i.card === refs.b),
  );
  const done = target(pending, refs.b!);
  expect(done.cards[refs.a!]!.exhausted).toBe(false);
  expect(done.cards[refs.b!]!.exhausted).toBe(true);
  expect(step(pending, 'decline-effect').cards[refs.b!]!.exhausted).toBe(false);
});

test('Three Advantage tokens attaching together trigger Sabine once and Zeb cannot target himself', () => {
  const p = position();
  p.players[0].resources = resources();
  p.players[0].hand = [{ card: zeb, ref: 'zeb' }];
  p.players[1].ground = [
    { card: sabine, ref: 'sabine' },
    { card: ids.marine, ref: 'enemy' },
  ];
  const { state, refs } = scenario(p);
  const played = play(state, refs.zeb!);
  expect(
    played.execution.decision!.options.some(
      o => o.intent.kind === 'target' && o.intent.card === refs.zeb,
    ),
  ).toBe(false);
  const pending = target(played, refs.sabine!);
  expect(attachedUpgrades(pending, pending.cards[refs.sabine!]!)).toHaveLength(3);
  expect(pending.execution.decision!.playerId).toBe('bob');
  const done = target(pending, refs.enemy!);
  expect(done.execution.frames[0]!.kind).toBe('action');
  expect(
    done.facts.filter(f => f.type === 'triggered' && f.cards[0]?.instanceId === refs.sabine),
  ).toHaveLength(1);
});

test('Shuttle takes an enemy token and reattaches it across arenas with stable identity and fresh-process recovery', () => {
  const p = position();
  p.players[0].resources = resources();
  p.players[0].hand = [{ card: shuttle, ref: 'shuttle' }];
  p.players[1].ground = [{ card: ids.marine, ref: 'enemy' }];
  p.attachments = [
    { card: 'experience', unit: 'enemy', ref: 'token' },
    { card: 'academy-training', unit: 'enemy', ref: 'ordinary' },
  ];
  const { state, refs } = scenario(p);
  let pending = play(state, refs.shuttle!);
  pending = trigger(pending, 'move-token-played');
  expect(pending.execution.decision!.selection!.cards).toEqual([refs.token!]);
  resume(pending, choose(pending, 'accept-effect', [refs.token!]));
  const chosen = step(pending, 'accept-effect', [refs.token!]);
  expect(chosen.cards[refs.token!]!.controller).toBe('alice');
  expect(
    chosen.execution.decision!.options.some(
      o => o.intent.kind === 'target' && o.intent.card === refs.enemy,
    ),
  ).toBe(false);
  resume(
    chosen,
    choose(chosen, i => i.kind === 'target' && i.card === refs.shuttle),
  );
  const done = target(chosen, refs.shuttle!);
  expect(done.cards[refs.token!]!).toMatchObject({
    zone: 'space',
    owner: 'alice',
    controller: 'alice',
    incarnation: state.cards[refs.token!]!.incarnation,
    attachedTo: { instanceId: refs.shuttle },
  });
  expect(
    attachedUpgrades(done, done.cards[refs.shuttle!]!)
      .map(c => c.cardId)
      .sort(),
  ).toEqual(['experience', 'shield']);
  expect(decodeState(encodeState(done))).toEqual(done);
});

test('Shuttle can decline or move its Shield to an enemy unit, whose controller then owns the token', () => {
  const p = position();
  p.players[0].resources = resources();
  p.players[0].hand = [{ card: shuttle, ref: 'shuttle' }];
  p.players[1].ground = [{ card: ids.marine, ref: 'enemy' }];
  const { state, refs } = scenario(p);
  const shielded = trigger(play(state, refs.shuttle!), 'shielded-played');
  const token = attachedUpgrades(shielded, shielded.cards[refs.shuttle!]!)[0]!;
  const declined = step(shielded, 'accept-effect', []);
  expect(declined.cards[token.instanceId]!.attachedTo!.instanceId).toBe(refs.shuttle!);
  const done = target(step(shielded, 'accept-effect', [token.instanceId]), refs.enemy!);
  expect(done.cards[token.instanceId]!).toMatchObject({
    owner: 'bob',
    controller: 'bob',
    attachedTo: { instanceId: refs.enemy },
  });
});

test('Shuttle defeat cleans up its own Shield before selecting and can still take control with no other host', () => {
  const p = position();
  p.players[0].space = [{ card: shuttle, ref: 'shuttle' }];
  p.players[1].ground = [{ card: ids.marine, ref: 'host' }];
  p.attachments = [
    { card: 'shield', unit: 'shuttle', ref: 'own' },
    { card: 'shield', unit: 'host', ref: 'enemy' },
  ];
  const { state, refs } = scenario(p);
  const pending = target(effects(state, [on('Shuttle ST-149', { kind: 'defeat' })]), refs.shuttle!);
  expect(pending.cards[refs.own!]!.zone).toBe('set-aside');
  expect(pending.execution.decision!.selection!.cards).toEqual([refs.enemy!]);
  const done = step(pending, 'accept-effect', [refs.enemy!]);
  expect(done.execution.frames[0]!.kind).toBe('action');
  expect(done.cards[refs.enemy!]!).toMatchObject({
    owner: 'bob',
    controller: 'alice',
    attachedTo: { instanceId: refs.host },
  });
});

test('Zeb sees each friendly upgrade defeat, including his own and another simultaneous departing unit', () => {
  const p = position();
  p.players[0].ground = [
    { card: zeb, ref: 'zeb' },
    { card: ids.marine, ref: 'friend' },
  ];
  p.players[1].ground = [{ card: ids.marine, ref: 'enemy' }];
  p.attachments = [
    { card: 'advantage', unit: 'zeb', ref: 'one' },
    { card: 'experience', unit: 'friend', ref: 'two' },
    { card: 'academy-training', unit: 'enemy', owner: 'alice', ref: 'three' },
    { card: 'advantage', unit: 'enemy', ref: 'enemyToken' },
  ];
  const { state, refs } = scenario(p);
  const pending = effects(state, [{ kind: 'defeat-units', filter: {} }]);
  expect(pending.cards[refs.zeb!]!.zone).toBe('discard');
  resume(pending, choose(pending, 'trigger'));
  const done = resolveDamage(pending, pending.players.bob!.base);
  expect(done.cards[done.players.bob!.base]!.damage).toBe(3);
  expect(done.cards[refs.enemyToken!]!.zone).toBe('set-aside');
});

test('Zeb damage triggers on Shield prevention and Advantage expiry but not an upgrade returned to hand', () => {
  const p = position();
  p.players[0].ground = [
    { card: zeb, ref: 'zeb' },
    { card: ids.marine, ref: 'marine' },
  ];
  p.attachments = [
    { card: 'shield', unit: 'marine', ref: 'shield' },
    { card: 'advantage', unit: 'marine', ref: 'advantage' },
    { card: 'academy-training', unit: 'zeb', ref: 'ordinary' },
  ];
  const { state, refs } = scenario(p);
  const hit = target(
    effects(state, [on('Battlefield Marine', { kind: 'damage', amount: 1 })]),
    refs.marine!,
  );
  const shielded = resolveDamage(hit, state.players.bob!.base);
  expect(shielded.cards[shielded.players.bob!.base]!.damage).toBe(1);
  expect(shielded.cards[refs.marine!]!.damage).toBe(0);
  const fought = resolveDamage(
    attack(state, refs.marine!, state.players.bob!.base),
    state.players.bob!.base,
  );
  expect(fought.cards[refs.advantage!]!.zone).toBe('set-aside');
  expect(fought.cards[fought.players.bob!.base]!.damage).toBe(5);
  const returned = step(
    effects(state, [
      {
        kind: 'select-upgrades',
        filter: {},
        min: 1,
        max: 1,
        bind: 'u',
        effects: [{ kind: 'move-upgrades', group: 'u', to: 'hand' }],
      },
    ]),
    'accept-effect',
    [refs.ordinary!],
  );
  expect(returned.cards[returned.players.bob!.base]!.damage).toBe(0);
});

test('Moving Experience can defeat its former host and triggers Sabine on the new host without defeating that token', () => {
  const p = position();
  p.players[0].space = [{ card: shuttle, ref: 'shuttle' }];
  p.players[0].ground = [{ card: sabine, ref: 'sabine' }];
  p.players[1].ground = [
    { card: ids.marine, ref: 'host', damage: 3 },
    { card: ids.marine, ref: 'other' },
  ];
  p.attachments = [{ card: 'experience', unit: 'host', ref: 'token' }];
  const { state, refs } = scenario(p);
  const pending = target(effects(state, [on('Shuttle ST-149', { kind: 'defeat' })]), refs.shuttle!);
  const moving = step(pending, 'accept-effect', [refs.token!]);
  const attached = target(moving, refs.sabine!);
  expect(attached.cards[refs.host!]!.zone).toBe('discard');
  expect(attached.cards[refs.token!]!.zone).toBe('ground');
  expect(attached.cards[refs.token!]!.attachedTo!.instanceId).toBe(refs.sabine!);
  const done = target(attached, refs.other!);
  expect(done.cards[refs.other!]!.exhausted).toBe(true);
  expect(done.cards[refs.token!]!.incarnation).toBe(state.cards[refs.token!]!.incarnation);
});

test('Sabine does not trigger from an attachment while she has lost her abilities', () => {
  const p = position();
  p.players[0].ground = [{ card: sabine, ref: 'sabine' }];
  const { state, refs } = scenario(p);
  modifyUnit(state, state.cards[state.players.bob!.leader]!, state.cards[refs.sabine!]!, {
    kind: 'modify',
    power: 0,
    hp: 0,
    duration: 'phase',
    loseAbilities: true,
  });
  const done = target(
    effects(state, [on('Sabine Wren', { kind: 'give-token', token: 'experience', count: 3 })]),
    refs.sabine!,
  );
  expect(attachedUpgrades(done, done.cards[refs.sabine!]!)).toHaveLength(3);
  expect(done.execution.frames[0]!.kind).toBe('action');
});

test('A printed leader unit returns exhausted to base when an ability would return it to hand', () => {
  const p = position();
  p.players[0].leader = {
    card: ids.leader,
    deployedAs: 'unit',
    ref: 'leader',
    abilityUses: { deploy: 1 },
  };
  p.attachments = [{ card: 'shield', unit: 'leader', ref: 'shield' }];
  const { state, refs } = scenario(p);
  const done = target(
    effects(state, [on('Sabine Wren', { kind: 'return-to-hand' })], 'bob'),
    refs.leader!,
  );
  expect(done.cards[refs.leader!]!).toMatchObject({
    zone: 'base',
    deployedAs: null,
    exhausted: true,
    abilityUses: { deploy: 1 },
  });
  expect(done.cards[refs.shield!]!.zone).toBe('set-aside');
});

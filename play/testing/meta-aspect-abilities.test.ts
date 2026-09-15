import { expect, test } from 'bun:test';
import type { CardEffect } from '../cards/definition.ts';
import { advance, settle } from '../engine/advance.ts';
import { attachedUpgrades, unitStats } from '../engine/attachments.ts';
import { encodeState, decodeState } from '../engine/checkpoint.ts';
import { effectiveAbilities } from '../engine/effective-abilities.ts';
import { modifyUnit } from '../engine/lasting.ts';
import type { GameState, Intent } from '../engine/model.ts';
import { playCost } from '../engine/state.ts';
import { effectFrames } from '../engine/triggers.ts';
import { Projector } from '../projection/projector.ts';
import { scenario } from './scenario.ts';
import { choose, ids, position } from './helpers.ts';
const sloane = 'grand-admiral-sloane--holding-the-empire-together',
  leia = 'leia-organa--someone-who-loves-you',
  masterpiece = 'sabine-s-masterpiece--crazy-colorful',
  enoch = 'enoch--solemn-servant',
  n1 = 'mando-s-n-1-starfighter--faster-than-a-fathier',
  jabba = 'jabba-the-hutt--eminence-of-tatooine';
const resources = (n = 12) => Array.from({ length: n }, () => ({ card: ids.marine }));
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
const mode = (s: GameState, id: string) => step(s, i => i.kind === 'choose-mode' && i.mode === id);
const ability = (s: GameState, id: string, card?: string) =>
  step(s, i => i.kind === 'use-ability' && i.abilityId === id && (!card || i.card === card));
const keywords = (s: GameState, id: string) => effectiveAbilities(s, s.cards[id]!).keywords ?? [];
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
function nextRound(s: GameState) {
  const round = s.round;
  for (let n = 0; n < 40 && s.round === round; n++) {
    const d = s.execution.decision!,
      o =
        d.options.find(o => o.intent.kind === 'pass') ??
        d.options.find(o => o.intent.kind === 'decline-effect') ??
        d.options[0]!;
    s = step(s, i => i === o.intent, d.selection?.cards.slice(0, d.selection.min) ?? []);
  }
  expect(s.round).toBe(round + 1);
  return s;
}

test('Sloane leader gives both players existing units the selected arena keywords, with phase expiry', () => {
  const p = position();
  p.players[0].leader = { card: sloane, ref: 'sloane' };
  p.players[0].ground = [{ card: ids.marine, ref: 'own' }];
  p.players[1].ground = [{ card: ids.consular, ref: 'enemy' }];
  p.players[1].space = [{ card: ids.fighter, ref: 'space' }];
  const { state, refs } = scenario(p);
  const pending = ability(state, 'arena-keywords');
  expect(pending.cards[refs.sloane!]!.exhausted).toBe(true);
  resume(
    pending,
    choose(pending, i => i.kind === 'choose-mode' && i.mode === 'ground'),
  );
  const done = mode(pending, 'ground');
  expect(keywords(done, refs.own!)).toContain('Sentinel');
  expect(keywords(done, refs.enemy!)).toContain('Overwhelm');
  expect(keywords(done, refs.space!)).not.toContain('Sentinel');
  const created = effects(done, [{ kind: 'create-unit', cardId: 'spy', count: 1 }]);
  const droid = created.ground.find(id => created.cards[id]!.cardId === 'spy')!;
  expect(keywords(created, droid)).not.toContain('Sentinel');
  const next = nextRound(done);
  expect(keywords(next, refs.own!)).not.toContain('Sentinel');
  expect(keywords(next, refs.enemy!)).not.toContain('Overwhelm');
});

test('Sloane deployment supplies an ongoing friendly aura, excludes herself, and loses it when defeated or blanked', () => {
  const p = position();
  p.players[0].leader = { card: sloane, ref: 'sloane' };
  p.players[0].resources = resources(5);
  p.players[0].ground = [{ card: ids.marine, ref: 'own' }];
  p.players[1].space = [{ card: ids.fighter, ref: 'enemy' }];
  const { state, refs } = scenario(p);
  const done = ability(state, 'deploy', refs.sloane!);
  expect(done.cards[refs.sloane!]!.deployedAs).toBe('unit');
  expect(done.cards[refs.sloane!]!.exhausted).toBe(false);
  expect(keywords(done, refs.sloane!)).toEqual(['Overwhelm']);
  expect(keywords(done, refs.own!)).toContain('Sentinel');
  expect(keywords(done, refs.enemy!)).not.toContain('Sentinel');
  const created = effects(done, [{ kind: 'create-unit', cardId: 'spy', count: 1 }]);
  const droid = created.ground.find(id => created.cards[id]!.cardId === 'spy')!;
  expect(keywords(created, droid)).toContain('Overwhelm');
  const blank = structuredClone(done);
  modifyUnit(blank, blank.cards[blank.players.bob!.leader]!, blank.cards[refs.sloane!]!, {
    kind: 'modify',
    power: 0,
    hp: 0,
    duration: 'phase',
    loseAbilities: true,
  });
  expect(keywords(blank, refs.own!)).not.toContain('Sentinel');
  const defeated = effects(
    done,
    [{ kind: 'damage-units', filter: { name: 'Grand Admiral Sloane' }, amount: 5 }],
    'bob',
  );
  expect(defeated.cards[refs.sloane!]!.zone).toBe('base');
  expect(defeated.cards[refs.sloane!]!.abilityUses.deploy).toBe(1);
  expect(keywords(defeated, refs.own!)).not.toContain('Sentinel');
});

test('Leia pays two and exhausts to give a chosen unit its distinct-aspect bonus, including neutral and enemy units', () => {
  for (const card of [jabba, 'spy']) {
    const p = position();
    p.players[0].leader = { card: leia, ref: 'leia' };
    p.players[0].resources = resources(2);
    p.players[1].ground = [{ card, ref: 'target' }];
    const { state, refs } = scenario(p);
    const before = unitStats(state, state.cards[refs.target!]!);
    const pending = ability(state, 'aspect-strength');
    resume(
      pending,
      choose(pending, i => i.kind === 'target' && i.card === refs.target),
    );
    const done = target(pending, refs.target!);
    const bonus = card === jabba ? 3 : 0;
    expect(unitStats(done, done.cards[refs.target!]!)).toEqual({
      power: before.power + bonus,
      hp: before.hp + bonus,
    });
    expect(done.cards[refs.leia!]!.exhausted).toBe(true);
    expect(done.players.alice!.resources.every(id => done.cards[id]!.exhausted)).toBe(true);
    expect(unitStats(nextRound(done), done.cards[refs.target!]!)).toEqual(before);
  }
});

test('Leia deployment counts every distinct aspect among friendly units, including her, and may upgrade an enemy', () => {
  const p = position();
  p.players[0].leader = { card: leia, ref: 'leia' };
  p.players[0].resources = resources(5);
  p.players[0].ground = [
    { card: jabba, ref: 'jabba' },
    { card: ids.trooper, ref: 'trooper' },
    { card: ids.marine, ref: 'marine' },
  ];
  p.players[1].space = [{ card: ids.fighter, ref: 'enemy' }];
  const { state, refs } = scenario(p);
  const pending = ability(state, 'deploy', refs.leia!);
  resume(
    pending,
    choose(pending, i => i.kind === 'target' && i.card === refs.enemy),
  );
  const done = target(pending, refs.enemy!);
  expect(
    attachedUpgrades(done, done.cards[refs.enemy!]!).filter(c => c.cardId === 'experience'),
  ).toHaveLength(6);
  expect(keywords(done, refs.leia!)).toContain('Overwhelm');
  expect(done.players.alice!.resources.every(id => !done.cards[id]!.exhausted)).toBe(true);
});

test('Masterpiece resolves its four color effects in order and its controller selects an enemy resource privately', () => {
  const p = position();
  p.players[0].space = [{ card: masterpiece, ref: 'ship' }];
  p.players[0].ground = [
    { card: jabba, ref: 'jabba' },
    { card: ids.marine, ref: 'marine' },
    { card: ids.trooper, ref: 'trooper' },
  ];
  p.players[1].base.damage = 3;
  p.players[1].resources = [
    { card: enoch, ref: 'resource' },
    { card: ids.fighter, ref: 'other' },
  ];
  const { state, refs } = scenario(p);
  let s = attack(state, refs.ship!, state.players.bob!.base);
  s = target(s, s.players.bob!.base);
  expect(s.cards[s.players.bob!.base]!.damage).toBe(1);
  s = target(s, refs.marine!);
  expect(unitStats(s, s.cards[refs.marine!]!).power).toBe(4);
  s = target(s, refs.marine!);
  expect(s.cards[refs.marine!]!.damage).toBe(1);
  s = mode(s, 'enemy-exhaust');
  expect(s.execution.decision!.playerId).toBe('alice');
  expect(s.execution.decision!.selection!.cards).toEqual([refs.resource!, refs.other!]);
  const own = new Projector(
    s.gameId,
    { role: 'player', playerId: 'alice' },
    'x'.repeat(32),
  ).project(s);
  expect(JSON.stringify(own)).not.toContain(enoch);
  const opponent = new Projector(
    s.gameId,
    { role: 'player', playerId: 'bob' },
    'y'.repeat(32),
  ).project(s);
  expect(opponent.decision).toBeNull();
  resume(s, choose(s, 'accept-effect', [refs.resource!]));
  s = step(s, 'accept-effect', [refs.resource!]);
  expect(s.cards[refs.resource!]!.exhausted).toBe(true);
  expect(s.cards[refs.other!]!.exhausted).toBe(false);
  expect(s.cards[s.players.bob!.base]!.damage).toBe(4);
});

test('Masterpiece ignores leader/base aspects and hides resource modes that cannot change any resource', () => {
  const p = position();
  p.players[0].space = [{ card: masterpiece, ref: 'ship' }];
  const { state, refs } = scenario(p);
  const done = attack(state, refs.ship!, state.players.bob!.base);
  expect(done.execution.frames[0]!.kind).toBe('action');
  expect(done.cards[done.players.bob!.base]!.damage).toBe(3);
  p.players[0].ground = [{ card: jabba, ref: 'jabba' }];
  p.players[0].resources = [{ card: ids.marine, ref: 'spent', exhausted: true }];
  const s = scenario(p);
  let pending = attack(s.state, s.refs.ship!, s.state.players.bob!.base);
  pending = target(pending, pending.players.alice!.base);
  expect(pending.execution.decision!.options.map(o => o.intent)).toEqual([
    { kind: 'choose-mode', mode: 'self-ready' },
  ]);
  const ready = step(mode(pending, 'self-ready'), 'accept-effect', [s.refs.spent!]);
  expect(ready.cards[s.refs.spent!]!.exhausted).toBe(false);
});

test('Enoch reduction counts actual damage from this resolution and applies only to the next unit this phase', () => {
  const p = position();
  p.players[0].ground = [{ card: enoch, ref: 'enoch' }];
  p.players[0].base.damage = 3;
  p.players[0].hand = [
    { card: ids.marine, ref: 'first' },
    { card: ids.marine, ref: 'second' },
  ];
  p.players[0].resources = resources(4);
  const { state, refs } = scenario(p);
  const pending = effects(state, [{ kind: 'defeat-units', filter: { name: 'Enoch' } }]);
  resume(
    pending,
    choose(pending, i => i.kind === 'choose-mode' && i.mode === 'damage-5'),
  );
  const discounted = mode(pending, 'damage-5');
  expect(discounted.cards[discounted.players.alice!.base]!.damage).toBe(8);
  expect(discounted.playModifiers[0]!.discount).toBe(2);
  const first = play(discounted, refs.first!);
  expect(first.players.alice!.resources.every(id => !first.cards[id]!.exhausted)).toBe(true);
  expect(first.playModifiers).toHaveLength(0);
  const second = play(step(first, 'pass'), refs.second!);
  expect(second.players.alice!.resources.filter(id => second.cards[id]!.exhausted)).toHaveLength(2);
  expect(nextRound(discounted).playModifiers).toHaveLength(0);
  expect(mode(pending, 'damage-0').playModifiers[0]!.discount).toBe(0);
});

test('Mando N-1 can exhaust a leader or leader unit for its own attack and can decline', () => {
  for (const deployed of [false, true]) {
    const p = position();
    p.players[0].space = [{ card: n1, ref: 'ship' }];
    p.players[0].leader.ref = 'leader';
    if (deployed) p.players[0].leader.deployedAs = 'unit';
    const { state, refs } = scenario(p);
    const pending = attack(state, refs.ship!, state.players.bob!.base);
    resume(
      pending,
      choose(pending, i => i.kind === 'target' && i.card === refs.leader),
    );
    const done = target(pending, refs.leader!);
    expect(done.cards[refs.leader!]!.exhausted).toBe(true);
    expect(done.cards[done.players.bob!.base]!.damage).toBe(3);
    expect(unitStats(done, done.cards[refs.ship!]!).power).toBe(1);
    const declined = step(pending, 'decline-effect');
    expect(declined.cards[declined.players.bob!.base]!.damage).toBe(1);
    expect(declined.cards[refs.leader!]!.exhausted).toBe(false);
  }
});

test('Mando N-1 lends its exhaust-leader ability through Support and cannot exhaust an already exhausted leader', () => {
  const p = position();
  p.players[0].hand = [{ card: n1, ref: 'ship' }];
  p.players[0].ground = [{ card: ids.marine, ref: 'attacker' }];
  p.players[0].resources = resources();
  p.players[0].leader.ref = 'leader';
  const { state, refs } = scenario(p);
  const support = play(state, refs.ship!);
  const pending = attack(support, refs.attacker!, state.players.bob!.base);
  const done = target(pending, refs.leader!);
  expect(done.cards[done.players.bob!.base]!.damage).toBe(5);
  expect(unitStats(done, done.cards[refs.attacker!]!).power).toBe(3);
  p.players[0].hand = [];
  p.players[0].space = [{ card: n1, ref: 'ship' }];
  p.players[0].leader.exhausted = true;
  const s = scenario(p);
  const exhausted = attack(s.state, s.refs.ship!, s.state.players.bob!.base);
  expect(exhausted.execution.decision!.options.some(o => o.intent.kind === 'target')).toBe(false);
  expect(exhausted.cards[exhausted.players.bob!.base]!.damage).toBe(1);
});

test('Canto Bight and Daimyo Palace ignore exactly one missing colored penalty during their Epic Action', () => {
  for (const [base, amount] of [
    ['canto-bight', 8],
    ['daimyo-s-palace', 6],
  ] as const) {
    const p = position();
    p.players[0].base.card = base;
    p.players[0].resources = resources(amount);
    p.players[0].hand = [{ card: enoch, ref: 'card' }];
    const { state, refs } = scenario(p);
    expect(playCost(state, state.cards[refs.card!]!)).toBe(amount + 2);
    expect(state.execution.decision!.options.some(o => o.intent.kind === 'play')).toBe(false);
    const pending = ability(state, 'discounted-play');
    resume(
      pending,
      choose(pending, i => i.kind === 'play' && i.card === refs.card),
    );
    const done = play(pending, refs.card!);
    expect(done.players.alice!.resources.every(id => done.cards[id]!.exhausted)).toBe(true);
    expect(done.cards[done.players.alice!.base]!.abilityUses['discounted-play']).toBe(1);
    expect(done.cards[refs.card!]!.zone).toBe('ground');
  }
});

test('A base cannot ignore a missing Villainy icon or discount a card whose colored icons are supplied', () => {
  const p = position();
  p.players[0].base.card = 'canto-bight';
  p.players[0].hand = [{ card: 'boba-fett--feared-bounty-hunter', ref: 'boba' }];
  p.players[0].resources = resources(6);
  const { state, refs } = scenario(p);
  const pending = ability(state, 'discounted-play');
  expect(pending.execution.decision!.options.some(o => o.intent.kind === 'play')).toBe(false);
  expect(pending.cards[refs.boba!]!.zone).toBe('hand');
  expect(pending.cards[pending.players.alice!.base]!.abilityUses['discounted-play']).toBe(1);
  const q = position();
  q.players[0].base.card = 'daimyo-s-palace';
  q.players[0].hand = [{ card: ids.consular, ref: 'card' }];
  q.players[0].resources = resources(5);
  const s = scenario(q);
  const done = play(ability(s.state, 'discounted-play'), s.refs.card!);
  expect(done.players.alice!.resources.filter(id => done.cards[id]!.exhausted)).toHaveLength(4);
});

test('The base discount uses a Pilot alternate cost and survives a nested Credit payment', () => {
  const p = position();
  p.players[0].base.card = 'canto-bight';
  p.players[0].space = [{ card: ids.fighter, ref: 'ship' }];
  p.players[0].hand = [{ card: 'chewbacca--faithful-first-mate', ref: 'pilot' }];
  p.players[0].resources = resources(3);
  const { state, refs } = scenario(p);
  const pending = ability(state, 'discounted-play');
  expect(
    pending.execution
      .decision!.options.filter(o => o.intent.kind === 'play')
      .every(o => (o.intent as any).target === refs.ship),
  ).toBe(true);
  const pilot = step(pending, i => i.kind === 'play' && i.target === refs.ship);
  expect(pilot.cards[refs.pilot!]!.attachedTo?.instanceId).toBe(refs.ship);
  const q = position();
  q.players[0].base.card = 'canto-bight';
  q.players[0].resources = resources(7);
  q.players[0].credits = ['credit'];
  q.players[0].hand = [{ card: enoch, ref: 'card' }];
  const s = scenario(q);
  const payment = play(ability(s.state, 'discounted-play'), s.refs.card!);
  expect(payment.execution.frames[0]!.kind).toBe('credit-payment');
  resume(payment, choose(payment, 'accept-effect', [s.refs.credit!]));
  const done = step(payment, 'accept-effect', [s.refs.credit!]);
  expect(done.cards[s.refs.card!]!.zone).toBe('ground');
  expect(done.cards[s.refs.credit!]!.zone).toBe('set-aside');
  expect(done.players.alice!.resources.every(id => done.cards[id]!.exhausted)).toBe(true);
  expect(decodeState(encodeState(done))).toEqual(done);
});

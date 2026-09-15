import { collectTriggers, flushTriggers } from '../engine/triggers.ts';
import { expect, test } from 'bun:test';
import { advance, settle } from '../engine/advance.ts';
import { unitStats } from '../engine/attachments.ts';
import { decodeState, encodeState } from '../engine/checkpoint.ts';
import { changeControl } from '../engine/control.ts';
import { cannotReady, modifyUnit } from '../engine/lasting.ts';
import { abilityOrigins } from '../engine/effective-abilities.ts';
import { forceToken } from '../engine/force.ts';
import type { GameState, Intent } from '../engine/model.ts';
import { Projector } from '../projection/projector.ts';
import { gameViewSchema } from '../view/parse.ts';
import { scenario } from './scenario.ts';
import { choose, ids, position } from './helpers.ts';

const step = (s: GameState, i: Intent['kind'] | ((i: Intent) => boolean), cards: string[] = []) =>
  advance(s, choose(s, i, cards)).state;
const target = (s: GameState, id: string) => step(s, i => i.kind === 'target' && i.card === id);
const attack = (s: GameState, a: string, d: string) =>
  step(s, i => i.kind === 'attack' && i.attacker === a && i.defender === d);
const maul = 'maul--master-of-the-shadow-collective';
const liberated = 'liberated-by-darkness';
const dryden = 'dryden-vos--i-get-all-worked-up';
const crisis = 'time-of-crisis';
function playFixture(card: string) {
  const p = position();
  p.players[0].hand = [{ card, ref: 'played' }];
  p.players[0].resources = Array.from({ length: 20 }, () => ({ card: ids.marine }));
  return p;
}
function play(s: GameState, id: string) {
  return step(s, i => i.kind === 'play' && i.card === id && !i.piloting);
}
function regroup(s: GameState) {
  const round = s.round;
  for (let n = 0; n < 50 && s.round === round; n++) {
    const d = s.execution.decision!;
    const o =
      d.options.find(o => o.intent.kind === 'pass') ??
      d.options.find(o => o.intent.kind === 'decline-effect') ??
      d.options[0]!;
    s = step(s, i => i === o.intent, d.selection?.cards.slice(0, d.selection.min) ?? []);
  }
  expect(s.round).toBe(round + 1);
  return s;
}
function resume(s: GameState, input: ReturnType<typeof choose>) {
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
function maulBoard() {
  const p = playFixture('the-will-of-the-force');
  p.players[0].ground = [{ card: maul, ref: 'maul' }];
  p.players[1].ground = [{ card: ids.marine, ref: 'victim' }];
  return p;
}
function steal(g: ReturnType<typeof scenario>) {
  return target(attack(g.state, g.refs.maul!, g.state.players.bob!.base), g.refs.victim!);
}

test('Maul takes an exact unit after combat base damage and preserves damage, exhaustion and ordinary upgrade ownership', () => {
  const p = maulBoard();
  p.players[1].ground![0] = { card: ids.consular, ref: 'victim', damage: 1, exhausted: true };
  p.attachments = [
    { card: 'experience', unit: 'victim', ref: 'xp' },
    { card: 'advantage', unit: 'victim', ref: 'adv' },
    { card: 'academy-training', unit: 'victim', ref: 'ordinary' },
  ];
  const g = scenario(p);
  const s = steal(g);
  expect(s.cards[g.refs.victim!]!).toMatchObject({
    owner: 'bob',
    controller: 'alice',
    damage: 1,
    exhausted: true,
  });
  for (const ref of ['xp', 'adv'])
    expect(s.cards[g.refs[ref]!]!).toMatchObject({ owner: 'alice', controller: 'alice' });
  expect(s.cards[g.refs.ordinary!]!).toMatchObject({ owner: 'bob', controller: 'bob' });
  expect(s.delayedEffects).toHaveLength(1);
  expect(() => decodeState(encodeState(s))).not.toThrow();
  const view = new Projector(s.gameId, { role: 'spectator' }, 'v'.repeat(32)).project(s);
  expect(gameViewSchema.safeParse(view).success).toBe(true);
  expect(view.scheduled[0]!.kind).toBe('control-on-departure');
});

test('Maul returns control when bounced, before later triggers, and the schedule survives rounds', () => {
  const g = scenario(maulBoard());
  let s = regroup(steal(g));
  expect(s.cards[g.refs.victim!]!.controller).toBe('alice');
  s = play(s, g.refs.played!);
  resume(
    s,
    choose(s, i => i.kind === 'target' && i.card === g.refs.maul),
  );
  s = target(s, g.refs.maul!);
  expect(s.cards[g.refs.maul!]!.zone).toBe('hand');
  expect(s.cards[g.refs.victim!]!.controller).toBe('bob');
  expect(s.delayedEffects).toHaveLength(0);
});

test('Maul can decline and does not steal without combat base damage', () => {
  const g = scenario(maulBoard());
  const pending = attack(g.state, g.refs.maul!, g.state.players.bob!.base);
  const s = step(pending, 'decline-effect');
  expect(s.delayedEffects).toHaveLength(0);
  const p = maulBoard();
  p.players[1].ground![0] = { card: ids.consular, ref: 'victim' };
  const h = scenario(p);
  const done = attack(h.state, h.refs.maul!, h.refs.victim!);
  expect(done.execution.decision!.kind).toBe('action');
  expect(done.delayedEffects).toHaveLength(0);
});

test('Maul must survive until the control effect resolves even when Overwhelm damaged the base', () => {
  const p = maulBoard();
  p.players[0].ground![0]!.damage = 7;
  p.players[1].ground!.push({ card: ids.fighter, ref: 'other', movedArena: true });
  const g = scenario(p);
  const s = attack(g.state, g.refs.maul!, g.refs.victim!);
  expect(s.cards[g.refs.maul!]!.zone).toBe('discard');
  expect(s.cards[s.players.bob!.base]!.damage).toBe(3);
  expect(s.cards[g.refs.other!]!.controller).toBe('bob');
  expect(s.delayedEffects).toHaveLength(0);
});

test('a departed stolen unit is a new copy when replayed and an older Maul schedule cannot reclaim it', () => {
  const p = maulBoard();
  p.players[0].hand!.push({ card: 'the-will-of-the-force', ref: 'second' });
  p.players[1].resources = Array.from({ length: 8 }, () => ({ card: ids.marine }));
  const g = scenario(p);
  let s = steal(g);
  s = step(s, 'pass');
  s = target(play(s, g.refs.played!), g.refs.victim!);
  s = play(s, g.refs.victim!);
  expect(s.cards[g.refs.victim!]!.controller).toBe('bob');
  changeControl(s, s.cards[g.refs.victim!]!, 'alice');
  s = target(play(s, g.refs.second!), g.refs.maul!);
  expect(s.cards[g.refs.victim!]!.controller).toBe('alice');
  expect(s.delayedEffects).toHaveLength(0);
});

test('Liberated by Darkness uses the Force then restores the owner at regroup, including attached token ownership', () => {
  const p = playFixture(liberated);
  p.players[0].force = true;
  p.players[1].ground = [{ card: ids.consular, ref: 'victim', exhausted: true }];
  p.attachments = [{ card: 'experience', unit: 'victim', ref: 'xp' }];
  const g = scenario(p);
  let s = step(play(g.state, g.refs.played!), 'accept-effect');
  expect(forceToken(s, 'alice')).toBeUndefined();
  resume(
    s,
    choose(s, i => i.kind === 'target' && i.card === g.refs.victim),
  );
  s = target(s, g.refs.victim!);
  expect(s.cards[g.refs.victim!]!.controller).toBe('alice');
  expect(s.delayedEffects[0]!.kind).toBe('control-at-regroup');
  s = regroup(s);
  expect(s.cards[g.refs.victim!]!).toMatchObject({ controller: 'bob', exhausted: false });
  expect(s.cards[g.refs.xp!]!).toMatchObject({ owner: 'bob', controller: 'bob' });
  expect(s.delayedEffects).toHaveLength(0);
});

test('Liberated without a Force token changes no control, and selecting an already friendly unit creates no return', () => {
  for (const withForce of [true, false]) {
    const p = playFixture(liberated);
    p.players[0].force = withForce;
    p.players[0].ground = [{ card: ids.marine, ref: 'own' }];
    const g = scenario(p);
    let s = play(g.state, g.refs.played!);
    if (withForce) s = target(step(s, 'accept-effect'), g.refs.own!);
    expect(s.delayedEffects).toHaveLength(0);
    expect(s.cards[g.refs.own!]!.controller).toBe('alice');
  }
});

test('token ownership changes preserve old ability origins and reject corrupt current ownership', () => {
  const p = maulBoard();
  p.attachments = [{ card: 'advantage', unit: 'victim', ref: 'token' }];
  const g = scenario(p);
  const origins = abilityOrigins(g.state, g.state.cards[g.refs.token!]!);
  let s = steal(g);
  s.lastingEffects.push({
    id: 'old-token-source',
    source: origins[0]!.card,
    target: {
      instanceId: g.refs.victim!,
      incarnation: s.cards[g.refs.victim!]!.incarnation,
      visibility: s.cards[g.refs.victim!]!.visibility,
      cardId: ids.marine,
    },
    power: 0,
    hp: 0,
    loseAbilities: false,
    expires: { kind: 'phase', phase: 'action', round: s.round },
  });
  expect(() => decodeState(encodeState(s))).not.toThrow();
  const broken = structuredClone(s);
  broken.cards[g.refs.token!]!.owner = 'bob';
  expect(() => decodeState(encodeState(broken))).toThrow('Invalid token upgrade ownership');
  const invalid = structuredClone(s);
  invalid.delayedEffects[0]!.target!.incarnation += 1;
  expect(() => decodeState(encodeState(invalid))).toThrow();
});

test('Dryden doubles his current attack power including granted Raid and skips only the next regroup ready step', () => {
  const p = position();
  p.players[0].ground = [{ card: dryden, ref: 'dryden' }];
  const g = scenario(p);
  modifyUnit(g.state, g.state.cards[g.refs.dryden!]!, g.state.cards[g.refs.dryden!]!, {
    kind: 'modify',
    power: 1,
    hp: 0,
    abilities: { raid: 2 },
    duration: 'phase',
  });
  let s = attack(g.state, g.refs.dryden!, g.state.players.bob!.base);
  resume(s, choose(s, 'accept-effect'));
  s = step(s, 'accept-effect');
  expect(s.cards[s.players.bob!.base]!.damage).toBe(10);
  expect(unitStats(s, s.cards[g.refs.dryden!]!).power).toBe(3);
  expect(cannotReady(s, s.cards[g.refs.dryden!]!)).toBe(false);
  expect(cannotReady(s, s.cards[g.refs.dryden!]!, true)).toBe(true);
  s = regroup(s);
  expect(s.cards[g.refs.dryden!]!.exhausted).toBe(true);
  expect(unitStats(s, s.cards[g.refs.dryden!]!).power).toBe(2);
  s = regroup(s);
  expect(s.cards[g.refs.dryden!]!.exhausted).toBe(false);
});

test('Dryden may decline doubling and retain normal regroup readiness', () => {
  const g = scenario(
    (() => {
      const p = playFixture('the-will-of-the-force');
      p.players[0].ground = [{ card: dryden, ref: 'dryden' }];
      return p;
    })(),
  );
  let s = step(attack(g.state, g.refs.dryden!, g.state.players.bob!.base), 'decline-effect');
  expect(s.lastingEffects).toHaveLength(0);
  s = regroup(s);
  expect(s.cards[g.refs.dryden!]!.exhausted).toBe(false);
});

test('Time of Crisis waits for both controllers choices, then deals all unchosen unit damage simultaneously', () => {
  const p = playFixture(crisis);
  for (const player of p.players)
    player.ground = [
      { card: ids.marine, ref: player.id + '-one' },
      { card: ids.consular, ref: player.id + '-two' },
    ];
  const g = scenario(p);
  let s = target(play(g.state, g.refs.played!), g.refs['alice-one']!);
  expect(s.execution.decision!.playerId).toBe('bob');
  expect(s.cards[g.refs['alice-two']!]!.damage).toBe(0);
  resume(
    s,
    choose(s, i => i.kind === 'target' && i.card === g.refs['bob-one']),
  );
  s = target(s, g.refs['bob-one']!);
  expect(s.cards[g.refs['alice-one']!]!.damage).toBe(0);
  expect(s.cards[g.refs['bob-one']!]!.damage).toBe(0);
  expect(s.cards[g.refs['alice-two']!]!.damage).toBe(3);
  expect(s.cards[g.refs['bob-two']!]!.damage).toBe(3);
});

test('Time of Crisis completes if either player has no units and can spare a deployed leader', () => {
  for (const missing of ['alice', 'bob']) {
    const p = playFixture(crisis);
    const player = p.players.find(p => p.id !== missing)!;
    player.leader = { card: ids.leader, ref: 'leader', deployedAs: 'unit' };
    player.space = [{ card: ids.fighter, ref: 'doomed' }];
    const g = scenario(p);
    const s = target(play(g.state, g.refs.played!), g.refs.leader!);
    expect(s.cards[g.refs.leader!]!.damage).toBe(0);
    expect(s.cards[g.refs.doomed!]!.zone).toBe('discard');
    expect(s.execution.decision!.kind).toBe('action');
  }
});

test('multiple Maul returns retain player ordering and all exact targets through recovery', () => {
  const p = maulBoard();
  p.players[1].ground!.push({ card: ids.consular, ref: 'second-victim' });
  const g = scenario(p);
  let s = regroup(steal(g));
  s = target(attack(s, g.refs.maul!, s.players.bob!.base), g.refs['second-victim']!);
  s = step(s, 'pass');
  s = target(play(s, g.refs.played!), g.refs.maul!);
  expect(s.execution.decision!.kind).toBe('delayed');
  expect(s.execution.decision!.playerId).toBe('alice');
  resume(s, choose(s, 'delayed'));
  s = step(s, 'delayed');
  expect(s.cards[g.refs.victim!]!.controller).toBe('bob');
  expect(s.cards[g.refs['second-victim']!]!.controller).toBe('bob');
});

test('Maul borrowed through Support creates a return tied to the attacking holder and retains its printed origin', () => {
  const p = maulBoard();
  p.players[0].ground!.push({ card: ids.consular, ref: 'holder' });
  const g = scenario(p);
  modifyUnit(g.state, g.state.cards[g.refs.maul!]!, g.state.cards[g.refs.maul!]!, {
    kind: 'modify',
    power: 0,
    hp: 0,
    abilities: { keywords: ['Support'] },
    duration: 'phase',
  });
  // Resolve an actual Support continuation using Maul's active abilities.
  g.state.execution.decision = null;
  collectTriggers(g.state, 'played', [g.state.cards[g.refs.maul!]!]);
  flushTriggers(g.state);
  settle(g.state);
  let s = attack(g.state, g.refs.holder!, g.state.players.bob!.base);
  resume(
    s,
    choose(s, i => i.kind === 'target' && i.card === g.refs.victim),
  );
  s = target(s, g.refs.victim!);
  const delay = s.delayedEffects[0]!;
  expect(delay.source.instanceId).toBe(g.refs.holder!);
  expect('origin' in delay && delay.origin?.card.instanceId).toBe(g.refs.maul!);
  expect(() => decodeState(encodeState(s))).not.toThrow();
  // The granting unit leaves first; its holder's delayed effect remains active.
  s = target(play(s, g.refs.played!), g.refs.maul!);
  expect(s.cards[g.refs.victim!]!.controller).toBe('alice');
});

test('Time of Crisis captures both damage assignments before replacement choices', () => {
  const p = playFixture(crisis);
  for (const player of p.players)
    player.ground = [
      { card: ids.marine, ref: player.id + '-spared' },
      { card: ids.consular, ref: player.id + '-hit' },
    ];
  p.attachments = [
    { card: 'shield', unit: 'alice-hit', ref: 'shield' },
    { card: 'shield', unit: 'alice-hit', ref: 'other-shield' },
  ];
  const g = scenario(p);
  let s = target(
    target(play(g.state, g.refs.played!), g.refs['alice-spared']!),
    g.refs['bob-spared']!,
  );
  expect(s.execution.decision!.kind).toBe('replacement');
  expect(s.cards[g.refs['bob-hit']!]!.damage).toBe(0);
  const frame = s.execution.frames[0]!;
  expect(frame.kind).toBe('damage');
  if (frame.kind !== 'damage') throw new Error('Missing simultaneous damage');
  expect(frame.assignments).toHaveLength(2);
  resume(
    s,
    choose(s, i => i.kind === 'target' && i.card === g.refs.shield),
  );
  s = target(s, g.refs.shield!);
  expect(s.cards[g.refs['alice-hit']!]!.damage).toBe(0);
  expect(s.cards[g.refs['bob-hit']!]!.damage).toBe(3);
});

import { expect, test } from 'bun:test';
import { advance, settle } from '../engine/advance.ts';
import {
  attachedUpgrades,
  canAttach,
  isUnit,
  sourcePower,
  unitStats,
} from '../engine/attachments.ts';
import { boundController } from '../engine/bindings.ts';
import { decodeState, encodeState } from '../engine/checkpoint.ts';
import { effectiveAbilities, supportSourceOrigins } from '../engine/effective-abilities.ts';
import { modifyUnit } from '../engine/lasting.ts';
import type { EngineInput, GameState, Intent } from '../engine/model.ts';
import { attachPilot, detachPilot } from '../engine/pilot-conversion.ts';
import { isUpgrade } from '../engine/roles.ts';
import { move, reference } from '../engine/state.ts';
import { Projector } from '../projection/projector.ts';
import { gameViewSchema } from '../view/parse.ts';
import { choose, ids, position } from './helpers.ts';
import { scenario } from './scenario.ts';
const corvus = 'corvus--inferno-squadron-raider',
  r2 = 'r2-d2--artooooooooo-',
  pilot = 'clone-pilot',
  han = 'han-solo--never-tell-me-the-odds';
const step = (s: GameState, i: Intent['kind'] | ((i: Intent) => boolean)) =>
  advance(s, choose(s, i)).state;
function board() {
  const p = position();
  p.players[0].resources = Array.from({ length: 14 }, () => ({ card: ids.marine }));
  p.players[0].hand = [
    { card: corvus, ref: 'corvus' },
    { card: 'eject', ref: 'eject' },
  ];
  p.players[0].ground = [{ card: pilot, damage: 1, ref: 'pilot' }];
  p.players[0].space = [{ card: 'razor-crest--ride-for-hire', ref: 'ship' }];
  p.players[1].ground = [{ card: pilot, ref: 'enemy-pilot' }];
  return p;
}
const play = (s: GameState, card: string) => step(s, i => i.kind === 'play' && i.card === card);
const pick = (s: GameState, card: string) => step(s, i => i.kind === 'target' && i.card === card);
function resume(s: GameState, input: EngineInput) {
  expect(decodeState(encodeState(s))).toEqual(s);
  const result = Bun.spawnSync(
    [process.execPath, new URL('./fixtures/resume.ts', import.meta.url).pathname],
    {
      stdin: new TextEncoder().encode(JSON.stringify({ state: encodeState(s), input })),
      stdout: 'pipe',
      stderr: 'pipe',
    },
  );
  expect(result.exitCode).toBe(0);
  expect(result.stderr.toString()).toBe('');
  expect(JSON.parse(result.stdout.toString())).toEqual(advance(s, input));
}
test('Corvus converts a friendly unit, clears damage and defeats upgrades without leaving play', () => {
  const p = board();
  p.attachments = [{ card: 'experience', unit: 'pilot', ref: 'experience' }];
  const g = scenario(p),
    before = reference(g.state.cards[g.refs.pilot!]!);
  const pending = play(g.state, g.refs.corvus!);
  expect(
    pending.execution.decision!.options.map(o => ('card' in o.intent ? o.intent.card : '')),
  ).not.toContain(g.refs['enemy-pilot']);
  resume(
    pending,
    choose(pending, i => i.kind === 'target' && i.card === g.refs.pilot),
  );
  const s = pick(pending, g.refs.pilot!),
    converted = s.cards[g.refs.pilot!]!;
  expect(reference(converted)).toEqual(before);
  expect(converted).toMatchObject({
    zone: 'space',
    damage: 0,
    exhausted: false,
    attachedTo: { instanceId: g.refs.corvus },
  });
  expect(isUpgrade(s, converted)).toBe(true);
  expect(isUnit(s, converted)).toBe(false);
  expect(s.cards[g.refs.experience!]!.zone).toBe('set-aside');
  expect(s.departedUnits).toHaveLength(0);
  expect(s.departedUpgrades).toHaveLength(1);
  expect(s.phaseHistory.entered.map(r => r.instanceId)).toEqual([g.refs.corvus!]);
  expect(s.phaseHistory.defeated).toHaveLength(0);
  expect(unitStats(s, s.cards[g.refs.corvus!]!)).toEqual({ power: 6, hp: 7 });
  expect(effectiveAbilities(s, s.cards[g.refs.corvus!]!).restore).toBe(2);
  expect(decodeState(encodeState(s))).toEqual(s);
});
test('Corvus may decline, or finish when no friendly Pilot exists', () => {
  const g = scenario(board());
  const s = step(play(g.state, g.refs.corvus!), 'decline-effect');
  expect(s.cards[g.refs.pilot!]!.zone).toBe('ground');
  const p = board();
  p.players[0].ground = [];
  const empty = scenario(p),
    after = play(empty.state, empty.refs.corvus!);
  expect(after.activePlayer).toBe('bob');
  expect(after.execution.decision!.kind).toBe('action');
});
test('conversion rescues captured cards and does not defeat their former guard', () => {
  const p = board();
  p.captured = [{ card: ids.marine, owner: 'bob', guard: 'pilot', ref: 'prisoner' }];
  const g = scenario(p),
    s = pick(play(g.state, g.refs.corvus!), g.refs.pilot!);
  expect(s.cards[g.refs.prisoner!]!).toMatchObject({
    zone: 'ground',
    controller: 'bob',
    exhausted: true,
    capturedBy: null,
  });
  expect(s.phaseHistory.defeated).toHaveLength(0);
  expect(s.facts.some(f => f.type === 'rescued')).toBe(true);
});
test('Corvus can reattach a played Pilot upgrade while retaining its Piloting restrictions', () => {
  const p = board();
  p.players[0].ground = [];
  p.attachments = [{ card: pilot, unit: 'ship', ref: 'pilot' }];
  const g = scenario(p),
    before = reference(g.state.cards[g.refs.pilot!]!);
  const s = pick(play(g.state, g.refs.corvus!), g.refs.pilot!);
  expect(reference(s.cards[g.refs.pilot!]!)).toEqual(before);
  expect(s.cards[g.refs.pilot!]!.attachmentRestriction).toBeUndefined();
  expect(canAttach(s, s.cards[g.refs.pilot!]!, s.cards[g.refs.ship!]!)).toBe(true);
  expect(s.departedUpgrades).toHaveLength(0);
  expect(s.facts.some(f => f.type === 'converted-to-upgrade')).toBe(false);
});
test('converting a unit can attach it beside another Pilot; the conversion restriction prevents reattachment elsewhere', () => {
  const p = board();
  p.players[0].hand = [];
  p.players[0].space = [
    { card: corvus, ref: 'corvus' },
    { card: 'razor-crest--ride-for-hire', ref: 'ship' },
  ];
  p.attachments = [{ card: pilot, unit: 'corvus', ref: 'already' }];
  const g = scenario(p),
    c = g.state.cards[g.refs.corvus!]!,
    unit = g.state.cards[g.refs.pilot!]!;
  attachPilot(g.state, unit, c, c);
  expect(attachedUpgrades(g.state, c)).toHaveLength(2);
  expect(canAttach(g.state, unit, g.state.cards[g.refs.ship!]!)).toBe(false);
  detachPilot(g.state, unit, c);
  expect(unit.attachmentRestriction).toBeUndefined();
  expect(canAttach(g.state, unit, g.state.cards[g.refs.ship!]!)).toBe(true);
});
test('Eject detaches either player’s Pilot to ground exhausted and draws one independently', () => {
  const p = board();
  p.players[0].hand = [{ card: 'eject', ref: 'eject' }];
  p.players[1].space = [{ card: ids.fighter, ref: 'enemy-ship' }];
  p.attachments = [
    { card: pilot, unit: 'ship', ref: 'friendly' },
    { card: pilot, owner: 'bob', unit: 'enemy-ship', ref: 'enemy' },
  ];
  const g = scenario(p),
    before = reference(g.state.cards[g.refs.enemy!]!),
    pending = play(g.state, g.refs.eject!);
  expect(
    pending.execution.decision!.options.map(o => ('card' in o.intent ? o.intent.card : '')),
  ).toEqual([g.refs.friendly!, g.refs.enemy!]);
  resume(
    pending,
    choose(pending, i => i.kind === 'target' && i.card === g.refs.enemy),
  );
  const s = pick(pending, g.refs.enemy!);
  expect(s.cards[g.refs.enemy!]!).toMatchObject({
    zone: 'ground',
    controller: 'bob',
    exhausted: true,
    attachedTo: null,
  });
  expect(reference(s.cards[g.refs.enemy!]!)).toEqual(before);
  expect(s.players.alice!.hand).toHaveLength(1);
  expect(s.phaseHistory.entered).toHaveLength(0);
  expect(s.departedUpgrades).toHaveLength(0);
  expect(decodeState(encodeState(s))).toEqual(s);
  const empty = scenario(board()),
    after = play(empty.state, empty.refs.eject!);
  expect(after.players.alice!.hand).toHaveLength(2);
});
test('Eject may remove lethal HP support without defeating the Pilot or triggering its entry text', () => {
  const p = board();
  p.players[0].hand = [{ card: 'eject', ref: 'eject' }];
  p.players[0].space = [{ card: ids.fighter, damage: 1, ref: 'ship' }];
  p.attachments = [{ card: pilot, unit: 'ship', ref: 'attached' }];
  const g = scenario(p),
    s = pick(play(g.state, g.refs.eject!), g.refs.attached!);
  expect(s.cards[g.refs.ship!]!.zone).toBe('discard');
  expect(isUnit(s, s.cards[g.refs.attached!]!)).toBe(true);
  expect(s.phaseHistory.defeated.map(c => c.instanceId)).toEqual([g.refs.ship!]);
});
test('Pilot leaders keep their used deployment through conversion and Eject', () => {
  const p = board();
  p.players[0].leader = {
    card: han,
    ref: 'leader',
    deployedAs: 'unit',
    abilityUses: { deploy: 1 },
  };
  const g = scenario(p),
    before = reference(g.state.cards[g.refs.leader!]!);
  let s = pick(play(g.state, g.refs.corvus!), g.refs.leader!);
  expect(s.cards[g.refs.leader!]!).toMatchObject({
    deployedAs: 'upgrade',
    abilityUses: { deploy: 1 },
  });
  s = pick(play(step(s, 'pass'), g.refs.eject!), g.refs.leader!);
  expect(s.cards[g.refs.leader!]!).toMatchObject({
    deployedAs: 'unit',
    exhausted: true,
    abilityUses: { deploy: 1 },
  });
  expect(reference(s.cards[g.refs.leader!]!)).toEqual(before);
  expect(s.facts.some(f => f.type === 'deployed')).toBe(false);
});
test('unit stat bonuses do not become upgrade modifiers, while ability loss persists on the same incarnation', () => {
  const p = board();
  p.players[0].ground = [{ card: r2, ref: 'pilot' }];
  const g = scenario(p),
    card = g.state.cards[g.refs.pilot!]!;
  modifyUnit(g.state, card, card, {
    kind: 'modify',
    power: 4,
    hp: 4,
    loseAbilities: true,
    duration: 'phase',
  });
  const s = pick(play(g.state, g.refs.corvus!), g.refs.pilot!),
    host = s.cards[g.refs.corvus!]!;
  expect(unitStats(s, host)).toEqual({ power: 5, hp: 6 });
  expect(effectiveAbilities(s, host).extraPilotSlots ?? 0).toBe(0);
  s.lastingEffects = [];
  expect(effectiveAbilities(s, host).extraPilotSlots).toBe(1);
});
test('source power and abilities follow the current role, then its actual departure role', () => {
  const g = scenario(board()),
    s = pick(play(g.state, g.refs.corvus!), g.refs.pilot!);
  const unit = s.cards[g.refs.pilot!]!,
    ref = reference(unit);
  expect(sourcePower(s, ref)).toBe(0);
  expect(supportSourceOrigins(s, unit)[0]!.card.attachedTo).not.toBeNull();
  move(s, unit, 'discard');
  expect(s.departedUnits).toHaveLength(0);
  expect(s.departedUpgrades).toHaveLength(1);
  expect(sourcePower(s, ref)).toBe(0);
  expect(boundController(s, { source: unit }, 'source')).toBe('alice');
  expect(supportSourceOrigins(s, unit)[0]!.card.attachedTo).not.toBeNull();
  s.execution.decision = null;
  settle(s);
  expect(decodeState(encodeState(s))).toEqual(s);
});
test('a Pilot that becomes a unit again records unit statistics on its eventual departure', () => {
  const g = scenario(board());
  let s = pick(play(g.state, g.refs.corvus!), g.refs.pilot!);
  s = pick(play(step(s, 'pass'), g.refs.eject!), g.refs.pilot!);
  const card = s.cards[g.refs.pilot!]!,
    ref = reference(card),
    power = unitStats(s, card).power;
  move(s, card, 'discard');
  expect(sourcePower(s, ref)).toBe(power);
  expect(s.departedUpgrades).toHaveLength(0);
  expect(s.departedUnits).toHaveLength(1);
});
test('conversion prompts and facts expose only ordinary public references to each viewer', () => {
  const g = scenario(board()),
    s = play(g.state, g.refs.corvus!);
  for (const audience of [
    { role: 'player' as const, playerId: 'alice' },
    { role: 'player' as const, playerId: 'bob' },
    { role: 'spectator' as const },
  ]) {
    const v = new Projector(s.gameId, audience, 'p'.repeat(32)).project(s);
    expect(gameViewSchema.parse(v)).toEqual(v);
    expect(v.decision === null).toBe(audience.role === 'spectator' || audience.playerId === 'bob');
    expect(JSON.stringify(v)).not.toContain('departedUpgrades');
    expect(JSON.stringify(v)).not.toContain(JSON.stringify(g.refs.eject!));
  }
});
test('checkpoints reject invented attachment restrictions and departure roles', () => {
  const g = scenario(board()),
    s = pick(play(g.state, g.refs.corvus!), g.refs.pilot!);
  const corrupt = structuredClone(s);
  const restriction = corrupt.cards[g.refs.pilot!]!.attachmentRestriction!;
  if (restriction.kind !== 'exact-host') throw new Error('Expected exact-host restriction');
  restriction.host.instanceId = g.refs.ship!;
  expect(() => decodeState(encodeState(corrupt))).toThrow('attachment restriction');
  const card = s.cards[g.refs.pilot!]!;
  move(s, card, 'discard');
  const history = s.departedUpgrades[0]!;
  history.abilities[0]!.card.attachedTo = null;
  expect(() => decodeState(encodeState(s))).toThrow('departed upgrade');
});
test('temporary control returns the same card even while it is now an upgrade', () => {
  const p = board();
  p.players[0].force = true;
  p.players[0].resources = Array.from({ length: 22 }, () => ({ card: ids.marine }));
  p.players[0].hand!.push({ card: 'liberated-by-darkness', ref: 'steal' });
  const g = scenario(p);
  let s = play(g.state, g.refs.steal!);
  if (s.execution.decision!.options.some(o => o.intent.kind === 'accept-effect'))
    s = step(s, 'accept-effect');
  s = pick(s, g.refs['enemy-pilot']!);
  s = pick(play(step(s, 'pass'), g.refs.corvus!), g.refs['enemy-pilot']!);
  const stolen = s.cards[g.refs['enemy-pilot']!]!;
  expect(stolen.controller).toBe('alice');
  expect(isUpgrade(s, stolen)).toBe(true);
  resume(s, choose(s, 'pass'));
  s = step(step(s, 'pass'), 'pass');
  expect(s.cards[stolen.instanceId]!).toMatchObject({
    controller: 'bob',
    attachedTo: { instanceId: g.refs.corvus },
  });
  expect(isUpgrade(s, s.cards[stolen.instanceId]!)).toBe(true);
  expect(s.facts.filter(f => f.type === 'control-changed')).toHaveLength(2);
});
test('conversion permanently removes the unit from its active combat even if it becomes a unit again', () => {
  const p = board();
  p.players[0].hand = [];
  p.players[0].ground = [];
  p.players[0].leader = {
    card: 'kazuda-xiono--best-pilot-in-the-galaxy',
    ref: 'pilot',
    deployedAs: 'unit',
    abilityUses: { deploy: 1 },
  };
  p.players[0].space = [{ card: corvus, ref: 'corvus' }];
  const g = scenario(p),
    s = step(g.state, i => i.kind === 'attack' && i.attacker === g.refs.pilot);
  expect(s.attacks).toHaveLength(1);
  const c = s.cards[g.refs.corvus!]!,
    unit = s.cards[g.refs.pilot!]!;
  attachPilot(s, unit, c, c);
  detachPilot(s, unit, c);
  expect(s.attacks[0]!.removedFromCombat).toContainEqual(reference(unit));
  const after = advance(s, choose(s, 'accept-effect', [])).state;
  expect(after.cards[after.players.bob!.base]!.damage).toBe(0);
  expect(after.attacks).toHaveLength(0);
});
test('converting Astromech does not replay its upgrade ability; attaching still triggers the host’s Pilot observation', () => {
  const p = board();
  p.players[0].ground = [
    { card: 'astromech-pilot', ref: 'pilot' },
    { card: ids.marine, damage: 1, ref: 'damaged' },
  ];
  const g = scenario(p),
    s = pick(play(g.state, g.refs.corvus!), g.refs.pilot!);
  expect(s.cards[g.refs.damaged!]!.damage).toBe(1);
  expect(s.execution.decision!.kind).toBe('action');
  const p2 = board();
  p2.players[0].hand = [];
  const h = scenario(p2),
    ship = h.state.cards[h.refs.ship!]!;
  attachPilot(h.state, h.state.cards[h.refs.pilot!]!, ship, ship);
  expect(h.state.execution.pendingTriggers.some(t => t.abilityId === 'pilot-return')).toBe(true);
});
test('last known upgrade control is the control at departure rather than the printed owner', () => {
  const p = board();
  p.players[0].ground = [];
  p.players[1].ground = [{ card: pilot, controller: 'alice', ref: 'stolen' }];
  const g = scenario(p),
    s = pick(play(g.state, g.refs.corvus!), g.refs.stolen!);
  const card = s.cards[g.refs.stolen!]!,
    snapshot = structuredClone(card);
  move(s, card, 'discard');
  expect(card.controller).toBe('bob');
  expect(boundController(s, { source: snapshot }, 'source')).toBe('alice');
  expect(s.departedUpgrades[0]!.controller).toBe('alice');
});

import { expect, test } from 'bun:test';
import { advance, settle } from '../engine/advance.ts';
import { defeatUpgrades, isUnit, unitStats } from '../engine/attachments.ts';
import { decodeState, encodeState } from '../engine/checkpoint.ts';
import { modifyUnit } from '../engine/lasting.ts';
import type { EngineInput, GameState, Intent } from '../engine/model.ts';
import { attachPilot } from '../engine/pilot-conversion.ts';
import { isUpgrade } from '../engine/roles.ts';
import { addCard, reference } from '../engine/state.ts';
import { Projector } from '../projection/projector.ts';
import { gameViewSchema } from '../view/parse.ts';
import { choose, ids, position } from './helpers.ts';
import { scenario } from './scenario.ts';
const luke = 'luke-skywalker--you-still-with-me-',
  corvus = 'corvus--inferno-squadron-raider';
const step = (
  s: GameState,
  i: Intent['kind'] | ((i: Intent) => boolean),
  selected: string[] = [],
) => advance(s, choose(s, i, selected)).state;
const play = (s: GameState, card: string) => step(s, i => i.kind === 'play' && i.card === card);
const pick = (s: GameState, card: string) => step(s, i => i.kind === 'target' && i.card === card);
function board(card = 'outer-rim-constable', owner = 'alice') {
  const p = position();
  p.players[0].resources = Array.from({ length: 14 }, () => ({ card: ids.marine }));
  p.players[0].hand = [{ card, ref: 'removal' }];
  p.players[owner === 'alice' ? 0 : 1].space = [{ card: ids.fighter, ref: 'ship' }];
  p.attachments = [{ card: luke, unit: 'ship', owner, ref: 'luke' }];
  return p;
}
function direct(g: ReturnType<typeof scenario>) {
  return pick(play(g.state, g.refs.removal!), g.refs.luke!);
}
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
test('Luke plays as a 3/2 unit for two or a +3/+2 Pilot for three, with replacement only on the upgrade face', () => {
  const p = board();
  p.attachments = [];
  p.players[0].hand = [{ card: luke, ref: 'luke' }];
  const g = scenario(p),
    options = g.state.execution.decision!.options.filter(o => o.intent.kind === 'play');
  expect(options).toHaveLength(2);
  const unit = step(g.state, i => i.kind === 'play' && !i.piloting);
  expect(unitStats(unit, unit.cards[g.refs.luke!]!)).toEqual({ power: 3, hp: 2 });
  expect(unit.facts.find(f => f.type === 'played')!.amount).toBe(2);
  const upgrade = step(g.state, i => i.kind === 'play' && !!i.piloting);
  expect(unitStats(upgrade, upgrade.cards[g.refs.ship!]!)).toEqual({ power: 5, hp: 3 });
  expect(upgrade.facts.find(f => f.type === 'played')!.amount).toBe(3);
});
test('direct upgrade defeat offers Luke’s controller a recoverable replacement before moving the card', () => {
  const g = scenario(board()),
    s = direct(g),
    before = reference(g.state.cards[g.refs.luke!]!);
  expect(s.execution.decision!).toMatchObject({ kind: 'replacement', playerId: 'alice' });
  expect(isUpgrade(s, s.cards[g.refs.luke!]!)).toBe(true);
  expect(s.facts.some(f => f.type === 'defeated')).toBe(false);
  resume(s, choose(s, 'accept-effect'));
  resume(s, choose(s, 'decline-effect'));
  const after = step(s, 'accept-effect');
  expect(after.cards[g.refs.luke!]!).toMatchObject({
    zone: 'ground',
    exhausted: true,
    damage: 0,
    attachedTo: null,
  });
  expect(reference(after.cards[g.refs.luke!]!)).toEqual(before);
  expect(after.phaseHistory.entered.map(r => r.instanceId)).toEqual([g.refs.removal!]);
  expect(after.phaseHistory.defeated).toHaveLength(0);
  expect(after.facts.some(f => f.type === 'upgrade-defeat-replaced')).toBe(true);
  expect(after.departedUpgrades).toHaveLength(0);
});
test('declining defeats the upgrade and records its final role without offering a second replacement', () => {
  const p = board();
  p.players[0].ground = [{ card: 'zeb-orrelios--fists-work-every-time' }];
  const g = scenario(p),
    pending = step(direct(g), 'decline-effect');
  const s = pick(pending, pending.players.bob!.base);
  expect(s.cards[g.refs.luke!]!.zone).toBe('discard');
  expect(s.departedUpgrades.map(e => e.reference.instanceId)).toEqual([g.refs.luke!]);
  expect(s.cards[s.players.bob!.base]!.damage).toBe(1);
  expect(s.execution.decision!.kind).toBe('action');
});
test('replacing defeat does not trigger friendly upgrade defeat observers', () => {
  const p = board();
  p.players[0].ground = [{ card: 'zeb-orrelios--fists-work-every-time' }];
  const g = scenario(p),
    s = step(direct(g), 'accept-effect');
  expect(s.cards[s.players.bob!.base]!.damage).toBe(0);
  expect(s.facts.some(f => f.type === 'defeated')).toBe(false);
});
test('losing Luke’s abilities suppresses the upgrade replacement and does not remove printed modifiers', () => {
  const g = scenario(board()),
    card = g.state.cards[g.refs.luke!]!;
  modifyUnit(g.state, card, card, {
    kind: 'modify',
    power: 0,
    hp: 0,
    loseAbilities: true,
    duration: 'phase',
  });
  expect(unitStats(g.state, g.state.cards[g.refs.ship!]!)).toEqual({ power: 5, hp: 3 });
  const s = direct(g);
  expect(s.cards[g.refs.luke!]!.zone).toBe('discard');
  expect(s.execution.decision!.kind).toBe('action');
});
test('a unit-face Luke is defeated normally without an escape choice', () => {
  const p = board('open-fire');
  p.attachments = [];
  p.players[0].ground = [{ card: luke, ref: 'luke' }];
  const g = scenario(p),
    s = pick(play(g.state, g.refs.removal!), g.refs.luke!);
  expect(s.cards[g.refs.luke!]!.zone).toBe('discard');
  expect(s.departedUnits.map(e => e.reference.instanceId)).toEqual([g.refs.luke!]);
  expect(s.execution.decision!.kind).toBe('action');
});
test('a defeated vehicle leaves Luke available for a choice and recovery uses the old host incarnation', () => {
  const g = scenario(board('open-fire', 'bob')),
    s = pick(play(g.state, g.refs.removal!), g.refs.ship!);
  expect(s.cards[g.refs.ship!]!.zone).toBe('discard');
  expect(s.execution.decision!).toMatchObject({ kind: 'replacement', playerId: 'bob' });
  expect(isUpgrade(s, s.cards[g.refs.luke!]!)).toBe(true);
  resume(s, choose(s, 'accept-effect'));
  resume(s, choose(s, 'decline-effect'));
  const after = step(s, 'accept-effect');
  expect(after.cards[g.refs.luke!]!).toMatchObject({
    zone: 'ground',
    controller: 'bob',
    exhausted: true,
  });
  expect(after.phaseHistory.defeated.map(c => c.instanceId)).toEqual([g.refs.ship!]);
  expect(after.departedUpgrades).toHaveLength(0);
});
test('leaving by capture also offers replacement; Luke is never captured with the vehicle', () => {
  const g = scenario(board('arrest', 'bob')),
    s = pick(play(g.state, g.refs.removal!), g.refs.ship!);
  expect(s.cards[g.refs.ship!]!.zone).toBe('captured');
  resume(s, choose(s, 'accept-effect'));
  const after = step(s, 'accept-effect');
  expect(after.captured).toEqual([g.refs.ship!]);
  expect(after.cards[g.refs.luke!]!).toMatchObject({
    zone: 'ground',
    controller: 'bob',
    capturedBy: null,
  });
});
test('a returned vehicle does not take Luke into hand and replacement follows that departure', () => {
  const g = scenario(board('beguile', 'bob'));
  const inspected = play(g.state, g.refs.removal!);
  const s = pick(step(inspected, 'accept-effect'), g.refs.ship!);
  expect(s.cards[g.refs.ship!]!.zone).toBe('hand');
  resume(s, choose(s, 'accept-effect'));
  const after = step(s, 'accept-effect');
  expect(after.cards[g.refs.luke!]!.zone).toBe('ground');
  expect(after.players.bob!.hand).toEqual([g.refs.ship!]);
});
test('returning Luke himself to hand is not a defeat and offers no replacement', () => {
  const p = board('there-is-no-conflict');
  const g = scenario(p),
    played = step(g.state, i => i.kind === 'play' && i.target === g.refs.ship);
  const s = step(played, 'accept-effect', [g.refs.luke!]);
  expect(s.cards[g.refs.luke!]!.zone).toBe('hand');
  expect(s.facts.some(f => f.type === 'upgrade-defeat-replaced')).toBe(false);
});
test('System Shock’s conditional damage still resolves after Luke replaces the defeat', () => {
  const p = board('system-shock');
  p.players[0].space = [{ card: corvus, ref: 'ship' }];
  const g = scenario(p),
    s = step(play(g.state, g.refs.removal!), 'accept-effect', [g.refs.luke!]);
  expect(s.execution.decision!.kind).toBe('replacement');
  expect(s.cards[g.refs.ship!]!.damage).toBe(0);
  resume(s, choose(s, 'accept-effect'));
  const after = step(s, 'accept-effect');
  expect(after.cards[g.refs.ship!]!.damage).toBe(1);
  expect(after.cards[g.refs.luke!]!.zone).toBe('ground');
});
test('Reforge’s search still follows a replaced defeat, after the Pilot has converted', () => {
  const g = scenario(board('reforge'));
  let s = pick(play(g.state, g.refs.removal!), g.refs.ship!);
  s = step(s, 'accept-effect', [g.refs.luke!]);
  expect(s.execution.decision!.kind).toBe('replacement');
  const after = step(s, 'accept-effect');
  expect(after.execution.decision!.kind).toBe('search');
  expect(after.cards[g.refs.luke!]!.zone).toBe('ground');
  resume(after, choose(after, 'search', []));
});
test('the original ability cannot replay a destroyed vehicle until Luke’s replacement resolves', () => {
  const g = scenario(board('one-must-destroy-to-create'));
  const s = pick(play(g.state, g.refs.removal!), g.refs.ship!);
  expect(s.execution.decision!.kind).toBe('replacement');
  const after = step(s, 'accept-effect');
  expect(
    after.execution.decision!.options.some(
      o => o.intent.kind === 'play' && o.intent.card === g.refs.ship,
    ),
  ).toBe(true);
  const replayed = play(after, g.refs.ship!);
  expect(replayed.cards[g.refs.ship!]!.incarnation).toBeGreaterThan(
    g.state.cards[g.refs.ship!]!.incarnation,
  );
  expect(replayed.cards[g.refs.luke!]!.attachedTo).toBeNull();
});
test('combat defeats the ship while Luke escapes after damage without joining that combat', () => {
  const p = board('outer-rim-constable', 'bob');
  p.players[0].space = [{ card: 'red-squadron-x-wing', ref: 'attacker' }];
  const g = scenario(p),
    s = step(
      g.state,
      i => i.kind === 'attack' && i.attacker === g.refs.attacker && i.defender === g.refs.ship,
    );
  expect(s.execution.decision!.kind).toBe('replacement');
  resume(s, choose(s, 'accept-effect'));
  const after = step(s, 'accept-effect');
  expect(after.cards[g.refs.ship!]!.zone).toBe('discard');
  expect(after.cards[g.refs.attacker!]!.zone).toBe('discard');
  expect(after.cards[g.refs.luke!]!).toMatchObject({ zone: 'ground', damage: 0, exhausted: true });
  expect(after.attacks).toHaveLength(0);
});
test('the same Pilot can escape again after Corvus attaches him as an upgrade', () => {
  const p = board();
  p.players[0].hand!.push({ card: corvus, ref: 'corvus' });
  const g = scenario(p);
  let s = step(direct(g), 'accept-effect');
  s = pick(play(step(s, 'pass'), g.refs.corvus!), g.refs.luke!);
  const removal = addCard(s, 'alice', 'outer-rim-constable', 'hand');
  s = pick(play(step(s, 'pass'), removal.instanceId), g.refs.luke!);
  const after = step(s, 'accept-effect');
  expect(after.facts.filter(f => f.type === 'upgrade-defeat-replaced')).toHaveLength(2);
  expect(reference(after.cards[g.refs.luke!]!)).toEqual(reference(g.state.cards[g.refs.luke!]!));
  expect(after.cards[g.refs.luke!]!.attachmentRestriction).toBeUndefined();
});
test('uniqueness resolves again after replacement instead of silently keeping two Luke copies', () => {
  const p = board();
  p.players[0].hand = [{ card: luke, ref: 'new-luke' }];
  const g = scenario(p),
    played = play(g.state, g.refs['new-luke']!);
  const s = step(played, i => i.kind === 'keep-unique' && i.card === g.refs['new-luke']);
  expect(s.execution.decision!.kind).toBe('replacement');
  const converted = step(s, 'accept-effect');
  expect(converted.execution.decision!.kind).toBe('unique');
  resume(
    converted,
    choose(converted, i => i.kind === 'keep-unique' && i.card === g.refs.luke),
  );
  const after = step(converted, i => i.kind === 'keep-unique' && i.card === g.refs.luke);
  expect(after.cards[g.refs['new-luke']!]!.zone).toBe('discard');
  expect(isUnit(after, after.cards[g.refs.luke!]!)).toBe(true);
});
test('conversion cleanup waits for an attached Luke before changing the host into an upgrade', () => {
  const p = position();
  p.players[0].ground = [
    { card: 'clone-pilot', ref: 'pilot' },
    { card: luke, ref: 'luke' },
  ];
  p.players[0].space = [{ card: corvus, ref: 'corvus' }];
  const g = scenario(p),
    s = g.state,
    pilot = s.cards[g.refs.pilot!]!,
    c = s.cards[g.refs.corvus!]!;
  // A fillable in-play scenario uses the same role conversion primitive.
  attachPilot(s, s.cards[g.refs.luke!]!, pilot, c);
  pilot.damage = 3; // Survives only while Luke supplies +2 HP.
  attachPilot(s, pilot, c, c);
  s.execution.decision = null;
  settle(s);
  expect(s.execution.frames.some(f => f.kind === 'convert-pilot')).toBe(true);
  resume(s, choose(s, 'accept-effect'));
  const after = step(s, 'accept-effect');
  expect(after.cards[g.refs.pilot!]!).toMatchObject({
    zone: 'space',
    damage: 0,
    attachedTo: { instanceId: g.refs.corvus },
  });
  expect(after.cards[g.refs.luke!]!).toMatchObject({
    zone: 'ground',
    exhausted: true,
    attachedTo: null,
  });
});
test('conceding during a host-departure replacement preserves a valid finished checkpoint', () => {
  const g = scenario(board('open-fire', 'bob')),
    s = pick(play(g.state, g.refs.removal!), g.refs.ship!);
  const input: EngineInput = {
    type: 'concede',
    gameId: s.gameId,
    expectedRevision: s.revision,
    playerId: 'bob',
  };
  resume(s, input);
  const after = advance(s, input).state;
  expect(after.phase).toBe('ended');
  expect(decodeState(encodeState(after))).toEqual(after);
});
test('only Luke’s controller receives the replacement; the source reference remains public and exact', () => {
  const g = scenario(board('open-fire', 'bob')),
    s = pick(play(g.state, g.refs.removal!), g.refs.ship!);
  for (const playerId of ['alice', 'bob']) {
    const view = new Projector(s.gameId, { role: 'player', playerId }, 'p'.repeat(32)).project(s);
    expect(gameViewSchema.parse(view)).toEqual(view);
    expect(view.decision === null).toBe(playerId === 'alice');
    if (view.decision) {
      expect(view.decision.source!.cardId).toBe(luke);
      expect(view.cards.some(c => c.id === view.decision!.source!.currentCardId)).toBe(true);
    }
    expect(JSON.stringify(view)).not.toContain('origins');
  }
  const spectator = new Projector(s.gameId, { role: 'spectator' }, 'p'.repeat(32)).project(s);
  expect(spectator.decision).toBeNull();
});
test('checkpoint validation rejects repeated or fabricated replacement holders', () => {
  const g = scenario(board()),
    s = direct(g);
  const repeated = structuredClone(s);
  repeated.execution.frames.push(structuredClone(repeated.execution.frames[0]!));
  expect(() => decodeState(encodeState(repeated))).toThrow('pending upgrade defeat');
  const forged = structuredClone(s),
    frame = forged.execution.frames[0]!;
  if (frame.kind !== 'upgrade-defeat') throw new Error('Missing replacement');
  frame.card.controller = 'bob';
  expect(() => decodeState(encodeState(forged))).toThrow('pending upgrade defeat');
});
test('simultaneous upgrade removal retains separate decisions and observers for both players', () => {
  const p = board();
  p.players[1].space = [{ card: ids.fighter, ref: 'other-ship' }];
  p.players[0].ground = [{ card: 'zeb-orrelios--fists-work-every-time' }];
  p.attachments!.push({ card: luke, unit: 'other-ship', owner: 'bob', ref: 'other-luke' });
  const g = scenario(p),
    s = g.state;
  defeatUpgrades(s, [s.cards[g.refs.luke!]!, s.cards[g.refs['other-luke']!]!]);
  s.execution.decision = null;
  settle(s);
  const first = s.execution.decision!.playerId;
  resume(s, choose(s, 'accept-effect'));
  const next = step(s, 'accept-effect');
  expect(next.execution.decision!.kind).toBe('replacement');
  expect(next.execution.decision!.playerId).not.toBe(first);
  resume(next, choose(next, 'accept-effect'));
  const after = step(next, 'accept-effect');
  expect(isUnit(after, after.cards[g.refs.luke!]!)).toBe(true);
  expect(isUnit(after, after.cards[g.refs['other-luke']!]!)).toBe(true);
  expect(after.facts.some(f => f.type === 'defeated')).toBe(false);
});
test('an orphan with no matching replacement continuation remains an invalid checkpoint', () => {
  const g = scenario(board('open-fire', 'bob')),
    s = pick(play(g.state, g.refs.removal!), g.refs.ship!);
  s.execution.frames = s.execution.frames.filter(f => f.kind !== 'upgrade-defeat');
  expect(() => decodeState(encodeState(s))).toThrow('attachment parent');
});
test('persistent unit HP reduction can defeat Luke after escape without another upgrade replacement', () => {
  const g = scenario(board()),
    card = g.state.cards[g.refs.luke!]!;
  modifyUnit(g.state, card, card, { kind: 'modify', power: 0, hp: -2, duration: 'phase' });
  expect(unitStats(g.state, g.state.cards[g.refs.ship!]!).hp).toBe(3);
  const s = step(direct(g), 'accept-effect');
  expect(s.cards[g.refs.luke!]!.zone).toBe('discard');
  expect(s.departedUnits.map(d => d.reference.instanceId)).toEqual([g.refs.luke!]);
  expect(s.departedUpgrades).toHaveLength(0);
  expect(s.facts.filter(f => f.type === 'upgrade-defeat-replaced')).toHaveLength(1);
});
test('a host-scoped ability loss ends when the vehicle leaves, before Luke’s resulting upgrade defeat', () => {
  const g = scenario(board('open-fire')),
    card = g.state.cards[g.refs.luke!]!,
    ship = g.state.cards[g.refs.ship!]!;
  modifyUnit(g.state, ship, card, {
    kind: 'modify',
    power: 0,
    hp: 0,
    loseAbilities: true,
    duration: 'source-in-play',
  });
  const s = pick(play(g.state, g.refs.removal!), g.refs.ship!);
  expect(s.execution.decision!.kind).toBe('replacement');
  resume(s, choose(s, 'accept-effect'));
  expect(step(s, 'accept-effect').cards[g.refs.luke!]!.zone).toBe('ground');
});

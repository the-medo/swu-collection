import { expect, test } from 'bun:test';
import { unitStats } from '../engine/attachments.ts';
import { advance } from '../engine/advance.ts';
import { decodeState, encodeState } from '../engine/checkpoint.ts';
import { modifyUnit } from '../engine/lasting.ts';
import type { GameState, Intent } from '../engine/model.ts';
import { move } from '../engine/state.ts';
import { Projector } from '../projection/projector.ts';
import { scenario } from './scenario.ts';
import { choose, ids, position } from './helpers.ts';
const thrawn = 'grand-admiral-thrawn-----how-unfortunate',
  chimaera = 'chimaera--reinforcing-the-center';
const step = (
  s: GameState,
  i: Intent['kind'] | ((i: Intent) => boolean),
  selected: string[] = [],
) => advance(s, choose(s, i, selected)).state;
function board(unit = false) {
  const p = position();
  p.activePlayer = 'bob';
  p.players[0].leader = {
    card: thrawn,
    ref: 'thrawn',
    ...(unit ? { deployedAs: 'unit' as const, abilityUses: { deploy: 1 } } : {}),
  };
  p.players[0].ground = [
    { card: 'ant-droid', ref: 'first' },
    { card: 'ant-droid', ref: 'second' },
    { card: 'ant-droid', ref: 'third' },
  ];
  p.players[1].ground = [{ card: 'ant-droid', ref: 'enemy' }];
  p.players[1].hand = Array.from({ length: 3 }, (_, n) => ({
    card: 'crushing-blow',
    ref: `removal-${n}`,
  }));
  for (const player of p.players) {
    player.resources = Array.from({ length: 16 }, () => ({ card: ids.marine }));
    player.deck = Array.from({ length: 30 }, () => ({ card: ids.marine }));
  }
  return p;
}
function defeat(s: GameState, card: string) {
  return step(step(s, 'play'), i => i.kind === 'target' && i.card === card);
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
  expect(child.exitCode).toBe(0);
  expect(child.stderr.toString()).toBe('');
  expect(JSON.parse(child.stdout.toString())).toEqual(advance(s, input));
}
test('Thrawn’s leader side pays exhaustion after the first ability resolves and repeats the exact source', () => {
  const g = scenario(board()),
    pending = defeat(g.state, g.refs.first!);
  expect(pending.players.alice!.hand).toHaveLength(1);
  expect(pending.execution.decision!.playerId).toBe('alice');
  expect(pending.usedDefeatedAbilities[0]!.source.instanceId).toBe(g.refs.first!);
  resume(pending, choose(pending, 'accept-effect'));
  const s = step(pending, 'accept-effect');
  expect(s.players.alice!.hand).toHaveLength(2);
  expect(s.cards[g.refs.thrawn!]!.exhausted).toBe(true);
  expect(s.phaseHistory.defeated).toHaveLength(1);
  expect(s.execution.decision!.kind).toBe('action');
});
test('declining the leader’s exhaustion leaves it ready, and an exhausted leader cannot repeat', () => {
  const g = scenario(board()),
    pending = defeat(g.state, g.refs.first!);
  const declined = step(pending, 'decline-effect');
  expect(declined.cards[g.refs.thrawn!]!.exhausted).toBe(false);
  expect(declined.players.alice!.hand).toHaveLength(1);
  const p = board();
  p.players[0].leader.exhausted = true;
  const h = scenario(p),
    s = defeat(h.state, h.refs.first!);
  expect(s.players.alice!.hand).toHaveLength(1);
  expect(s.execution.decision!.kind).toBe('action');
});
test('the unit’s optional use repeats without exhausting it, consumes its round limit and does not loop', () => {
  const g = scenario(board(true)),
    pending = defeat(g.state, g.refs.first!);
  expect(pending.execution.frames[0]!.kind).toBe('optional-trigger');
  resume(pending, choose(pending, 'accept-effect'));
  const s = step(pending, 'accept-effect');
  expect(s.cards[g.refs.thrawn!]!.exhausted).toBe(false);
  expect(s.players.alice!.hand).toHaveLength(2);
  expect(s.roundHistory.triggerUses).toHaveLength(1);
  expect(s.usedDefeatedAbilities).toHaveLength(1);
  const second = defeat(step(s, 'pass'), g.refs.second!);
  expect(second.execution.decision!.kind).toBe('action');
  expect(second.players.alice!.hand).toHaveLength(3);
});
test('declining the unit’s optional repetition preserves its once-per-round use for a later defeat', () => {
  const g = scenario(board(true));
  let s = step(defeat(g.state, g.refs.first!), 'decline-effect');
  expect(s.roundHistory.triggerUses).toHaveLength(0);
  s = defeat(step(s, 'pass'), g.refs.second!);
  expect(s.execution.frames[0]!.kind).toBe('optional-trigger');
  s = step(s, 'accept-effect');
  expect(s.roundHistory.triggerUses).toHaveLength(1);
  expect(s.players.alice!.hand).toHaveLength(3);
});
test('the unit’s repetition becomes available again in the next round', () => {
  const g = scenario(board(true));
  let s = step(defeat(g.state, g.refs.first!), 'accept-effect');
  s = step(step(s, 'pass'), 'pass');
  s = step(step(s, 'resource', []), 'resource', []);
  expect(s.round).toBe(2);
  expect(s.roundHistory.triggerUses).toHaveLength(0);
  s = defeat(step(s, 'pass'), g.refs.second!);
  expect(s.execution.frames[0]!.kind).toBe('optional-trigger');
  expect(step(s, 'accept-effect').roundHistory.triggerUses).toHaveLength(1);
});
test('a blanked unit and the opponent’s own defeat ability do not grant repetitions', () => {
  const g = scenario(board(true));
  modifyUnit(g.state, g.state.cards[g.refs.thrawn!]!, g.state.cards[g.refs.thrawn!]!, {
    kind: 'modify',
    power: 0,
    hp: 0,
    duration: 'phase',
    loseAbilities: true,
  });
  const s = defeat(g.state, g.refs.first!);
  expect(s.players.alice!.hand).toHaveLength(1);
  expect(s.usedDefeatedAbilities).toHaveLength(0);
  const h = scenario(board()),
    other = defeat(h.state, h.refs.enemy!);
  expect(other.usedDefeatedAbilities).toHaveLength(0);
  expect(other.execution.decision!.kind).toBe('action');
});
test('Chimaera’s invocation counts as using the ability without an actual defeat', () => {
  const p = board();
  p.activePlayer = 'alice';
  p.players[0].hand = [{ card: chimaera }];
  const g = scenario(p),
    pending = step(step(g.state, 'play'), i => i.kind === 'target' && i.card === g.refs.first);
  expect(pending.players.alice!.hand).toHaveLength(1);
  expect(pending.phaseHistory.defeated).toHaveLength(0);
  const s = step(pending, 'accept-effect');
  expect(s.players.alice!.hand).toHaveLength(2);
  expect(s.phaseHistory.defeated).toHaveLength(0);
});
test('a repeated damage ability selects a new target after its first target has left play', () => {
  const p = board();
  p.activePlayer = 'alice';
  p.players[0].hand = [{ card: chimaera }];
  p.players[0].space = [{ card: 'raddus--holdo-s-final-command', ref: 'raddus' }];
  p.players[1].ground = [
    { card: ids.consular, ref: 'enemy-one' },
    { card: ids.consular, ref: 'enemy-two' },
  ];
  const g = scenario(p);
  let s = step(step(g.state, 'play'), i => i.kind === 'target' && i.card === g.refs.raddus);
  s = step(s, i => i.kind === 'target' && i.card === g.refs['enemy-one']);
  expect(s.cards[g.refs['enemy-one']!]!.zone).toBe('discard');
  s = step(s, 'accept-effect');
  expect(
    s.execution.decision!.options.some(
      o => o.intent.kind === 'target' && o.intent.card === g.refs['enemy-one'],
    ),
  ).toBe(false);
  resume(
    s,
    choose(s, i => i.kind === 'target' && i.card === g.refs['enemy-two']),
  );
  s = step(s, i => i.kind === 'target' && i.card === g.refs['enemy-two']);
  expect(s.cards[g.refs['enemy-two']!]!.zone).toBe('discard');
  expect(s.cards[g.refs.raddus!]!.zone).toBe('space');
});
test('the repeated ability retains departure power even after the same physical source has re-entered as a new copy', () => {
  const p = board();
  p.players[0].space = [{ card: 'raddus--holdo-s-final-command', ref: 'raddus' }];
  p.players[1].hand = [{ card: 'direct-hit' }];
  p.players[1].ground = [
    { card: ids.consular, ref: 'enemy-one' },
    { card: ids.consular, ref: 'enemy-two' },
  ];
  const g = scenario(p);
  let s = defeat(g.state, g.refs.raddus!);
  s = step(s, i => i.kind === 'target' && i.card === g.refs['enemy-one']);
  const current = s.cards[g.refs.raddus!]!;
  move(s, current, 'space');
  current.damage = 0;
  modifyUnit(s, current, current, { kind: 'modify', power: 20, hp: 0, duration: 'phase' });
  resume(s, choose(s, 'accept-effect'));
  s = step(step(s, 'accept-effect'), i => i.kind === 'target' && i.card === g.refs['enemy-two']);
  expect(
    s.facts
      .filter(f => f.type === 'damage' && f.cards.some(r => r.instanceId === g.refs['enemy-two']))
      .at(-1)!.amount,
  ).toBe(8);
});
test('history records and deferred observers are server-only, while the prompt identifies the correct Thrawn', () => {
  const g = scenario(board()),
    s = defeat(g.state, g.refs.first!);
  for (const playerId of ['alice', 'bob']) {
    const v = new Projector(s.gameId, { role: 'player', playerId }, 'v'.repeat(32)).project(s);
    expect(JSON.stringify(v)).not.toContain('usedDefeatedAbilities');
    expect(v.decision?.source?.cardId ?? null).toBe(playerId === 'alice' ? thrawn : null);
  }
  expect(
    new Projector(s.gameId, { role: 'spectator' }, 'v'.repeat(32)).project(s).decision,
  ).toBeNull();
});
test('checkpoints reject a forged repeated ability index, mismatched actor and non-defeat history', () => {
  const g = scenario(board()),
    s = defeat(g.state, g.refs.first!);
  for (const kind of ['index', 'actor', 'ability'] as const) {
    const bad = structuredClone(s),
      frame = bad.execution.frames[0]!;
    if (frame.kind !== 'effect') throw new Error('Missing leader payment');
    if (kind === 'index') frame.values!['used-defeated'] = 999;
    else if (kind === 'actor') bad.usedDefeatedAbilities[0]!.playerId = 'bob';
    else bad.usedDefeatedAbilities[0]!.abilityId = 'nonexistent';
    expect(() => decodeState(encodeState(bad))).toThrow();
  }
});

test('a repeated granted ability preserves its upgrade origin and chooses a new unit', () => {
  const p = board();
  p.activePlayer = 'alice';
  p.players[0].hand = [{ card: chimaera }];
  p.players[1].ground = [
    { card: ids.marine, ref: 'one' },
    { card: ids.marine, ref: 'two' },
  ];
  p.attachments = [{ card: 'creditor-s-claim', unit: 'first', ref: 'claim' }];
  const g = scenario(p);
  let s = step(step(g.state, 'play'), i => i.kind === 'target' && i.card === g.refs.first);
  const f = s.execution.frames[0]!;
  if (f.kind !== 'trigger-batch') throw new Error('Missing choice');
  const granted = f.triggers.find(t => t.abilityId !== 'on-defeated')!;
  s = step(s, i => i.kind === 'trigger' && i.triggerId === granted.id);
  s = step(s, i => i.kind === 'target' && i.card === g.refs.one);
  s = step(s, 'accept-effect');
  resume(
    s,
    choose(s, i => i.kind === 'target' && i.card === g.refs.two),
  );
  s = step(s, i => i.kind === 'target' && i.card === g.refs.two);
  expect(s.cards[g.refs.one!]!.zone).toBe('discard');
  expect(s.cards[g.refs.two!]!.zone).toBe('discard');
  expect(s.players.alice!.hand).toHaveLength(0);
  expect(s.usedDefeatedAbilities[0]!.abilityId).toBe(granted.abilityId);
});
test('repetition does not waive the original Force cost', () => {
  const p = board();
  p.activePlayer = 'alice';
  p.players[0].hand = [{ card: chimaera }];
  p.players[0].force = true;
  p.players[0].ground = [{ card: 'karis--we-don-t-like-strangers', ref: 'karis' }];
  p.players[1].ground = [{ card: ids.consular, ref: 'target' }];
  const g = scenario(p);
  let s = step(step(g.state, 'play'), i => i.kind === 'target' && i.card === g.refs.karis);
  s = step(step(s, 'accept-effect'), i => i.kind === 'target' && i.card === g.refs.target);
  expect(s.phaseHistory.forceUsed.alice).toBe(1);
  s = step(s, 'accept-effect');
  expect(s.execution.decision!.kind).toBe('action');
  expect(s.phaseHistory.forceUsed.alice).toBe(1);
  expect(unitStats(s, s.cards[g.refs.target!]!).hp).toBe(5);
});
test('the unit observer survives its own defeat during the original ability', () => {
  const p = board(true);
  p.activePlayer = 'alice';
  p.players[0].leader.damage = 6;
  p.players[0].hand = [{ card: chimaera }];
  p.players[0].ground = [{ card: 'morgan-elsbeth--life-abandoned', ref: 'morgan' }];
  p.players[1].ground = [{ card: ids.consular, ref: 'target' }];
  const g = scenario(p);
  let s = step(step(g.state, 'play'), i => i.kind === 'target' && i.card === g.refs.morgan);
  expect(s.execution.frames.some(f => f.kind === 'queue-triggers')).toBe(true);
  resume(
    s,
    choose(s, i => i.kind === 'target' && i.card === g.refs.thrawn),
  );
  s = step(s, i => i.kind === 'target' && i.card === g.refs.thrawn);
  expect(s.cards[g.refs.thrawn!]!.zone).toBe('base');
  expect(s.execution.frames[0]!.kind).toBe('optional-trigger');
  s = step(step(s, 'accept-effect'), i => i.kind === 'target' && i.card === g.refs.target);
  expect(s.roundHistory.triggerUses).toHaveLength(1);
  expect(s.execution.decision!.kind).toBe('action');
});

import { PROTOCOL_VERSION } from '../view/types.ts';
import { expect, test } from 'bun:test';
import { advance } from '../engine/advance.ts';
import { decodeState, encodeState } from '../engine/checkpoint.ts';
import type { GameState, Intent } from '../engine/model.ts';
import { cardPlayIntents } from '../engine/play-options.ts';
import { move } from '../engine/state.ts';
import { Projector } from '../projection/projector.ts';
import { gameViewSchema } from '../view/parse.ts';
import { scenario } from './scenario.ts';
import { choose, ids, position } from './helpers.ts';
const victory = 'confidence-in-victory';
const step = (
  s: GameState,
  i: Intent['kind'] | ((i: Intent) => boolean),
  selected: string[] = [],
) => advance(s, choose(s, i, selected)).state;
function board() {
  const p = position();
  for (const player of p.players) {
    player.resources = Array.from({ length: 14 }, () => ({ card: ids.marine }));
    player.deck = Array.from({ length: 20 }, () => ({ card: ids.marine }));
    player.hand = [{ card: victory, ref: `${player.id}-victory` }];
  }
  p.players[0].ground = [{ card: ids.marine, ref: 'friendly' }];
  p.players[1].space = [{ card: ids.fighter, ref: 'enemy' }];
  return p;
}
function play(s: GameState, card: string, arena: 'ground' | 'space') {
  return step(
    step(s, i => i.kind === 'play' && i.card === card),
    i => i.kind === 'choose-mode' && i.mode === arena,
  );
}
function endPhase(s: GameState) {
  return step(step(s, 'pass'), 'pass');
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
const hasPlay = (s: GameState, id: string) =>
  s.execution.decision!.options.some(o => o.intent.kind === 'play' && o.intent.card === id);
test('Confidence pays the normal cost, chooses an arena publicly, and wins only at regroup without defeating a base', () => {
  const g = scenario(board()),
    pending = step(g.state, i => i.kind === 'play' && i.card === g.refs['alice-victory']!);
  expect(pending.players.alice!.resources.filter(id => pending.cards[id]!.exhausted)).toHaveLength(
    12,
  );
  resume(
    pending,
    choose(pending, i => i.kind === 'choose-mode' && i.mode === 'ground'),
  );
  const scheduled = step(pending, i => i.kind === 'choose-mode' && i.mode === 'ground');
  expect(scheduled.result).toBeNull();
  expect(scheduled.phaseHistory.actionsTaken).toEqual({ alice: 1 });
  for (const viewer of [
    { role: 'spectator' } as const,
    { role: 'player', playerId: 'alice' } as const,
    { role: 'player', playerId: 'bob' } as const,
  ]) {
    const view = new Projector(scheduled.gameId, viewer, 'v'.repeat(32)).project(scheduled);
    expect(gameViewSchema.parse(view)).toEqual(view);
    expect(view.protocolVersion).toBe(PROTOCOL_VERSION);
    expect(view.scheduled[0]).toMatchObject({
      kind: 'victory-at-regroup',
      arena: 'ground',
      target: null,
      source: { cardId: victory },
    });
  }
  const before = step(scheduled, 'pass');
  resume(before, choose(before, 'pass'));
  const done = step(before, 'pass');
  expect(done.result).toEqual({ winner: 'alice', reason: 'card-effect' });
  expect(done.phase).toBe('ended');
  expect(done.cards[done.players.bob!.base]!.damage).toBe(0);
  expect(done.execution.frames).toHaveLength(0);
  expect(done.facts.at(-1)!.cards[0]!.instanceId).toBe(g.refs['alice-victory']!);
  expect(
    gameViewSchema.parse(
      new Projector(done.gameId, { role: 'spectator' }, 'v'.repeat(32)).project(done),
    ).result,
  ).toEqual(done.result);
});
test('each player has their own first action, regardless of which player has initiative', () => {
  for (const actor of ['alice', 'bob']) {
    const p = board();
    p.activePlayer = actor;
    p.initiative.holder = actor;
    const g = scenario(p),
      other = actor === 'alice' ? 'bob' : 'alice';
    const s = play(g.state, g.refs[`${actor}-victory`]!, actor === 'alice' ? 'ground' : 'space');
    expect(hasPlay(s, g.refs[`${other}-victory`]!)).toBe(true);
    expect(s.phaseHistory.actionsTaken[other]).toBeUndefined();
  }
});
test('an earlier play, attack, action ability or pass closes that player’s first-action permission', () => {
  for (const action of ['play', 'attack', 'use-ability', 'pass'] as const) {
    const p = board();
    p.players[0].hand!.push({ card: ids.fighter, ref: 'other-play' });
    p.players[1].hand!.push({ card: ids.fighter, ref: 'bob-play' });
    const g = scenario(p);
    let s = step(
      g.state,
      i => i.kind === action && (i.kind !== 'play' || i.card === g.refs['other-play']),
    );
    s = step(
      s,
      action === 'pass' ? i => i.kind === 'play' && i.card === g.refs['bob-play'] : 'pass',
    );
    expect(s.activePlayer).toBe('alice');
    expect(hasPlay(s, g.refs['alice-victory']!)).toBe(false);
    expect(s.phaseHistory.actionsTaken.alice).toBe(1);
  }
});
test('Kaz’s extra action is still a later action and cannot play Confidence', () => {
  const p = board();
  p.players[0].leader = { card: 'kazuda-xiono--best-pilot-in-the-galaxy' };
  const g = scenario(p);
  const s = step(
    step(g.state, i => i.kind === 'use-ability' && i.abilityId === 'extra-action'),
    i => i.kind === 'target' && i.card === g.refs.friendly,
  );
  expect(s.activePlayer).toBe('alice');
  expect(hasPlay(s, g.refs['alice-victory']!)).toBe(false);
});
test('the next action phase restores first-action permission after two passes', () => {
  const g = scenario(board());
  let s = endPhase(g.state);
  s = step(step(s, 'resource', []), 'resource', []);
  expect(s.round).toBe(2);
  expect(s.phaseHistory.actionsTaken).toEqual({});
  expect(hasPlay(s, g.refs['alice-victory']!)).toBe(true);
});
test('normal first-action payment with Credits keeps the permission through its continuation', () => {
  const p = board();
  p.players[0].credits = ['credit'];
  const g = scenario(p),
    pending = step(g.state, i => i.kind === 'play' && i.card === g.refs['alice-victory']!);
  expect(pending.execution.frames[0]!.kind).toBe('credit-payment');
  expect(pending.phaseHistory.actionsTaken).toEqual({});
  resume(pending, choose(pending, 'accept-effect', [g.refs.credit!]));
  const s = step(
    step(pending, 'accept-effect', [g.refs.credit!]),
    i => i.kind === 'choose-mode' && i.mode === 'ground',
  );
  expect(s.phaseHistory.actionsTaken).toEqual({ alice: 1 });
  expect(s.players.alice!.resources.filter(id => s.cards[id]!.exhausted)).toHaveLength(11);
  expect(endPhase(s).result?.winner).toBe('alice');
});
test('nested paid or free play cannot bypass the restriction before an action has completed', () => {
  const g = scenario(board()),
    c = g.state.cards[g.refs['alice-victory']!]!;
  for (const free of [false, true])
    expect(cardPlayIntents(g.state, c, 'alice', 0, free)).toEqual([]);
  const p = board();
  p.players[0].hand = [{ card: 'tear-this-ship-apart', ref: 'tear' }];
  p.players[1].resources = [{ card: victory, ref: 'resource-victory' }];
  const h = scenario(p),
    pending = step(h.state, 'play');
  expect(pending.phaseHistory.actionsTaken).toEqual({});
  const s = step(pending, 'accept-effect', [h.refs['resource-victory']!]);
  expect(s.delayedEffects).toHaveLength(0);
  expect(s.cards[h.refs['resource-victory']!]!.zone).toBe('resources');
  expect(s.activePlayer).toBe('bob');
});
test('empty, enemy-only and contested chosen arenas do not win, and the failed delay is consumed', () => {
  for (const presence of ['empty', 'enemy', 'both'] as const) {
    const p = board();
    p.players[0].ground = presence === 'both' ? [{ card: ids.marine }] : [];
    p.players[1].ground = presence !== 'empty' ? [{ card: ids.fighter }] : [];
    // Use a ground unit for actual ground presence.
    if (p.players[1].ground.length) p.players[1].ground[0]!.card = ids.marine;
    const g = scenario(p),
      s = endPhase(play(g.state, g.refs['alice-victory']!, 'ground'));
    expect(s.result).toBeNull();
    expect(s.phase).toBe('regroup');
    expect(s.delayedEffects).toHaveLength(0);
  }
});
test('the chosen arena is evaluated at regroup, so removing its last friendly unit prevents victory', () => {
  const p = board();
  p.players[1].hand = [{ card: 'crushing-blow', ref: 'removal' }];
  const g = scenario(p);
  let s = play(g.state, g.refs['alice-victory']!, 'ground');
  s = step(
    step(s, i => i.kind === 'play' && i.card === g.refs.removal),
    i => i.kind === 'target' && i.card === g.refs.friendly,
  );
  expect(endPhase(s).result).toBeNull();
});
test('two successful opposing victory delays use active-player group ordering, and the first win ends the game', () => {
  const g = scenario(board());
  let s = play(g.state, g.refs['alice-victory']!, 'ground');
  s = play(s, g.refs['bob-victory']!, 'space');
  s = endPhase(s);
  expect(s.execution.decision!.playerId).toBe('alice');
  for (const playerId of ['alice', 'bob']) {
    const input = choose(s, i => i.kind === 'delayed-player' && i.playerId === playerId);
    resume(s, input);
    expect(advance(s, input).state.result).toEqual({ winner: playerId, reason: 'card-effect' });
  }
});
test('a same-player delayed defeat can resolve before victory and change its outcome', () => {
  const p = board();
  p.players[0].discard = [{ card: 'sneak-attack', ref: 'sneak' }];
  p.delayed = [{ source: 'sneak', unit: 'friendly' }];
  const g = scenario(p),
    s = endPhase(play(g.state, g.refs['alice-victory']!, 'ground'));
  const f = s.execution.frames[0]!;
  if (f.kind !== 'delayed-batch') throw new Error('Missing delays');
  const win = f.effects.find(e => e.kind === 'victory-at-regroup')!,
    defeat = f.effects.find(e => e.kind === 'defeat-at-regroup')!;
  const winInput = choose(s, i => i.kind === 'delayed' && i.effectId === win.id);
  resume(s, winInput);
  expect(advance(s, winInput).state.result?.winner).toBe('alice');
  expect(step(s, i => i.kind === 'delayed' && i.effectId === defeat.id).result).toBeNull();
});
test('the victory delay survives its event moving out of discard and still refers to the original copy', () => {
  const g = scenario(board()),
    s = play(g.state, g.refs['alice-victory']!, 'ground');
  move(s, s.cards[g.refs['alice-victory']!]!, 'hand');
  resume(s, choose(s, 'pass'));
  expect(endPhase(s).result?.winner).toBe('alice');
});
test('Max’s extra regroup does not retry a failed victory condition later in the round', () => {
  const p = board();
  p.players[0].ground = [{ card: 'max-rebo--encore-' }];
  const g = scenario(p);
  let s = endPhase(play(g.state, g.refs['alice-victory']!, 'space'));
  s = step(step(s, 'resource', []), 'resource', []);
  expect(s.round).toBe(1);
  expect(s.phase).toBe('regroup');
  expect(s.delayedEffects).toHaveLength(0);
  expect(s.result).toBeNull();
  s = step(step(s, 'resource', []), 'resource', []);
  expect(s.round).toBe(2);
  expect(s.result).toBeNull();
});
test('checkpoints reject forged victory sources, timing, arenas and player action history', () => {
  const g = scenario(board()),
    s = play(g.state, g.refs['alice-victory']!, 'ground');
  for (const type of ['source', 'timing', 'arena', 'actions'] as const) {
    const bad = structuredClone(s),
      d = bad.delayedEffects[0]!;
    if (type === 'source') {
      d.source = structuredClone(bad.cards[g.refs.friendly!]!);
    } else if (type === 'timing') d.dueRound = 0;
    else if (type === 'arena') Object.assign(d, { arena: 'base' });
    else bad.phaseHistory.actionsTaken.outsider = 1;
    expect(() => decodeState(encodeState(bad))).toThrow();
  }
});

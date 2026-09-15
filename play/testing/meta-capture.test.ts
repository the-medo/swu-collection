import { expect, test } from 'bun:test';
import { advance, settle } from '../engine/advance.ts';
import { decodeState, encodeState } from '../engine/checkpoint.ts';
import { isUnit, unitStats } from '../engine/attachments.ts';
import { captureUnit, rescueCaptured } from '../engine/capture.ts';
import { move } from '../engine/state.ts';
import type { GameState, Intent, EngineInput } from '../engine/model.ts';
import { Projector } from '../projection/projector.ts';
import { applyViewDelta, diffViews, gameViewSchema } from '../view/types.ts';
import { scenario } from './scenario.ts';
import { choose, ids, position } from './helpers.ts';
const thrawn = 'grand-admiral-thrawn--grand-schemer',
  lando = 'lando-calrissian--trust-me';
const step = (
  s: GameState,
  i: Intent['kind'] | ((i: Intent) => boolean),
  selected: string[] = [],
) => advance(s, choose(s, i, selected)).state;
const target = (s: GameState, card: string) => step(s, i => i.kind === 'target' && i.card === card);
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
  expect(child.stderr.toString()).toBe('');
  expect(child.exitCode).toBe(0);
  expect(JSON.parse(child.stdout.toString())).toEqual(advance(s, input));
}
function board(card = 'arrest') {
  const p = position();
  p.players[0].hand = [{ card, ref: 'source' }];
  p.players[0].resources = Array.from({ length: 12 }, () => ({ card: ids.marine }));
  p.players[0].ground = [{ card: ids.marine, ref: 'friendly' }];
  p.players[1].ground = [
    { card: ids.marine, ref: 'victim', damage: 1 },
    { card: ids.marine, ref: 'other' },
  ];
  p.players[1].hand = [{ card: ids.consular }];
  return p;
}
function toRegroup(s: GameState) {
  return step(step(s, 'pass'), 'pass');
}
test('Arrest captures under a base, strips upgrades and damage, and publicly projects the exact captive and guard', () => {
  const p = board();
  p.attachments = [
    { card: 'academy-training', unit: 'victim', ref: 'upgrade' },
    { card: 'shield', unit: 'victim', ref: 'shield' },
  ];
  const s = scenario(p),
    choice = step(s.state, 'play');
  resume(
    choice,
    choose(choice, i => i.kind === 'target' && i.card === s.refs.victim),
  );
  const captured = target(choice, s.refs.victim!);
  expect(captured.cards[s.refs.victim!]!).toMatchObject({
    zone: 'captured',
    damage: 0,
    exhausted: false,
    capturedBy: { instanceId: captured.players.alice!.base },
  });
  expect(captured.cards[s.refs.upgrade!]!.zone).toBe('discard');
  expect(captured.cards[s.refs.shield!]!.zone).toBe('set-aside');
  expect(isUnit(captured, captured.cards[s.refs.victim!]!)).toBe(false);
  expect(captured.phaseHistory.defeated.some(c => c.instanceId === s.refs.victim)).toBe(false);
  expect(captured.delayedEffects[0]).toMatchObject({
    kind: 'rescue-at-regroup',
    target: { instanceId: s.refs.victim },
  });
  for (const viewer of [
    { role: 'player', playerId: 'alice' } as const,
    { role: 'player', playerId: 'bob' } as const,
    { role: 'spectator' } as const,
  ]) {
    const projector = new Projector(captured.gameId, viewer, 'k'.repeat(32));
    const before = projector.project(choice),
      after = projector.project(captured);
    expect(gameViewSchema.parse(after)).toEqual(after);
    expect(applyViewDelta(before, diffViews(before, after)!)).toEqual(after);
    const prisoner = after.cards.find(c => c.zone === 'captured')!;
    expect(prisoner.face!.cardId).toBe(ids.marine);
    expect(prisoner.capturedBy).toBe(
      after.cards.find(c => c.zone === 'base' && c.face?.kind === 'base' && c.owner === 'alice')!
        .id,
    );
    expect(after.events.find(e => e.type === 'captured')!.cards.at(-1)!.currentCardId).toBe(
      prisoner.id,
    );
    expect(after.cards.some(c => c.zone === 'hand' && c.owner === 'bob')).toBe(
      viewer.role === 'player' && viewer.playerId === 'bob',
    );
  }
});
test('Arrest rescues at regroup start, as a new copy under its owner, without When Played, Shielded or Ambush', () => {
  const p = board();
  p.players[0].hand!.push({ card: 'arrest', ref: 'second' });
  p.players[1].ground![0] = { card: 'lurking-snub-fighter', ref: 'victim', controller: 'bob' };
  // Put the space unit in its printed arena.
  p.players[1].space = [p.players[1].ground!.shift()!];
  const s = scenario(p),
    captured = target(step(s.state, 'play'), s.refs.victim!);
  const incarnation = captured.cards[s.refs.victim!]!.incarnation;
  const twice = target(step(step(captured, 'pass'), 'play'), s.refs.other!);
  const regroup = toRegroup(twice);
  expect(regroup.execution.frames[0]!.kind).toBe('delayed-batch');
  resume(regroup, choose(regroup, 'delayed'));
  const done = step(regroup, 'delayed');
  expect(done.cards[s.refs.victim!]!).toMatchObject({
    zone: 'space',
    controller: 'bob',
    exhausted: true,
    capturedBy: null,
    incarnation: incarnation + 1,
  });
  expect(done.execution.decision!.kind).toBe('resource');
  expect(done.cards[s.refs.friendly!]!.exhausted).toBe(false);
  expect(done.facts.filter(f => f.type === 'played')).toHaveLength(2);
});
test('Thrawn gives the opponent the capture choice; declining or having no eligible units readies him', () => {
  for (const outcome of ['offer', 'decline', 'none']) {
    const p = board(thrawn);
    if (outcome === 'none') p.players[1].ground = [];
    const s = scenario(p),
      choice = step(s.state, 'play');
    if (outcome === 'none') {
      expect(choice.cards[s.refs.source!]!.exhausted).toBe(false);
      continue;
    }
    expect(choice.execution.decision!.playerId).toBe('bob');
    const input = choose(
      choice,
      outcome === 'offer' ? i => i.kind === 'target' && i.card === s.refs.victim : 'decline-effect',
    );
    resume(choice, input);
    const done = advance(choice, input).state;
    expect(done.cards[s.refs.source!]!.exhausted).toBe(outcome === 'offer');
    expect(done.cards[s.refs.victim!]!.zone).toBe(outcome === 'offer' ? 'captured' : 'ground');
  }
});
test('returning a guard releases prisoners immediately, and changing its controller or arena does not', () => {
  const p = board();
  p.players[0].hand = [{ card: 'far-far-away', ref: 'return' }];
  p.players[1].ground = [{ card: thrawn, ref: 'guard' }];
  p.captured = [{ card: ids.marine, owner: 'alice', guard: 'guard', ref: 'prisoner' }];
  const s = scenario(p),
    state = structuredClone(s.state),
    guard = state.cards[s.refs.guard!]!;
  guard.controller = 'alice';
  move(state, guard, 'space');
  expect(state.cards[s.refs.prisoner!]!.zone).toBe('captured');
  // Use a real return ability after regenerating legal choices.
  state.execution.decision = null;
  settle(state);
  const done = target(step(state, 'play'), s.refs.guard!);
  expect(done.cards[s.refs.guard!]!.zone).toBe('hand');
  expect(done.cards[s.refs.prisoner!]!).toMatchObject({
    zone: 'ground',
    controller: 'alice',
    exhausted: true,
    capturedBy: null,
  });
});
test('capturing a guard releases its prisoners; the captured guard does not fire When Defeated', () => {
  const p = board();
  p.players[1].ground = [{ card: thrawn, ref: 'victim' }];
  p.captured = [{ card: ids.marine, owner: 'alice', guard: 'victim', ref: 'prisoner' }];
  const s = scenario(p),
    done = target(step(s.state, 'play'), s.refs.victim!);
  expect(done.cards[s.refs.prisoner!]!).toMatchObject({
    zone: 'ground',
    controller: 'alice',
    exhausted: true,
  });
  expect(done.cards[s.refs.victim!]!.zone).toBe('captured');
  expect(done.execution.decision!.kind).toBe('action');
  expect(done.facts.filter(f => f.type === 'triggered')).toEqual([]);
});
test('Thrawn’s defeat trigger sees a rescued friendly unit and restricts capture to its arena', () => {
  const p = board('incapacitate');
  p.players[0].ground = [{ card: thrawn, ref: 'guard', damage: 6 }];
  p.players[1].space = [{ card: ids.fighter, ref: 'space-enemy' }];
  p.captured = [{ card: ids.marine, owner: 'alice', guard: 'guard', ref: 'prisoner' }];
  const s = scenario(p),
    choice = target(step(s.state, 'play'), s.refs.guard!);
  expect(choice.cards[s.refs.prisoner!]!.zone).toBe('ground');
  expect(choice.execution.decision!.options.map(o => o.intent)).toEqual([
    { kind: 'target', card: s.refs.prisoner! },
  ]);
  resume(choice, choose(choice, 'target'));
  const enemy = target(choice, s.refs.prisoner!);
  expect(
    enemy.execution.decision!.options.some(
      o => o.intent.kind === 'target' && o.intent.card === s.refs['space-enemy'],
    ),
  ).toBe(false);
  const done = target(enemy, s.refs.victim!);
  expect(done.cards[s.refs.victim!]!.capturedBy!.instanceId).toBe(s.refs.prisoner!);
});
test('Lando heals only after both choices, excludes himself, keeps Grit and permits an enemy leader guard', () => {
  const p = board(lando);
  p.players[0].base.damage = 10;
  p.players[1].leader = {
    card: ids.leader,
    deployedAs: 'unit',
    abilityUses: { deploy: 1 },
    ref: 'leader',
  };
  const s = scenario(p),
    choice = step(s.state, 'play');
  expect(step(choice, 'decline-effect').cards[s.state.players.alice!.base]!.damage).toBe(10);
  const friendly = target(choice, s.refs.leader!);
  expect(
    friendly.execution.decision!.options.some(
      o => o.intent.kind === 'target' && o.intent.card === s.refs.source,
    ),
  ).toBe(false);
  expect(step(friendly, 'decline-effect').cards[s.state.players.alice!.base]!.damage).toBe(10);
  resume(friendly, choose(friendly, 'target'));
  const done = target(friendly, s.refs.friendly!);
  expect(done.cards[s.state.players.alice!.base]!.damage).toBe(4);
  expect(done.cards[s.refs.friendly!]!.capturedBy!.instanceId).toBe(s.refs.leader!);
  done.cards[s.refs.source!]!.damage = 2;
  expect(unitStats(done, done.cards[s.refs.source!]!).power).toBe(8);
});
test('Moral Authority attaches only to a friendly unique unit and compares current remaining HP strictly', () => {
  const p = board('moral-authority');
  p.players[0].ground = [
    { card: lando, ref: 'guard', damage: 4 },
    { card: ids.marine, ref: 'vanilla' },
  ];
  p.players[1].ground = [
    { card: ids.marine, ref: 'victim' },
    { card: ids.consular, ref: 'equal', damage: 3 },
    { card: lando, ref: 'enemy-unique' },
  ];
  const s = scenario(p),
    options = s.state.execution.decision!.options.filter(o => o.intent.kind === 'play');
  expect(options.map(o => o.intent)).toEqual([
    { kind: 'play', card: s.refs.source!, target: s.refs.guard! },
  ]);
  const choice = step(s.state, 'play');
  expect(choice.execution.decision!.options.map(o => o.intent)).toEqual([
    { kind: 'target', card: s.refs.victim! },
  ]);
  resume(choice, choose(choice, 'target'));
  const done = target(choice, s.refs.victim!);
  expect(done.cards[s.refs.victim!]!.capturedBy!.instanceId).toBe(s.refs.guard!);
  // The unit guards the prisoner independently of the upgrade afterward.
  move(done, done.cards[s.refs.source!]!, 'discard');
  expect(done.cards[s.refs.victim!]!.zone).toBe('captured');
  move(done, done.cards[s.refs.guard!]!, 'hand');
  expect(done.cards[s.refs.victim!]!).toMatchObject({
    zone: 'ground',
    controller: 'bob',
    exhausted: true,
  });
});
test('tokens are set aside by capture; leaders and upgrades cannot become prisoners', () => {
  const p = board();
  p.players[1].ground = [{ card: 'mandalorian', ref: 'victim' }];
  p.players[1].leader = {
    card: ids.leader,
    deployedAs: 'unit',
    abilityUses: { deploy: 1 },
    ref: 'leader',
  };
  const s = scenario(p),
    choice = step(s.state, 'play');
  expect(choice.execution.decision!.options.map(o => o.intent)).toEqual([
    { kind: 'target', card: s.refs.victim! },
  ]);
  const done = target(choice, s.refs.victim!);
  expect(done.cards[s.refs.victim!]!.zone).toBe('set-aside');
  expect(done.captured).toEqual([]);
  expect(done.delayedEffects).toEqual([]);
  expect(
    captureUnit(
      done,
      done.cards[done.players.alice!.base]!,
      done.cards[s.refs.leader!]!,
      'alice',
      done.cards[s.refs.source!]!,
    ),
  ).toBe(false);
});
test('Arrest cannot rescue a later incarnation after an earlier rescue and recapture', () => {
  const p = board();
  p.players[0].hand!.push({ card: 'arrest', ref: 'second' });
  const s = scenario(p),
    captured = target(step(s.state, 'play'), s.refs.victim!);
  const victim = captured.cards[s.refs.victim!]!,
    base = captured.cards[captured.players.alice!.base]!;
  rescueCaptured(captured, victim);
  captureUnit(captured, base, victim, 'alice', captured.cards[s.refs.source!]!);
  captured.execution.decision = null;
  settle(captured);
  const twice = target(step(step(captured, 'pass'), 'play'), s.refs.other!);
  const regroup = toRegroup(twice);
  resume(regroup, choose(regroup, 'delayed'));
  const done = step(regroup, 'delayed');
  expect(done.cards[s.refs.victim!]!.zone).toBe('captured');
});
test('rescue honors ready-entry card text but never treats a rescued card as played', () => {
  const p = board();
  p.players[0].leader = { card: 'darth-maul--sith-revealed' };
  p.captured = [
    { card: 'elzar-mann--haunted-by-a-vision', guard: 'victim', owner: 'alice', ref: 'elzar' },
  ];
  const s = scenario(p),
    state = structuredClone(s.state);
  rescueCaptured(state, state.cards[s.refs.elzar!]!);
  state.execution.decision = null;
  settle(state);
  expect(state.cards[s.refs.elzar!]!.exhausted).toBe(false);
  expect(state.execution.decision!.kind).toBe('action');
});
test('capture checkpoints reject missing guards, wrong incarnations, damage and forged links on units in play', () => {
  const s = scenario(board()),
    captured = target(step(s.state, 'play'), s.refs.victim!);
  for (const kind of ['missing', 'copy', 'damage', 'uncaptured']) {
    const bad = structuredClone(captured),
      victim = bad.cards[s.refs.victim!]!;
    if (kind === 'missing') victim.capturedBy = null;
    if (kind === 'copy') victim.capturedBy!.incarnation++;
    if (kind === 'damage') victim.damage = 1;
    if (kind === 'uncaptured') bad.cards[s.refs.friendly!]!.capturedBy = victim.capturedBy;
    expect(() => decodeState(encodeState(bad))).toThrow();
  }
});

test('a departed capturing unit cannot guard a selection made by its lingering When Played ability', () => {
  const s = scenario(board(thrawn)),
    choice = step(s.state, 'play');
  move(choice, choice.cards[s.refs.source!]!, 'hand');
  choice.execution.decision = null;
  settle(choice);
  resume(
    choice,
    choose(choice, i => i.kind === 'target' && i.card === s.refs.victim),
  );
  const done = target(choice, s.refs.victim!);
  expect(done.cards[s.refs.victim!]!.zone).toBe('ground');
  expect(done.captured).toEqual([]);
});

test('rescue preserves the physical card action-use record across its new incarnation', () => {
  const p = position();
  p.players[0].space = [{ card: 't-6-shuttle-1974--with-a-mentor-s-dedication', ref: 'shuttle' }];
  p.players[0].ground = [{ card: ids.marine, ref: 'ally' }];
  p.players[1].hand = [{ card: 'arrest' }];
  p.players[1].resources = Array.from({ length: 6 }, () => ({ card: ids.marine }));
  const s = scenario(p);
  let state = step(s.state, i => i.kind === 'use-ability' && i.abilityId === 'support-unit');
  state = target(state, s.refs.ally!);
  state = step(state, 'decline-effect');
  expect(state.cards[s.refs.shuttle!]!.abilityUses['support-unit']).toBe(1);
  state = target(step(state, 'play'), s.refs.shuttle!);
  state = toRegroup(state);
  expect(state.cards[s.refs.shuttle!]!.zone).toBe('space');
  expect(state.cards[s.refs.shuttle!]!.abilityUses['support-unit']).toBe(1);
  expect(decodeState(encodeState(state))).toEqual(state);
});

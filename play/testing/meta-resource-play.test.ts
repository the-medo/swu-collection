import { expect, test } from 'bun:test';
import { advance } from '../engine/advance.ts';
import { decodeState, encodeState } from '../engine/checkpoint.ts';
import type { GameState, Intent, EngineInput } from '../engine/model.ts';
import { Projector } from '../projection/projector.ts';
import { scenario } from './scenario.ts';
import { choose, ids, position } from './helpers.ts';
import { settle } from '../engine/advance.ts';
import { move } from '../engine/state.ts';
import { cardPlayIntents } from '../engine/play-options.ts';
import { gameViewSchema, applyViewDelta, diffViews } from '../view/types.ts';
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
const tear = 'tear-this-ship-apart';
function board(stolen: string = ids.marine) {
  const p = position();
  p.players[0].hand = [{ card: tear, ref: 'event' }];
  p.players[0].resources = Array.from({ length: 12 }, () => ({ card: ids.marine }));
  p.players[0].ground = [{ card: ids.marine, ref: 'friendly' }];
  p.players[0].space = [{ card: ids.fighter, ref: 'host' }];
  p.players[1].resources = [
    { card: stolen, ref: 'stolen', exhausted: true },
    { card: ids.consular, ref: 'other' },
  ];
  p.players[1].ground = [{ card: ids.marine, ref: 'enemy' }];
  p.players[1].deck = [
    { card: ids.racer, ref: 'top' },
    ...Array.from({ length: 11 }, () => ({ card: ids.marine })),
  ];
  return p;
}
function inspected(stolen: string = ids.marine) {
  const s = scenario(board(stolen));
  return { ...s, state: step(s.state, 'play') };
}
const select = (s: GameState, id: string) => step(s, 'accept-effect', [id]);
test('Tear privately inspects every ordinary resource and a selected card stays private until played', () => {
  const s = inspected();
  const actor = new Projector(
    s.state.gameId,
    { role: 'player', playerId: 'alice' },
    'k'.repeat(32),
  );
  const view = actor.project(s.state);
  expect(view.decision!.inspectedCards.map(c => c.face.cardId)).toEqual([ids.marine, ids.consular]);
  expect(view.cards.find(c => c.id === view.decision!.inspectedCards[0]!.id)!.face).toBeNull();
  expect(view.decision!.effect).toBe('inspect-resources');
  expect(gameViewSchema.parse(view)).toEqual(view);
  resume(s.state, choose(s.state, 'accept-effect', [s.refs.stolen!]));
  const next = select(s.state, s.refs.stolen!),
    nextView = actor.project(next);
  expect(nextView.decision!.inspectedCards.map(c => c.face.cardId)).toEqual([ids.marine]);
  expect(applyViewDelta(view, diffViews(view, nextView)!)).toEqual(nextView);
  for (const viewer of [
    { role: 'player', playerId: 'bob' } as const,
    { role: 'spectator' } as const,
  ]) {
    const v = new Projector(next.gameId, viewer).project(next);
    expect(v.decision).toBeNull();
    expect(v.events.filter(e => e.type === 'looked-at')).toEqual([]);
  }
});
test('free unit play transfers control without ownership, replaces only the opponent resource exhausted and costs no additional resources', () => {
  const s = inspected(),
    selected = select(s.state, s.refs.stolen!);
  const ready = selected.players.alice!.resources.filter(
    id => !selected.cards[id]!.exhausted,
  ).length;
  resume(selected, choose(selected, 'play'));
  const done = step(selected, 'play');
  expect(done.cards[s.refs.stolen!]!).toMatchObject({
    owner: 'bob',
    controller: 'alice',
    zone: 'ground',
    exhausted: true,
  });
  expect(done.players.bob!.resources).toEqual([s.refs.other!, s.refs.top!]);
  expect(done.cards[s.refs.top!]!.exhausted).toBe(true);
  expect(done.players.alice!.resources.filter(id => !done.cards[id]!.exhausted).length).toBe(ready);
  expect(done.players.alice!.deck).toEqual(s.state.players.alice!.deck);
  expect(done.facts.filter(f => f.type === 'played').at(-1)!.amount).toBe(0);
  move(done, done.cards[s.refs.stolen!]!, 'discard');
  expect(done.cards[s.refs.stolen!]!.controller).toBe('bob');
  expect(done.players.bob!.discard).toContain(s.refs.stolen!);
});
test('a stolen event resolves for the acting player from its owner discard, then replacement follows its ability', () => {
  const s = inspected('open-fire'),
    selected = select(s.state, s.refs.stolen!),
    damage = step(selected, 'play');
  expect(damage.execution.decision!.playerId).toBe('alice');
  expect(damage.execution.frames[0]).toMatchObject({
    source: { owner: 'bob', controller: 'alice', zone: 'discard' },
  });
  expect(damage.cards[s.refs.stolen!]!).toMatchObject({
    owner: 'bob',
    controller: 'bob',
    zone: 'discard',
  });
  expect(damage.cards[s.refs.top!]!.zone).toBe('deck');
  resume(
    damage,
    choose(damage, i => i.kind === 'target' && i.card === s.refs.enemy),
  );
  const done = target(damage, s.refs.enemy!);
  expect(done.cards[s.refs.enemy!]!.zone).toBe('discard');
  expect(done.cards[s.refs.top!]!.zone).toBe('resources');
  expect(done.cards[done.players.alice!.base]!.damage).toBe(0);
});
test('free Piloting uses the new controller for host eligibility and cannot attach to the opponent vehicle', () => {
  const p = board('academy-graduate');
  p.players[1].space = [{ card: ids.fighter, ref: 'enemyhost' }];
  const s = scenario(p),
    selected = select(step(s.state, 'play'), s.refs.stolen!);
  const intents = selected.execution
    .decision!.options.map(o => o.intent)
    .filter(i => i.kind === 'play');
  expect(intents).toContainEqual({ kind: 'play', card: s.refs.stolen! });
  expect(intents).toContainEqual({
    kind: 'play',
    card: s.refs.stolen!,
    piloting: 'piloting',
    target: s.refs.host!,
  });
  expect(intents.some(i => i.target === s.refs.enemyhost)).toBe(false);
  const input = choose(selected, i => i.kind === 'play' && !!i.piloting);
  resume(selected, input);
  const done = advance(selected, input).state;
  expect(done.cards[s.refs.stolen!]!).toMatchObject({
    owner: 'bob',
    controller: 'alice',
    attachedTo: { instanceId: s.refs.host! },
  });
  expect(done.cards[s.refs.top!]!.zone).toBe('resources');
});
test('ordinary upgrades preserve attachment restrictions; choosing or declining an unplayable resource never replaces it', () => {
  const p = board('moral-authority');
  const s = scenario(p),
    look = step(s.state, 'play');
  const noPlay = select(look, s.refs.stolen!);
  expect(noPlay.execution.decision!.kind).toBe('action');
  expect(noPlay.cards[s.refs.stolen!]!.zone).toBe('resources');
  expect(noPlay.cards[s.refs.top!]!.zone).toBe('deck');
  const none = step(look, 'accept-effect');
  expect(none.players.bob!.resources).toEqual(look.players.bob!.resources);
  const t = inspected('academy-training'),
    selected = select(t.state, t.refs.stolen!);
  const done = step(selected, i => i.kind === 'play' && i.target === t.refs.friendly);
  expect(done.cards[t.refs.stolen!]!.attachedTo!.instanceId).toBe(t.refs.friendly!);
});
test('an explicitly declined legal free play and an empty inspection leave both decks and resources intact', () => {
  const s = inspected(),
    done = step(select(s.state, s.refs.stolen!), 'decline-effect');
  expect(done.players.bob!.resources).toEqual(s.state.players.bob!.resources);
  expect(done.players.bob!.deck).toEqual(s.state.players.bob!.deck);
  const p = board();
  p.players[1].resources = [];
  const empty = scenario(p),
    look = step(empty.state, 'play');
  expect(look.execution.decision!.selection).toEqual({ cards: [], min: 0, max: 0 });
  expect(step(look, 'accept-effect').execution.decision!.kind).toBe('action');
});
test('an empty replacement deck causes no fatigue and prevents neither unit play nor its When Played ability', () => {
  const p = board('qui-gon-jinn--influencing-chance');
  p.players[1].deck = [];
  const s = scenario(p),
    selected = select(step(s.state, 'play'), s.refs.stolen!),
    look = step(selected, 'play');
  expect(look.cards[s.refs.stolen!]!.controller).toBe('alice');
  expect(look.execution.decision!.playerId).toBe('alice');
  expect(look.players.bob!.resources).toEqual([s.refs.other!]);
  expect(look.cards[look.players.bob!.base]!.damage).toBe(0);
  resume(look, choose(look, 'accept-effect'));
});
test('a stolen Eye schedules for the acting player and exhausts its original owner units next phase', () => {
  const s = inspected('the-eye-of-aldhani'),
    done = step(select(s.state, s.refs.stolen!), 'play');
  expect(done.delayedEffects[0]).toMatchObject({
    playerId: 'alice',
    source: { owner: 'bob', controller: 'alice' },
  });
  resume(done, choose(done, 'pass'));
  let next = step(step(done, 'pass'), 'pass');
  next = step(step(next, 'resource'), 'resource');
  expect(next.execution.decision!.playerId).toBe('bob');
  expect(next.execution.frames[0]!.kind).toBe('unit-tax');
  next = step(next, 'accept-effect');
  expect(next.cards[s.refs.enemy!]!.exhausted).toBe(true);
  expect(next.cards[s.refs.friendly!]!.exhausted).toBe(false);
});
test('named play restrictions remain in force during free opponent-resource plays', () => {
  const p = board();
  p.players[1].hand = [{ card: 'ryder-azadi--restored-governor', ref: 'ryder' }];
  p.players[1].resources!.push(...Array.from({ length: 12 }, () => ({ card: ids.marine })));
  p.activePlayer = 'bob';
  const s = scenario(p),
    naming = step(s.state, 'play');
  let state = advance(naming, {
    ...choose(naming, 'accept-effect'),
    namedCardId: ids.marine,
  }).state;
  state = step(state, 'play');
  const done = select(state, s.refs.stolen!);
  expect(done.cards[s.refs.stolen!]!.zone).toBe('resources');
  expect(done.cards[s.refs.top!]!.zone).toBe('deck');
  expect(
    cardPlayIntents(
      done,
      { ...done.cards[s.refs.stolen!]!, controller: 'alice' },
      'alice',
      0,
      true,
    ),
  ).toEqual([]);
});
test('spectators cannot distinguish resource identities during inspection and forged exact-copy inspections fail recovery', () => {
  const s = inspected(),
    other = structuredClone(s.state);
  other.cards[s.refs.stolen!]!.cardId = ids.fighter;
  const frame = other.execution.frames[0];
  if (frame?.kind !== 'zone-inspection') throw new Error('Missing inspection');
  frame.cards[0]!.cardId = ids.fighter;
  other.facts.find(f => f.type === 'looked-at')!.cards[0]!.cardId = ids.fighter;
  const p = new Projector(s.state.gameId, { role: 'spectator' }, 'k'.repeat(32));
  expect(p.project(s.state)).toEqual(p.project(other));
  const bad = structuredClone(s.state),
    f = bad.execution.frames[0];
  if (f?.kind !== 'zone-inspection') throw new Error('Missing inspection');
  f.cards[0]!.incarnation++;
  expect(() => decodeState(encodeState(bad))).toThrow();
  expect(() => select(s.state, s.refs.friendly!)).toThrow();
});

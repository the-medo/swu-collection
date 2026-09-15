import { expect, test } from 'bun:test';
import { advance, settle } from '../engine/advance.ts';
import { decodeState, encodeState } from '../engine/checkpoint.ts';
import { move } from '../engine/state.ts';
import type { GameState, Intent, EngineInput } from '../engine/model.ts';
import { Projector } from '../projection/projector.ts';
import { scenario } from './scenario.ts';
import { choose, ids, position } from './helpers.ts';
const ackbar = 'admiral-ackbar--assume-attack-coordinates';
const step = (
  s: GameState,
  i: Intent['kind'] | ((i: Intent) => boolean),
  selected: string[] = [],
) => advance(s, choose(s, i, selected)).state;
const mode = (s: GameState, mode: string) =>
  step(s, i => i.kind === 'choose-mode' && i.mode === mode);
const play = (s: GameState, card: string) => step(s, i => i.kind === 'play' && i.card === card);
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
function randomInput(s: GameState): EngineInput {
  const r = s.execution.random!;
  return {
    type: 'random',
    gameId: s.gameId,
    expectedRevision: s.revision,
    requestId: r.id,
    values: r.bounds.map(n => n - 1),
  };
}
const search = (s: GameState, cards: string[]) => {
  const pending = step(s, 'search', cards);
  return advance(pending, randomInput(pending)).state;
};
function fleet() {
  const p = position();
  p.players[0].hand = [{ card: ackbar, ref: 'ackbar' }];
  p.players[0].resources = Array.from({ length: 5 }, () => ({ card: ids.marine }));
  p.players[0].deck = [
    { card: 'lurking-snub-fighter', ref: 'snub' },
    { card: ids.fighter, ref: 'one' },
    { card: ids.fighter, ref: 'two' },
    { card: ids.fighter, ref: 'three' },
    { card: ids.marine, ref: 'ground' },
    { card: 'academy-training', ref: 'upgrade' },
    ...Array.from({ length: 6 }, () => ({ card: ids.marine })),
  ];
  p.players[1].ground = [{ card: ids.marine, ref: 'enemy' }];
  return p;
}
test('Ackbar searches space units with a joint printed-cost budget, ignoring aspect penalties for free plays', () => {
  const s = scenario(fleet()),
    looking = mode(step(s.state, 'play'), 'defeat-ackbar');
  expect(looking.cards[s.refs.ackbar!]!.zone).toBe('discard');
  expect(looking.execution.decision!.selection).toMatchObject({
    cards: [s.refs.snub!, s.refs.one!, s.refs.two!, s.refs.three!],
    budget: { max: 5 },
  });
  expect(() => step(looking, 'search', [s.refs.ground!])).toThrow();
  expect(() => step(looking, 'search', [s.refs.upgrade!])).toThrow();
  expect(() =>
    step(looking, 'search', [s.refs.snub!, s.refs.one!, s.refs.two!, s.refs.three!]),
  ).toThrow();
  resume(looking, choose(looking, 'search', [s.refs.snub!, s.refs.one!, s.refs.two!]));
  const pending = step(looking, 'search', [s.refs.snub!, s.refs.one!, s.refs.two!]);
  resume(pending, randomInput(pending));
  const plays = advance(pending, randomInput(pending)).state;
  expect(plays.execution.decision!.options.map(o => o.intent)).toEqual(
    [s.refs.snub!, s.refs.one!, s.refs.two!].map(card => ({ kind: 'play', card })),
  );
  expect(plays.players.alice!.resources.every(id => plays.cards[id]!.exhausted)).toBe(true);
  const first = play(plays, s.refs.two!);
  expect(first.cards[s.refs.two!]!.zone).toBe('space');
  expect(first.execution.decision!.options).toHaveLength(2);
  resume(
    first,
    choose(first, i => i.kind === 'play' && i.card === s.refs.snub),
  );
  const trigger = play(first, s.refs.snub!);
  expect(trigger.execution.frames[0]).toMatchObject({
    kind: 'effect',
    effect: { kind: 'select-unit' },
  });
  expect(trigger.cards[s.refs.one!]!.zone).toBe('deck');
  const afterTrigger = target(trigger, s.refs.enemy!);
  expect(afterTrigger.cards[s.refs.enemy!]!.exhausted).toBe(true);
  const done = play(afterTrigger, s.refs.one!);
  expect(done.searching).toEqual([]);
  expect(done.execution.decision!.playerId).toBe('bob');
  expect(done.players.alice!.resources.every(id => done.cards[id]!.exhausted)).toBe(true);
});
test('Ackbar can stay in play or fail to find any cards after sacrificing himself', () => {
  const s = scenario(fleet()),
    choice = step(s.state, 'play');
  expect(mode(choice, 'keep-ackbar').cards[s.refs.ackbar!]!.zone).toBe('ground');
  const empty = search(mode(choice, 'defeat-ackbar'), []);
  expect(empty.searching).toEqual([]);
  expect(empty.players.alice!.deck).toHaveLength(12);
  expect(empty.facts.some(f => f.type === 'revealed')).toBe(false);
});
test('search privacy hides unchosen deck identities while selected play choices survive reload', () => {
  const s = scenario(fleet()),
    a = mode(step(s.state, 'play'), 'defeat-ackbar'),
    b = structuredClone(a);
  b.cards[s.refs.ground!]!.cardId = ids.consular;
  const frame = b.execution.frames[0];
  if (frame?.kind !== 'search') throw new Error('No search');
  frame.cards.find(c => c.instanceId === s.refs.ground)!.cardId = ids.consular;
  b.facts
    .find(f => f.type === 'looked-at')!
    .cards.find(c => c.instanceId === s.refs.ground)!.cardId = ids.consular;
  for (const viewer of [
    { role: 'player', playerId: 'bob' } as const,
    { role: 'spectator' } as const,
  ]) {
    const p = new Projector(a.gameId, viewer, 'k'.repeat(32));
    expect(p.project(a)).toEqual(p.project(b));
  }
  const plays = search(a, [s.refs.one!, s.refs.two!]);
  const view = new Projector(plays.gameId, { role: 'player', playerId: 'alice' }).project(plays);
  expect(view.decision!.inspectedCards).toHaveLength(2);
  resume(plays, choose(plays, 'play'));
});
function forge() {
  const p = position();
  p.players[0].hand = [{ card: 'reforge', ref: 'reforge' }];
  p.players[0].resources = Array.from({ length: 8 }, () => ({ card: ids.marine }));
  p.players[0].ground = [
    { card: ids.marine, ref: 'host' },
    { card: ids.marine, ref: 'other' },
  ];
  p.players[1].ground = [{ card: ids.marine, ref: 'enemy' }];
  p.attachments = [{ card: 'shield', unit: 'host', ref: 'old', owner: 'bob' }];
  p.players[0].deck = [
    { card: 'academy-training', ref: 'academy' },
    { card: 'constructed-lightsaber', ref: 'saber' },
    { card: 'shadow-of-stygeon-prime', ref: 'shadow' },
    { card: 'clone-pilot', ref: 'pilot' },
    ...Array.from({ length: 8 }, () => ({ card: ids.marine })),
  ];
  return p;
}
function forgeSearch(s: ReturnType<typeof scenario>) {
  return step(target(step(s.state, 'play'), s.refs.host!), 'accept-effect', [s.refs.old!]);
}
test('Reforge defeats even an enemy-controlled upgrade on a friendly unit, then finds only attachable upgrades', () => {
  const s = scenario(forge()),
    looking = forgeSearch(s);
  expect(looking.cards[s.refs.old!]!.zone).toBe('set-aside');
  expect(looking.execution.decision!.selection!.cards).toEqual([s.refs.academy!, s.refs.shadow!]);
  expect(() => step(looking, 'search', [s.refs.saber!])).toThrow();
  expect(() => step(looking, 'search', [s.refs.pilot!])).toThrow();
  resume(looking, choose(looking, 'search', [s.refs.academy!]));
  const pending = step(looking, 'search', [s.refs.academy!]);
  resume(pending, randomInput(pending));
  const playing = advance(pending, randomInput(pending)).state;
  expect(playing.execution.decision!.options.map(o => o.intent)).toEqual([
    { kind: 'play', card: s.refs.academy!, target: s.refs.host! },
  ]);
  resume(playing, choose(playing, 'play'));
  const done = step(playing, 'play');
  expect(done.cards[s.refs.academy!]!.attachedTo!.instanceId).toBe(s.refs.host!);
  expect(done.players.alice!.resources.filter(id => !done.cards[id]!.exhausted)).toHaveLength(4);
});
test('Reforge discount still pays aspect penalties, and unaffordable chosen upgrades return to the bottom', () => {
  for (const resources of [4, 8]) {
    const p = forge();
    p.players[0].resources!.length = resources;
    const s = scenario(p),
      playing = search(forgeSearch(s), [s.refs.shadow!]);
    const done = resources === 8 ? step(playing, 'play') : playing;
    if (resources === 8) {
      expect(done.cards[s.refs.shadow!]!.attachedTo!.instanceId).toBe(s.refs.host!);
      expect(done.players.alice!.resources.every(id => done.cards[id]!.exhausted)).toBe(true);
    } else {
      expect(done.players.alice!.deck.at(-1)).toBe(s.refs.shadow!);
      expect(done.searching).toEqual([]);
      expect(done.execution.decision!.kind).toBe('action');
    }
  }
});
test('Reforge does not attach to a replacement copy if its original host leaves before play', () => {
  const s = scenario(forge()),
    playing = search(forgeSearch(s), [s.refs.academy!]);
  const host = playing.cards[s.refs.host!]!,
    old = host.incarnation;
  move(playing, host, 'hand');
  move(playing, host, 'ground');
  expect(host.incarnation).toBeGreaterThan(old);
  playing.execution.decision = null;
  settle(playing);
  expect(playing.players.alice!.deck.at(-1)).toBe(s.refs.academy!);
  expect(playing.cards[s.refs.academy!]!.attachedTo).toBeNull();
  expect(decodeState(encodeState(playing))).toEqual(playing);
});
test('a host defeated by losing the old upgrade cannot receive the searched upgrade', () => {
  const p = forge();
  p.attachments![0] = { card: 'academy-training', unit: 'host', ref: 'old' };
  p.players[0].ground![0]!.damage = 4;
  const s = scenario(p),
    looking = forgeSearch(s);
  expect(looking.cards[s.refs.host!]!.zone).toBe('discard');
  expect(looking.execution.decision!.selection!.cards).toEqual([]);
  expect(search(looking, []).execution.decision!.kind).toBe('action');
});
test('checkpoints reject altered search budgets and forged host bindings', () => {
  const s = scenario(fleet()),
    looking = mode(step(s.state, 'play'), 'defeat-ackbar');
  looking.execution.decision!.selection!.budget!.max = 6;
  expect(() => decodeState(encodeState(looking))).toThrow();
  const t = scenario(forge()),
    bad = forgeSearch(t),
    frame = bad.execution.frames[0];
  if (frame?.kind !== 'search') throw new Error('No search');
  frame.bindings!['reforged-host']!.incarnation += 100;
  expect(() => decodeState(encodeState(bad))).toThrow();
});

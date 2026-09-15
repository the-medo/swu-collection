import { expect, test } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { applyViewDelta, diffViews } from '../view/delta.ts';
import { clientMessageSchema } from '../view/wire.ts';
import { serverMessageSchema } from '../view/parse.ts';
import { Projector } from '../projection/projector.ts';
import { LocalGame } from '../host/session.ts';
import { advance } from '../engine/advance.ts';
import { instance, move } from '../engine/state.ts';
import { scenario } from './scenario.ts';
import { config, choose, position, ids } from './helpers.ts';

test('deltas reconstruct each player and spectator view throughout setup and actions', () => {
  const game = new LocalGame(config(), () => 0);
  const viewers = [
    new Projector(game.state.gameId, { role: 'player', playerId: 'alice' }),
    new Projector(game.state.gameId, { role: 'player', playerId: 'bob' }),
    new Projector(game.state.gameId, { role: 'spectator' }),
  ];
  const views = viewers.map(p => p.project(game.state));
  for (let step = 0; step < 30; step++) {
    const state = game.state,
      decision = state.execution.decision!;
    let option = decision.options.find(o => o.intent.kind === 'play');
    option ??= decision.options.find(o => o.intent.kind === 'pass');
    option ??= decision.options[0]!;
    const selection = decision.selection;
    game.submit(
      choose(
        state,
        intent => intent === option!.intent,
        selection?.cards.slice(0, selection.min) ?? [],
      ),
    );
    for (let i = 0; i < viewers.length; i++) {
      const after = viewers[i]!.project(game.state),
        before = views[i]!;
      const delta = diffViews(before, after);
      expect(
        serverMessageSchema.safeParse({
          type: 'snapshot',
          wireVersion: 1,
          viewer: { role: 'spectator' },
          view: after,
        }).success,
      ).toBe(true);
      if (delta)
        expect(
          serverMessageSchema.safeParse({ type: 'delta', wireVersion: 1, delta }).success,
        ).toBe(true);
      expect(delta ? applyViewDelta(before, delta) : before).toEqual(after);
      views[i] = after;
    }
  }
});

test('private-only changes produce no spectator delta or revision signal', () => {
  const input = position();
  input.players[0].hand = [{ card: ids.marine, ref: 'secret' }];
  const { state, refs } = scenario(input);
  const p = new Projector(state.gameId, { role: 'spectator' });
  const before = p.project(state);
  instance(state, refs.secret!).cardId = ids.fighter;
  state.players.alice!.deck.reverse();
  state.revision += 9;
  expect(diffViews(before, p.project(state))).toBeNull();
});

test('only changed cards/events travel and hover references clear when an exact copy hides', () => {
  const input = position();
  input.players[0].hand = [{ card: ids.marine, ref: 'played' }];
  input.players[0].resources = Array.from({ length: 2 }, () => ({ card: ids.fighter }));
  const { state, refs } = scenario(input);
  const next = advance(
    state,
    choose(state, i => i.kind === 'play' && i.card === refs.played),
  ).state;
  const p = new Projector(state.gameId, { role: 'spectator' });
  const before = p.project(next);
  const played = before.events.find(e => e.type === 'played')!;
  move(next, instance(next, refs.played!), 'hand');
  const after = p.project(next),
    delta = diffViews(before, after)!;
  expect(delta.cards!.remove).toEqual([played.cards[0]!.currentCardId!]);
  expect(delta.cards!.upsert).toEqual([]);
  expect(delta.events!.upsert.find(e => e.id === played.id)!.cards[0]!.currentCardId).toBeNull();
  expect(delta.events!.order).toBeUndefined();
  expect(applyViewDelta(before, delta)).toEqual(after);
});

test('reordering round-trips; stale, repeated and cross-connection deltas demand snapshots', () => {
  const { state } = scenario(position());
  const before = new Projector(state.gameId, { role: 'spectator' }).project(state);
  const after = structuredClone(before);
  after.revision++;
  after.cards.reverse();
  const delta = diffViews(before, after)!;
  expect(delta.cards!.upsert).toEqual([]);
  expect(delta.cards!.order).toEqual(after.cards.map(c => c.id));
  expect(applyViewDelta(before, delta)).toEqual(after);
  expect(() => applyViewDelta(after, delta)).toThrow('snapshot required');
  for (const wrong of [{ epoch: 'other' }, { gameId: 'other' }, { fromRevision: 99 }])
    expect(() => applyViewDelta(before, { ...delta, ...wrong })).toThrow('snapshot required');
  expect(() =>
    applyViewDelta(before, {
      ...delta,
      cards: { upsert: [], remove: [], order: ['unknown'] },
    }),
  ).toThrow('collection order');
  expect(() => diffViews(before, { ...after, revision: before.revision })).toThrow(
    'revision reused',
  );
});

test('wire intent rejects raw authority fields, unbounded IDs, malformed handles and extra properties', () => {
  const command = {
    gameId: 'game-test',
    epoch: 'a'.repeat(32),
    expectedRevision: 0,
    decisionId: 'b'.repeat(32),
    optionId: 'c'.repeat(32),
  };
  const message = { type: 'command' as const, commandId: randomUUID(), command };
  expect(clientMessageSchema.parse(message)).toEqual({
    ...message,
    command: { ...command, selections: [] },
  });
  for (const invalid of [
    { ...message, playerId: 'p1' },
    { ...message, commandId: 'x'.repeat(1000) },
    { ...message, command: { ...command, optionId: 'private-option' } },
    { ...message, command: { ...command, state: {} } },
    { ...message, command: { ...command, selections: Array(513).fill('a'.repeat(32)) } },
    { type: 'authenticate', wireVersion: 2, ticket: 'a'.repeat(43) },
    { type: 'preferences', handsToPlayers: true },
  ])
    expect(clientMessageSchema.safeParse(invalid).success).toBe(false);
});

test('private top-deck inspection is cleared by a delta when leaving that position', () => {
  const { state } = scenario(position());
  const before = new Projector(state.gameId, { role: 'player', playerId: 'alice' }).project(state);
  const face = before.cards.find(c => c.face)!.face!;
  before.privateDeckTop = { id: 'a'.repeat(32), face };
  const after = { ...before, revision: before.revision + 1, privateDeckTop: null };
  const delta = diffViews(before, after)!;
  expect(delta.modules?.privateDeckTop).toBeNull();
  expect(applyViewDelta(before, delta)).toEqual(after);
  expect(serverMessageSchema.safeParse({ type: 'delta', wireVersion: 1, delta }).success).toBe(
    true,
  );
});

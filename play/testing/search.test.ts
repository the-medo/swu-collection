import { expect, test } from 'bun:test';
import { advance } from '../engine/advance.ts';
import { decodeState, encodeState } from '../engine/checkpoint.ts';
import { instance } from '../engine/state.ts';
import type { GameState } from '../engine/model.ts';
import { LocalGame, replay } from '../host/session.ts';
import { Projector } from '../projection/projector.ts';
import { scenario } from './scenario.ts';
import { choose, config, ids, position, setup } from './helpers.ts';

function fixture(event = 'recruit') {
  const p = position('search-position');
  p.players[0].hand = [{ card: event, ref: 'source' }];
  p.players[0].resources = Array.from({ length: 6 }, () => ({ card: ids.marine }));
  p.players[0].deck = [
    { card: ids.marine, ref: 'one' },
    { card: 'academy-training', ref: 'upgrade' },
    { card: ids.fighter, ref: 'two' },
    { card: 'open-fire', ref: 'event' },
    { card: ids.consular, ref: 'three' },
    { card: ids.racer, ref: 'untouched' },
  ];
  return p;
}
function play(state: GameState, card: string) {
  return advance(
    state,
    choose(state, i => i.kind === 'play' && i.card === card),
  ).state;
}
function select(state: GameState, cards: string[]) {
  return advance(state, choose(state, 'search', cards)).state;
}
function randomness(state: GameState, values = state.execution.random!.bounds.map(() => 0)) {
  return {
    type: 'random',
    gameId: state.gameId,
    expectedRevision: state.revision,
    requestId: state.execution.random!.id,
    values,
  };
}
function resume(state: GameState, input: unknown) {
  const child = Bun.spawnSync(
    [process.execPath, new URL('./fixtures/resume.ts', import.meta.url).pathname],
    {
      stdin: new TextEncoder().encode(JSON.stringify({ state: encodeState(state), input })),
      stdout: 'pipe',
      stderr: 'pipe',
    },
  );
  expect(child.stderr.toString()).toBe('');
  expect(child.exitCode).toBe(0);
  return JSON.parse(child.stdout.toString()).state;
}

test('v8 §8.26: inspect only the top five; draw the selected unit and randomize only the unchosen remainder to bottom', () => {
  const { state: initial, refs } = scenario(fixture());
  const state = play(initial, refs.source!);
  expect(state.execution.decision?.kind).toBe('search');
  expect(state.execution.decision?.selection).toEqual({
    cards: [refs.one!, refs.two!, refs.three!],
    min: 0,
    max: 1,
  });
  expect(instance(state, refs.one!).zone).toBe('deck');
  const input = choose(state, 'search', [refs.two!]);
  const pending = advance(state, input).state;
  expect(resume(state, input)).toEqual(pending);
  expect(pending.execution.random?.bounds).toEqual([4, 3, 2]);
  const random = randomness(pending, [0, 0, 0]);
  const after = advance(pending, random).state;
  expect(resume(pending, random)).toEqual(after);
  expect(after.players.alice!.hand).toEqual([refs.two!]);
  expect(after.players.alice!.deck).toEqual([
    refs.untouched!,
    refs.upgrade!,
    refs.event!,
    refs.three!,
    refs.one!,
  ]);
  expect(
    after.facts.filter(f => f.type === 'revealed').flatMap(f => f.cards.map(c => c.instanceId)),
  ).toEqual([refs.two!]);
  for (const id of [refs.one!, refs.upgrade!, refs.event!, refs.three!])
    expect(instance(after, id).visibility).toBe(instance(initial, id).visibility + 1);
  expect(instance(after, refs.untouched!).visibility).toBe(
    instance(initial, refs.untouched!).visibility,
  );
});

test('search may find nothing even with eligible cards, and no-match searches still inspect and randomize', () => {
  const { state: initial, refs } = scenario(fixture());
  const pending = select(play(initial, refs.source!), []);
  expect(pending.execution.random?.bounds).toEqual([5, 4, 3, 2]);
  const state = advance(pending, randomness(pending)).state;
  expect(state.players.alice!.hand).toEqual([]);
  expect(state.facts.some(f => f.type === 'revealed' || f.type === 'drawn')).toBe(false);
  const p = fixture();
  p.players[0].deck = Array.from({ length: 3 }, () => ({ card: 'open-fire' }));
  const blank = scenario(p);
  const looking = play(blank.state, blank.refs.source!);
  expect(looking.execution.decision?.selection).toEqual({ cards: [], min: 0, max: 0 });
  expect(
    new Projector(looking.gameId, { role: 'player', playerId: 'alice' }).project(looking).decision
      ?.inspectedCards,
  ).toHaveLength(3);
  expect(select(looking, []).execution.random?.bounds).toEqual([3, 2]);
});

test('Remnant Reserves supports up to three exact copies; duplicate, excessive, wrong-kind and out-of-range selections are rejected', () => {
  const { state: initial, refs } = scenario(fixture('remnant-reserves'));
  const state = play(initial, refs.source!);
  for (const cards of [
    [refs.one!, refs.one!],
    [refs.one!, refs.two!, refs.three!, refs.untouched!],
    [refs.upgrade!],
    [refs.untouched!],
  ]) {
    expect(() => select(state, cards)).toThrow();
  }
  const original = encodeState(state);
  const pending = select(state, [refs.three!, refs.one!, refs.two!]);
  const after = advance(pending, randomness(pending)).state;
  expect(after.players.alice!.hand).toEqual([refs.three!, refs.one!, refs.two!]);
  expect(after.facts.find(f => f.type === 'drawn')?.amount).toBe(3);
  expect(encodeState(state)).toBe(original);
});

test('Greef searches for an upgrade through a played trigger; the inspected source remains a unit in play', () => {
  const p = fixture('greef-karga--affable-commissioner');
  const { state: initial, refs } = scenario(p);
  const state = play(initial, refs.source!);
  expect(instance(state, refs.source!).zone).toBe('ground');
  expect(state.execution.decision?.selection?.cards).toEqual([refs.upgrade!]);
  const pending = select(state, [refs.upgrade!]);
  const after = advance(pending, randomness(pending)).state;
  expect(instance(after, refs.upgrade!).zone).toBe('hand');
  expect(after.execution.decision?.playerId).toBe('bob');
});

test('empty and one-card decks never cause search fatigue; zero-length shuffle input is recoverable', () => {
  const empty = fixture();
  empty.players[0].deck = [];
  const a = scenario(empty);
  const after = play(a.state, a.refs.source!);
  expect(after.execution.decision?.kind).toBe('action');
  expect(instance(after, after.players.alice!.base).damage).toBe(0);
  const single = fixture();
  single.players[0].deck = [{ card: ids.marine, ref: 'only' }];
  const b = scenario(single);
  const pending = select(play(b.state, b.refs.source!), [b.refs.only!]);
  expect(pending.execution.random?.bounds).toEqual([]);
  const done = advance(pending, randomness(pending)).state;
  expect(resume(pending, randomness(pending))).toEqual(done);
  expect(done.players.alice!.deck).toEqual([]);
  expect(instance(done, done.players.alice!.base).damage).toBe(0);
});

test('only the chooser sees inspected faces and selection handles, including when hands are revealed to everyone', () => {
  const { state: initial, refs } = scenario(fixture());
  initial.disclosure = { handsToPlayers: true, handsToSpectators: true };
  const state = play(initial, refs.source!);
  const chooser = new Projector(state.gameId, { role: 'player', playerId: 'alice' });
  const view = chooser.project(state);
  expect(view.decision?.inspectedCards.map(c => c.face.cardId)).toEqual([
    ids.marine,
    'academy-training',
    ids.fighter,
    'open-fire',
    ids.consular,
  ]);
  expect(view.cards.some(c => c.id === view.decision!.inspectedCards[0]!.id)).toBe(false);
  const unit = view.decision!.inspectedCards[2]!;
  const input = chooser.command(state, {
    gameId: state.gameId,
    epoch: view.epoch,
    expectedRevision: view.revision,
    decisionId: view.decision!.id,
    optionId: view.decision!.options[0]!.id,
    selections: [unit.id],
  });
  expect(input.type === 'decision' && input.selections).toEqual([refs.two!]);
  const secretFixture = fixture();
  secretFixture.players[0].deck![0]!.card = 'surprise-strike';
  const secret = scenario(secretFixture);
  secret.state.disclosure = { ...initial.disclosure };
  const different = play(secret.state, secret.refs.source!);
  for (const viewer of [
    { role: 'spectator' } as const,
    { role: 'player', playerId: 'bob' } as const,
  ]) {
    const key = 's'.repeat(32);
    expect(new Projector(state.gameId, viewer, key).project(state)).toEqual(
      new Projector(state.gameId, viewer, key).project(different),
    );
  }
});

test('revealed labels persist without exposing hidden hand/deck tracking and old inspection handles expire', () => {
  const { state: initial, refs } = scenario(fixture());
  const state = play(initial, refs.source!);
  const viewer = new Projector(state.gameId, { role: 'player', playerId: 'alice' });
  const before = viewer.project(state);
  const old = before.decision!.inspectedCards[0]!.id;
  const pending = select(state, [refs.one!]);
  const after = advance(pending, randomness(pending)).state;
  const own = viewer.project(after);
  expect(own.cards.some(c => c.id === old)).toBe(false);
  const spectator = new Projector(state.gameId, { role: 'spectator' }).project(after);
  expect(spectator.events.find(f => f.type === 'revealed')?.cards[0]).toMatchObject({
    cardId: ids.marine,
    currentCardId: null,
  });
  expect(spectator.cards.some(c => c.zone === 'hand')).toBe(false);
  expect(spectator.events.some(f => f.type === 'looked-at')).toBe(false);
  const selected = own.cards.find(c => c.zone === 'hand')!;
  expect(own.events.find(f => f.type === 'revealed')?.cards[0]?.currentCardId).toBe(selected.id);
});

test('search checkpoints reject altered inspection, illegal reserved selections and fabricated random bounds', () => {
  const { state: initial, refs } = scenario(fixture());
  const state = play(initial, refs.source!);
  const altered = structuredClone(state);
  const frame = altered.execution.frames[0]!;
  if (frame.kind !== 'search') throw new Error('Expected search');
  frame.cards.reverse();
  expect(() => decodeState(encodeState(altered))).toThrow();
  const pending = select(state, [refs.one!]);
  const bad = structuredClone(pending);
  bad.execution.random!.bounds = [5, 4, 3, 2];
  expect(() => decodeState(encodeState(bad))).toThrow();
  const selected = structuredClone(pending);
  const sf = selected.execution.frames[0]!;
  if (sf.kind !== 'search-shuffle') throw new Error('Expected shuffle');
  sf.selected = [refs.upgrade!];
  expect(() => decodeState(encodeState(selected))).toThrow();
});

test('host search randomness is atomic and private recordings replay every accepted choice', () => {
  const c = config('search-recording');
  for (const player of c.players)
    player.deck = [
      { cardId: 'recruit', quantity: 12 },
      { cardId: ids.marine, quantity: 12 },
    ];
  let failing = false;
  const game = new LocalGame(c, upper => {
    if (failing) throw new Error('random unavailable');
    return upper - 1;
  });
  let state = setup(game);
  const recruit = state.execution.decision!.options.find(
    o => o.intent.kind === 'play' && instance(state, o.intent.card).cardId === 'recruit',
  )!;
  state = game.submit(choose(state, i => i === recruit.intent));
  const before = game.recording;
  failing = true;
  expect(() => game.submit(choose(state, 'search', []))).toThrow('random unavailable');
  expect(game.state).toEqual(state);
  expect(game.recording).toEqual(before);
  failing = false;
  let searches = 0;
  for (let n = 0; n < 100 && !state.result; n++) {
    const d = state.execution.decision!;
    if (d.kind === 'search') searches++;
    const option =
      d.options.find(o => o.intent.kind === 'play') ??
      d.options.find(o => o.intent.kind === 'attack') ??
      d.options.find(o => o.intent.kind === 'pass') ??
      d.options[0]!;
    state = game.submit(
      choose(
        state,
        i => i === option.intent,
        d.selection ? d.selection.cards.slice(0, d.selection.max) : [],
      ),
    );
    expect(replay(game.recording)).toEqual(state);
  }
  expect(searches).toBeGreaterThan(0);
}, 15_000);

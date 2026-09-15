import { diffViews, applyViewDelta, gameViewSchema } from '../view/types.ts';
import { describe, expect, test } from 'bun:test';
import { Projector } from '../projection/projector.ts';
import { advance } from '../engine/advance.ts';
import { instance, move } from '../engine/state.ts';
import { scenario } from './scenario.ts';
import { choose, ids, position } from './helpers.ts';
import type { Viewer } from '../projection/projector.ts';

const key = 'test-only-projector-key-not-for-production';
describe('viewer projections and exact-copy references', () => {
  function hiddenFixture() {
    const input = position();
    input.players[0].hand = [
      { card: ids.marine, ref: 'handA' },
      { card: ids.fighter, ref: 'handB' },
    ];
    input.players[0].resources = [{ card: ids.fighter, ref: 'resourceA' }];
    input.players[1].hand = [{ card: ids.trooper, ref: 'enemyHand' }];
    return scenario(input);
  }
  test('secret-differential: concealed faces and deck order do not alter opponent/spectator payloads', () => {
    const { state, refs } = hiddenFixture();
    const changed = structuredClone(state);
    instance(changed, refs.handA!).cardId = ids.consular;
    instance(changed, refs.resourceA!).cardId = ids.racer;
    changed.players.alice!.deck.reverse();
    for (const viewer of [
      { role: 'player', playerId: 'bob' },
      { role: 'spectator' },
    ] satisfies Viewer[]) {
      const projector = new Projector(state.gameId, viewer, key);
      const view = projector.project(state);
      expect(projector.project(changed)).toEqual(view);
      expect(view.cards.some(card => card.face?.cardId === ids.consular)).toBe(false);
      expect(view.decision).toBeNull();
      expect(JSON.stringify(view)).not.toContain('instanceId');
      expect(JSON.stringify(view)).not.toContain('bounds');
    }
  });
  test('players see their hand/resource faces; hand disclosure never exposes resource faces', () => {
    const { state } = hiddenFixture();
    const own = new Projector(state.gameId, { role: 'player', playerId: 'alice' }, key).project(
      state,
    );
    expect(own.cards.filter(c => c.zone === 'hand')).toHaveLength(2);
    expect(own.cards.filter(c => c.zone === 'resources').every(c => c.face !== null)).toBe(true);
    state.disclosure.handsToSpectators = true;
    const spectator = new Projector(state.gameId, { role: 'spectator' }, key).project(state);
    expect(spectator.cards.filter(c => c.zone === 'hand')).toHaveLength(3);
    expect(spectator.cards.find(c => c.zone === 'resources')?.face).toBeNull();
    const bob = new Projector(state.gameId, { role: 'player', playerId: 'bob' }, key).project(
      state,
    );
    expect(bob.cards.filter(c => c.zone === 'hand')).toHaveLength(1);
    const hidden = new Projector(
      state.gameId,
      { role: 'spectator', showRevealedHands: false },
      key,
    ).project(state);
    expect(hidden.cards.filter(c => c.zone === 'hand')).toHaveLength(0);
  });
  test('scoped opaque options translate to the authenticated seat and reject forged/stale commands', () => {
    const { state } = hiddenFixture();
    const projector = new Projector(state.gameId, { role: 'player', playerId: 'alice' }, key);
    const view = projector.project(state),
      decision = view.decision!;
    const option = decision.options.find(
      o => o.kind === 'use-ability' && o.action?.id === 'damage-bases',
    )!;
    const command = {
      gameId: view.gameId,
      epoch: view.epoch,
      expectedRevision: view.revision,
      decisionId: decision.id,
      optionId: option.id,
    };
    const translated = projector.command(state, command);
    expect(translated).toMatchObject({ type: 'decision', playerId: 'alice' });
    const next = advance(state, translated).state;
    expect(() => projector.command(next, command)).toThrow();
    expect(() => projector.command(state, { ...command, optionId: 'o0' })).toThrow();
    expect(() => projector.command(state, { ...command, gameId: 'other' })).toThrow();
    expect(() =>
      new Projector(state.gameId, { role: 'spectator' }, key).command(state, command),
    ).toThrow();
    expect(() =>
      new Projector(state.gameId, { role: 'player', playerId: 'bob' }, key).command(state, command),
    ).toThrow();
    expect(() =>
      new Projector(state.gameId, { role: 'player', playerId: 'outsider' }, key).project(state),
    ).toThrow();
  });
  test('log hover addresses just the played copy and loses its link on entry to a hidden zone', () => {
    const input = position();
    input.players[0].hand = [
      { card: ids.marine, ref: 'first' },
      { card: ids.marine, ref: 'second' },
    ];
    input.players[0].ground = [{ card: ids.marine, ref: 'third' }];
    input.players[0].resources = Array.from({ length: 2 }, () => ({ card: ids.fighter }));
    const { state, refs } = scenario(input);
    const next = advance(
      state,
      choose(state, i => i.kind === 'play' && i.card === refs.second),
    ).state;
    const projector = new Projector(next.gameId, { role: 'spectator' }, key);
    const view = projector.project(next);
    const ref = view.events.find(e => e.type === 'played')!.cards[0]!;
    expect(ref.cardId).toBe(ids.marine);
    expect(view.cards.filter(c => c.id === ref.currentCardId)).toHaveLength(1);
    expect(view.cards.find(c => c.id === ref.currentCardId)?.exhausted).toBe(true);
    // Exercise the same zone primitive future bounce/shuffle effects must use.
    const hidden = structuredClone(next);
    move(hidden, instance(hidden, refs.second!), 'hand');
    const after = projector.project(hidden);
    expect(after.events.find(e => e.type === 'played')!.cards[0]).toEqual({
      ...ref,
      currentCardId: null,
    });
    expect(after.cards.some(c => c.id === ref.currentCardId)).toBe(false);
    move(hidden, instance(hidden, refs.second!), 'ground');
    const returned = projector.project(hidden);
    expect(returned.events.find(e => e.type === 'played')!.cards[0]!.currentCardId).toBeNull();
  });
});

test('printed game limits distinguish spent deployment, repeatable leaders and base Epic usage', () => {
  const input = position('epic-markers');
  input.players[0].base.card = 'energy-conversion-lab';
  input.players[0].leader.abilityUses = { deploy: 1, 'damage-bases': 4 };
  input.players[0].leader.deployedAs = 'unit';
  input.players[0].hand = [{ card: ids.marine }];
  input.players[0].resources = Array.from({ length: 6 }, () => ({ card: ids.marine }));
  input.players[1].resources = [{ card: ids.fighter }];
  input.players[1].leader.card = 'admiral-trench--chk-chk-chk-chk';
  input.players[1].leader.abilityUses = { deploy: 2 };
  let { state } = scenario(input);
  const projector = new Projector(state.gameId, { role: 'player', playerId: 'alice' }, key);
  const before = projector.project(state);
  const ownLeader = before.cards.find(
    c => c.owner === 'alice' && c.face?.printedKind === 'leader',
  )!;
  expect(ownLeader.limitedActions).toEqual([{ id: 'deploy', max: 1, used: 1, deployment: true }]);
  expect(
    before.cards.find(c => c.owner === 'bob' && c.face?.printedKind === 'leader')!.limitedActions,
  ).toEqual([]);
  expect(before.cards.filter(c => c.face === null).every(c => c.limitedActions.length === 0)).toBe(
    true,
  );
  const base = before.cards.find(c => c.owner === 'alice' && c.face?.kind === 'base')!;
  expect(base.limitedActions).toEqual([{ id: 'epic', max: 1, used: 0, deployment: false }]);
  state = advance(
    state,
    choose(state, i => i.kind === 'use-ability' && i.card === state.players.alice!.base),
  ).state;
  const after = projector.project(state);
  expect(after.cards.find(c => c.id === base.id)!.limitedActions).toEqual([
    { id: 'epic', max: 1, used: 1, deployment: false },
  ]);
  expect(gameViewSchema.parse(after)).toEqual(after);
  expect(applyViewDelta(before, diffViews(before, after)!)).toEqual(after);
});

test('returned leaders retain deployment history and multi-use bases expose the remaining limit', () => {
  const input = position('returned-limits');
  input.players[0].base.card = 'mystic-monastery';
  input.players[0].leader.abilityUses = { deploy: 1 };
  let { state } = scenario(input);
  const projector = new Projector(state.gameId, { role: 'spectator' }, key);
  const leader = projector
    .project(state)
    .cards.find(c => c.owner === 'alice' && c.face?.kind === 'leader')!;
  expect(leader.limitedActions).toEqual([{ id: 'deploy', max: 1, used: 1, deployment: true }]);
  state = advance(
    state,
    choose(state, i => i.kind === 'use-ability' && i.card === state.players.alice!.base),
  ).state;
  expect(
    projector.project(state).cards.find(c => c.owner === 'alice' && c.face?.kind === 'base')!
      .limitedActions,
  ).toEqual([{ id: 'gain-force', max: 3, used: 1, deployment: false }]);
});

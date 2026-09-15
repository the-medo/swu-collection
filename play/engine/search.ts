import { progressArrange } from './deck-order.ts';
import type { CardEffect } from '../cards/definition.ts';
import type { CardReference } from './model.ts';
import type { EffectContext } from './bindings.ts';
import { discardCards } from './phase-history.ts';
import { recordDraw } from './draw.ts';
import { effectFrames } from './triggers.ts';
import { matchesCard, printedCost } from './inspection.ts';
import type { CardFilter } from '../cards/definition.ts';
import type { Frame, GameState } from './model.ts';
import { fact, instance, move, reference, opponent } from './state.ts';

export type SearchFrame = Extract<Frame, { kind: 'search' | 'search-shuffle' }>;
export function searchOwner(state: GameState, frame: SearchFrame) {
  return frame.effect.player === 'enemy' ? opponent(state, frame.playerId) : frame.playerId;
}
export function searchFilter(frame: SearchFrame): CardFilter {
  return {
    ...frame.effect.cardFilter,
    ...(frame.effect.hasKeyword ? { hasKeyword: frame.effect.hasKeyword } : {}),
    ...(frame.effect.name ? { name: frame.effect.name } : {}),
    ...(frame.effect.filter === 'any' ? {} : { kind: frame.effect.filter }),
    ...(frame.effect.anyAspect ? { anyAspect: frame.effect.anyAspect } : {}),
    ...(frame.effect.trait ? { trait: frame.effect.trait } : {}),
    ...(frame.effect.arena ? { arena: frame.effect.arena } : {}),
    ...(frame.effect.attachesTo ? { attachesTo: frame.effect.attachesTo } : {}),
  };
}
export function searchSelection(state: GameState, frame: SearchFrame) {
  const cards = frame.cards
    .filter(ref => matchesCard(state, ref, searchFilter(frame), frame))
    .map(ref => ref.instanceId);
  // V8 §8.26 permits resolving a hidden search as if nothing matched.
  return {
    cards,
    min: 0,
    max: Math.min(frame.effect.max, cards.length),
    ...(frame.effect.maxTotalCost === undefined
      ? {}
      : {
          budget: {
            max: frame.effect.maxTotalCost,
            costs: Object.fromEntries(
              cards.map(id => [id, printedCost(state, instance(state, id))]),
            ),
          },
        }),
  };
}
export function assertSearch(state: GameState, frame: SearchFrame) {
  if (frame.effect.destination === 'deck-top' && (frame.effect.after || frame.effect.afterEach))
    throw new Error('Ordered searches cannot queue draw continuations');
  if (frame.effect.destination && frame.effect.play)
    throw new Error('Discarding search cannot play directly');
  if (frame.effect.play && searchOwner(state, frame) !== frame.playerId)
    throw new Error('Opponent search cannot play cards');
  if (frame.effect.play && (frame.effect.after || frame.effect.afterEach))
    throw new Error('Search cannot combine direct play and after-draw effects');
  if (frame.effect.after && frame.effect.max !== 1)
    throw new Error('After-draw search effects require one selected card');
  const top = state.players[searchOwner(state, frame)]!.deck.slice(0, frame.effect.count).map(id =>
    reference(instance(state, id)),
  );
  if (JSON.stringify(top) !== JSON.stringify(frame.cards.map(reference)))
    throw new Error('Invalid search inspection');
  if (frame.kind === 'search-shuffle') {
    const selection = searchSelection(state, frame);
    if (
      frame.selected.length > selection.max ||
      new Set(frame.selected).size !== frame.selected.length ||
      frame.selected.some(id => !selection.cards.includes(id)) ||
      (selection.budget &&
        frame.selected.reduce((sum, id) => sum + (selection.budget!.costs[id] ?? Infinity), 0) >
          selection.budget.max)
    )
      throw new Error('Invalid searched selection');
  }
}
export function randomBounds(state: GameState, frame: Frame): number[] {
  if (frame.kind === 'first-player') return [2];
  if (frame.kind === 'random-discard' || frame.kind === 'random-card') return [frame.cards.length];
  const length =
    frame.kind === 'random-bottom'
      ? frame.cards.length
      : frame.kind === 'shuffle'
        ? state.players[frame.playerId]!.deck.length
        : frame.kind === 'search-shuffle'
          ? frame.cards.length - frame.selected.length
          : null;
  if (length === null) throw new Error('Not a random frame');
  return Array.from({ length: Math.max(0, length - 1) }, (_, i) => length - i);
}
export function searchAfterFrames(
  frame: EffectContext & { playerId: string; effect: Extract<CardEffect, { kind: 'search-deck' }> },
  selected: CardReference[] = [],
) {
  const effects = selected.flatMap(card =>
    effectFrames(frame.playerId, frame.source, frame.effect.afterEach ?? [], {
      ...frame,
      bindings: { ...frame.bindings, ...(frame.effect.bind ? { [frame.effect.bind]: card } : {}) },
    }),
  );
  if (!frame.effect.after || (!selected.length && !frame.effect.afterEvenIfEmpty)) return effects;
  const bindings = { ...frame.bindings };
  if (frame.effect.bind) {
    delete bindings[frame.effect.bind];
    if (selected[0]) bindings[frame.effect.bind] = selected[0];
  }
  return [
    ...effects,
    ...effectFrames(frame.playerId, frame.source, frame.effect.after, { ...frame, bindings }),
  ];
}

export function finishSearch(
  state: GameState,
  frame: Extract<Frame, { kind: 'search-shuffle' }>,
  values: number[],
) {
  assertSearch(state, frame);
  const remainder = frame.cards
    .filter(ref => !frame.selected.includes(ref.instanceId))
    .map(ref => ref.instanceId);
  for (let n = remainder.length - 1, i = 0; n > 0; n--, i++) {
    const chosen = values[i]!;
    [remainder[n], remainder[chosen]] = [remainder[chosen]!, remainder[n]!];
  }
  const owner = searchOwner(state, frame);
  const player = state.players[owner]!;
  const inspected = new Set(frame.cards.map(ref => ref.instanceId));
  // Keep selected cards removable by the normal movement primitive until drawn.
  // Uninspected cards retain their order; only the searched remainder is randomized.
  player.deck = [...frame.selected, ...player.deck.filter(id => !inspected.has(id)), ...remainder];
  for (const id of remainder) instance(state, id).visibility++;
  const drawn = frame.selected.map(id => instance(state, id));
  if (frame.effect.play) {
    for (const card of drawn) {
      player.deck.splice(player.deck.indexOf(card.instanceId), 1);
      state.searching.push(card.instanceId);
      fact(state, 'revealed', frame.playerId, [card]);
    }
    if (drawn.length)
      state.execution.frames.unshift(
        ...effectFrames(
          frame.playerId,
          frame.source,
          [
            {
              kind: 'play-card',
              from: 'deck',
              group: 'searched-cards',
              filter: searchFilter(frame),
              discount: frame.effect.play.discount,
              ...(frame.effect.play.free ? { free: true } : {}),
              ...(frame.effect.play.ready ? { ready: true } : {}),
              ...(frame.effect.attachesTo ? { attachTo: frame.effect.attachesTo } : {}),
              optional: false,
              ...(frame.effect.play.after
                ? { bind: 'played', effects: frame.effect.play.after }
                : {}),
            },
          ],
          { ...frame, groups: { ...frame.groups, 'searched-cards': drawn.map(reference) } },
        ),
        ...drawn.map(card => ({
          kind: 'finish-searched-play' as const,
          playerId: frame.playerId,
          target: reference(card),
        })),
      );
    return;
  }
  if (frame.effect.destination === 'deck-top') {
    if (drawn.length) {
      fact(state, 'revealed', owner, drawn);
      progressArrange(state, {
        kind: 'arrange-deck',
        owner,
        playerId: frame.playerId,
        source: frame.source,
        mode: 'bottom-any',
        stage: 'order-top',
        cards: drawn.map(reference),
        bottom: [],
        topOrder: [],
        bottomOrder: [],
      });
    }
    return;
  }
  if (frame.effect.destination === 'discard') discardCards(state, drawn, owner, frame.source);
  else {
    for (const card of drawn) move(state, card, 'hand');
    if (drawn.length) {
      if (frame.effect.reveal !== false) fact(state, 'revealed', owner, drawn);
      recordDraw(state, owner, drawn);
    }
  }
  state.execution.frames.unshift(...searchAfterFrames(frame, drawn.map(reference)));
}

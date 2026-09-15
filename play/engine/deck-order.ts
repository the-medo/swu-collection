import { discardCards } from './phase-history.ts';
import type { Frame, GameState, Intent } from './model.ts';
import { fact, instance, move, reference } from './state.ts';
export type ArrangeFrame = Extract<Frame, { kind: 'arrange-deck' }>;
function candidates(frame: ArrangeFrame) {
  return frame.stage === 'order-bottom'
    ? frame.bottom.filter(id => !frame.bottomOrder.includes(id))
    : frame.cards
        .map(c => c.instanceId)
        .filter(id => !frame.bottom.includes(id) && !frame.topOrder.includes(id));
}
export function arrangeIntents(frame: ArrangeFrame): Intent[] {
  return frame.stage === 'choose-discard' || frame.stage === 'choose-bottom'
    ? [{ kind: 'accept-effect' }]
    : candidates(frame).map(card => ({ kind: 'target', card }));
}
export function arrangeSelection(frame: ArrangeFrame) {
  return frame.stage === 'choose-discard' || frame.stage === 'choose-bottom'
    ? {
        cards: frame.cards.map(c => c.instanceId),
        min:
          frame.stage === 'choose-discard'
            ? Math.min(frame.minDiscard ?? 0, frame.cards.length)
            : 0,
        max:
          frame.stage === 'choose-discard' ? Math.min(1, frame.cards.length) : frame.cards.length,
      }
    : null;
}
export function assertArrange(state: GameState, frame: ArrangeFrame) {
  if (!state.seats.includes(frame.owner)) throw new Error('Invalid inspected deck owner');
  if (
    frame.mode === 'hand-bottom' &&
    (frame.owner !== frame.playerId ||
      frame.stage !== 'order-bottom' ||
      frame.topOrder.length ||
      JSON.stringify(frame.bottom) !== JSON.stringify(frame.cards.map(c => c.instanceId)))
  )
    throw new Error('Invalid hand bottom order');
  if (frame.minDiscard !== undefined && frame.mode !== 'discard-one')
    throw new Error('Invalid required deck discard');
  const ids = frame.cards.map(c => c.instanceId);
  if (
    frame.mode === 'hand-bottom'
      ? frame.cards.some(ref => {
          const card = state.cards[ref.instanceId];
          return (
            !card ||
            card.zone !== 'hand' ||
            card.owner !== frame.owner ||
            JSON.stringify(reference(card)) !== JSON.stringify(reference(ref))
          );
        })
      : JSON.stringify(
          state.players[frame.owner]!.deck.slice(0, ids.length).map(id =>
            reference(instance(state, id)),
          ),
        ) !== JSON.stringify(frame.cards.map(reference))
  )
    throw new Error('Invalid deck inspection');
  if (
    new Set(ids).size !== ids.length ||
    [frame.bottom, frame.topOrder, frame.bottomOrder].some(
      group => new Set(group).size !== group.length || group.some(id => !ids.includes(id)),
    ) ||
    frame.topOrder.some(id => frame.bottom.includes(id)) ||
    frame.bottomOrder.some(id => !frame.bottom.includes(id)) ||
    (frame.mode === 'discard-one' &&
      (frame.stage === 'choose-bottom' || frame.bottom.length > 0)) ||
    (frame.mode === 'bottom-any' && frame.stage === 'choose-discard') ||
    ((frame.stage === 'choose-discard' || frame.stage === 'choose-bottom') &&
      (frame.bottom.length || frame.topOrder.length || frame.bottomOrder.length)) ||
    (frame.stage === 'order-top' && frame.bottomOrder.length > 0) ||
    (frame.stage === 'order-bottom' && frame.topOrder.length !== ids.length - frame.bottom.length)
  )
    throw new Error('Invalid deck ordering');
}
// Only multi-card orders suspend; single remaining cards have a forced position.
export function progressArrange(state: GameState, frame: ArrangeFrame) {
  assertArrange(state, frame);
  if (frame.stage === 'choose-discard' || frame.stage === 'choose-bottom') {
    state.execution.frames.unshift(frame);
    return;
  }
  while (true) {
    const remaining = candidates(frame);
    if (remaining.length > 1) {
      state.execution.frames.unshift(frame);
      return;
    }
    const order = frame.stage === 'order-top' ? frame.topOrder : frame.bottomOrder;
    order.push(...remaining);
    if (frame.stage === 'order-top') {
      frame.stage = 'order-bottom';
      continue;
    }
    if (frame.mode === 'hand-bottom') {
      for (const id of frame.bottomOrder) move(state, instance(state, id), 'deck');
      fact(state, 'put-on-deck', frame.playerId, [frame.source], frame.bottomOrder.length);
      return;
    }
    const player = state.players[frame.owner]!;
    player.deck = [
      ...frame.topOrder,
      ...player.deck.slice(frame.cards.length),
      ...frame.bottomOrder,
    ];
    // A private rearrangement must not leave trackable handles from prior reveals.
    for (const ref of frame.cards) instance(state, ref.instanceId).visibility++;
    return;
  }
}
export function finishArrangeChoice(
  state: GameState,
  frame: ArrangeFrame,
  intent: Intent,
  selections: string[],
) {
  assertArrange(state, frame);
  if (frame.stage === 'choose-discard') {
    if (intent.kind !== 'accept-effect') throw new Error('Invalid discard choice');
    for (const id of selections) {
      const card = instance(state, id);
      discardCards(state, [card], frame.playerId, frame.source);
    }
    frame.cards = frame.cards.filter(c => !selections.includes(c.instanceId));
    frame.stage = 'order-top';
  } else if (frame.stage === 'choose-bottom') {
    if (intent.kind !== 'accept-effect') throw new Error('Invalid bottom choice');
    frame.bottom = [...selections];
    frame.stage = 'order-top';
  } else {
    if (intent.kind !== 'target' || !candidates(frame).includes(intent.card))
      throw new Error('Invalid ordered card');
    (frame.stage === 'order-top' ? frame.topOrder : frame.bottomOrder).push(intent.card);
  }
  progressArrange(state, frame);
}

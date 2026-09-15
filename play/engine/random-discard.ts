import type { Frame, GameState } from './model.ts';
import { instance, reference } from './state.ts';
export function assertRandomDiscard(
  state: GameState,
  frame: Extract<Frame, { kind: 'random-discard' }>,
) {
  if (
    !state.seats.includes(frame.owner) ||
    JSON.stringify(state.players[frame.owner]!.hand.map(id => reference(instance(state, id)))) !==
      JSON.stringify(frame.cards.map(reference))
  )
    throw new Error('Invalid random discard hand');
}

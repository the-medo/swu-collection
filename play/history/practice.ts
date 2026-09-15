import { decodeState, encodeState } from '../engine/checkpoint.ts';
import type { GameState } from '../engine/model.ts';

/** Preserve mechanics at any settled position, including nested payment rollback.
 * Authentication, disclosure consent and history ownership belong to the new game. */
export function practiceCheckpoint(source: GameState, gameId: string): string {
  if (
    source.result ||
    source.execution.random ||
    source.gameId === gameId ||
    source.seats.join() !== 'p1,p2'
  )
    throw new Error('Position cannot start a practice game');
  function remap(state: GameState): GameState {
    const next = structuredClone(state);
    next.gameId = gameId;
    next.disclosure = { handsToPlayers: false, handsToSpectators: false };
    if (next.playPayment)
      next.playPayment.rollback = encodeState(remap(decodeState(next.playPayment.rollback)));
    return decodeState(encodeState(next));
  }
  return encodeState(remap(source));
}

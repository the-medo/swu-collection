import type { CardInstance, GameState } from './model.ts';
// A resolved permission survives source ability loss, but never movement of
// the designated physical card or the end of its phase.
export function grantedDiscardPlay(state: GameState, card: CardInstance, actor: string) {
  return (
    card.zone === 'discard' &&
    state.phase === 'action' &&
    state.grantedPlays.find(
      p =>
        p.playerId === actor &&
        p.round === state.round &&
        p.phase === state.phase &&
        p.target.instanceId === card.instanceId &&
        p.target.cardId === card.cardId &&
        p.target.incarnation === card.incarnation &&
        p.target.visibility === card.visibility,
    )
  );
}

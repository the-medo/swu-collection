import { cardDefinition } from '../cards/catalog.ts';
import { matchesCard } from './inspection.ts';
import { cannotPlayNamedCard } from './naming.ts';
import type { CardInstance, GameState } from './model.ts';
export function cannotPlayCard(
  state: GameState,
  card: CardInstance,
  playerId: string,
  normalAction = false,
) {
  const definition = cardDefinition(state, card.cardId);
  return (
    (definition.kind === 'event' &&
      definition.cannotPlayFromHand === true &&
      card.zone === 'hand') ||
    (definition.kind === 'event' &&
      definition.playOnlyFirstAction === true &&
      (!normalAction ||
        state.phase !== 'action' ||
        (state.phaseHistory.actionsTaken[playerId] ?? 0) > 0)) ||
    cannotPlayNamedCard(state, card, playerId) ||
    state.playRestrictions.some(
      r =>
        r.playerId === playerId &&
        r.round === state.round &&
        r.phase === state.phase &&
        matchesCard(state, card, r.filter, { source: r.source }),
    )
  );
}

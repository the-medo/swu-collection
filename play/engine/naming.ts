import { cardTitle } from '../cards/catalog.ts';
import { cardDefinition } from '../cards/catalog.ts';
import { unitIsLeader } from './attributes.ts';
import { isUnit } from './attachments.ts';
import type { CardInstance, GameState } from './model.ts';
export function activeNamedEffects(state: GameState) {
  return state.namedEffects.filter(effect => {
    if (effect.expires.kind === 'phase')
      return effect.expires.round === state.round && effect.expires.phase === state.phase;
    const source = state.cards[effect.source.instanceId];
    return source && source.incarnation === effect.source.incarnation && isUnit(state, source);
  });
}
export function cannotPlayNamedCard(state: GameState, card: CardInstance, playerId: string) {
  return activeNamedEffects(state).some(
    e =>
      e.restriction === 'prevent-play' &&
      (e.appliesTo === 'each' || e.playerId !== playerId) &&
      e.name === cardTitle(state, card.cardId),
  );
}
export function namedAbilityLoss(state: GameState, card: CardInstance) {
  if (!state.namedEffects.length || cardDefinition(state, card.cardId).kind === 'leader')
    return false;
  const affected = activeNamedEffects(state).some(
    e =>
      e.restriction === 'lose-abilities' &&
      (e.appliesTo === 'each' || e.playerId !== card.owner) &&
      e.name === cardTitle(state, card.cardId),
  );
  // An upgrade imposing leader status has its own abilities. This does not
  // depend on the host retaining any abilities (v8 §3.6).
  return affected && !(isUnit(state, card) && unitIsLeader(state, card));
}

import { isUpgrade } from './roles.ts';
import { effectiveAbilities } from './effective-abilities.ts';
import { cardDefinition } from '../cards/catalog.ts';
import { attachedUpgrades, isUnit } from './attachments.ts';
import type { CardInstance, GameState } from './model.ts';
import { fact, reference } from './state.ts';
export function changeControl(state: GameState, card: CardInstance, playerId: string): boolean {
  if (
    (!isUnit(state, card) && !isUpgrade(state, card)) ||
    card.controller === playerId ||
    effectiveAbilities(state, card).cannotChangeController
  )
    return false;
  commitControl(state, card, playerId);
  return true;
}
function commitControl(state: GameState, card: CardInstance, playerId: string) {
  card.controller = playerId;
  for (const upgrade of attachedUpgrades(state, card)) {
    const definition = cardDefinition(state, upgrade.cardId);
    if (definition.kind === 'upgrade' && definition.token)
      upgrade.owner = upgrade.controller = playerId;
  }
  for (const attack of state.attacks)
    if (
      [attack.attacker, attack.defender].some(
        ref => ref.instanceId === card.instanceId && ref.incarnation === card.incarnation,
      ) &&
      !attack.removedFromCombat.some(
        ref => ref.instanceId === card.instanceId && ref.incarnation === card.incarnation,
      )
    )
      attack.removedFromCombat.push(reference(card));
  fact(state, 'control-changed', playerId, [card]);
  return true;
}

export function exchangeControl(state: GameState, first: CardInstance, second: CardInstance) {
  if (
    !isUnit(state, first) ||
    !isUnit(state, second) ||
    first.controller === second.controller ||
    effectiveAbilities(state, first).cannotChangeController ||
    effectiveAbilities(state, second).cannotChangeController
  )
    return false;
  const a = first.controller,
    b = second.controller;
  // Validate both before either change; continuous protection cannot split an exchange.
  commitControl(state, first, b);
  commitControl(state, second, a);
  return true;
}

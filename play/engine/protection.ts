import { matchesUnit } from './targets.ts';
import { attachedUpgrades, isUnit } from './attachments.ts';
import { effectiveAbilities, potentialAbilitySources } from './effective-abilities.ts';
import type { CardInstance, GameState } from './model.ts';

// Protection applies to the ability's controller, including captured/delayed sources.
// Lethal damage and rule-maintenance defeats do not pass an enemy ability source.
export function canAffectWithAbility(
  state: GameState,
  card: CardInstance,
  source: CardInstance | undefined,
  operation: 'defeat' | 'return-to-hand' | 'exhaust',
): boolean {
  if (
    operation !== 'exhaust' &&
    source &&
    source.controller !== card.controller &&
    card.attachedTo
  ) {
    const host = state.cards[card.attachedTo.instanceId];
    if (
      host &&
      host.incarnation === card.attachedTo.incarnation &&
      isUnit(state, host) &&
      host.controller === card.controller &&
      effectiveAbilities(state, host).protectSingleFriendlyUpgrade &&
      attachedUpgrades(state, host).filter(u => u.controller === host.controller).length === 1
    )
      return false;
  }
  if (source && source.controller !== card.controller && isUnit(state, card))
    for (const protector of potentialAbilitySources(state, 'unitProtection'))
      if (
        protector.controller === card.controller &&
        effectiveAbilities(state, protector).unitProtection?.some(
          p =>
            p.operations.some(op => op === operation) &&
            matchesUnit(state, card, protector.controller, p.filter, { source: protector }),
        )
      )
        return false;
  return (
    !source ||
    source.controller === card.controller ||
    !effectiveAbilities(state, card).enemyAbilityImmunity?.includes(operation)
  );
}

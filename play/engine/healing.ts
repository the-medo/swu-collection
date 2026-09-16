import { activeLasting } from './lasting.ts';
import { isUnit } from './attachments.ts';
import type { CardInstance, GameState } from './model.ts';
import { fact } from './state.ts';
import { abilitySources, collectTriggers } from './triggers.ts';
import { effectiveAbilities } from './effective-abilities.ts';
import { cardDefinition } from '../cards/catalog.ts';

// Call after removing the actual counters. Zero healing has no trigger event
// (v8 section 1.9.3); multi-point healing is one event for the affected unit.
export function recordHealing(
  state: GameState,
  actor: string,
  source: CardInstance,
  target: CardInstance,
  amount: number,
) {
  fact(state, 'healed', actor, [source, target], amount);
  if (amount > 0 && isUnit(state, target))
    collectTriggers(state, 'healed', [target], undefined, { values: { 'healed-amount': amount } });
}

export function healingAmount(state: GameState, target: CardInstance, amount: number) {
  return activeLasting(state, target).some(e => e.cannotHeal) ||
    (cardDefinition(state, target.cardId).kind === 'base' &&
      abilitySources(state).some(source => effectiveAbilities(state, source).preventBaseHealing))
    ? 0
    : Math.min(target.damage, Math.max(0, amount));
}

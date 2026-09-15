import type { AbilityCost } from '../cards/definition.ts';
import { abilityOrigins, originAbilities, potentialAbilitySources } from './effective-abilities.ts';
import type { GameState } from './model.ts';
// This changes the resources needed to satisfy a determined cost, not the cost
// itself. Discounts/aspect penalties are calculated before payment replacement.
export function resourcePayment(state: GameState, playerId: string, amount: number) {
  const count = potentialAbilitySources(state, 'halveResourcePayments')
    .filter(c => c.controller === playerId)
    .flatMap(c => abilityOrigins(state, c))
    .filter(o => !o.suppressed && originAbilities(state, o)?.halveResourcePayments).length;
  return Math.ceil(Math.max(0, amount) / 2 ** count);
}
export function abilityResourcePayment(
  state: GameState,
  playerId: string,
  costs: readonly (AbilityCost | { kind: 'defeat-friendly-unit' })[],
) {
  return costs.reduce(
    (n, c) => n + (c.kind === 'resources' ? resourcePayment(state, playerId, c.amount) : 0),
    0,
  );
}

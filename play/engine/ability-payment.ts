import { abilityResourcePayment } from './resource-payment.ts';
import { opponent } from './state.ts';
import { abilityCostSource } from './abilities.ts';
import { credits } from './credits.ts';
import { cannotReady } from './lasting.ts';
import { matchingUpgrades } from './upgrade-selection.ts';
import { abilitySpendingPower } from './credits.ts';
import type { ActionDefinition, ChosenCardCost } from '../cards/definition.ts';
import { cardDefinition } from '../cards/catalog.ts';
import { canPayAbilityCosts, canUseAbility, effectCostSource } from './abilities.ts';
import { effectiveAbilities } from './effective-abilities.ts';
import { matchesCard } from './inspection.ts';
import type { CardInstance, Frame, GameState, Intent } from './model.ts';
import { isToken } from './roles.ts';
import { instance } from './state.ts';
import { matchingUnits } from './targets.ts';

export function chosenCardCost(ability: ActionDefinition): ChosenCardCost | undefined {
  const costs = ability.costs.filter((c): c is ChosenCardCost =>
    [
      'discard-hand',
      'defeat-resource',
      'return-friendly-unit',
      'defeat-friendly-credit',
      'defeat-friendly-token',
      'exhaust-friendly-unit',
      'ready-enemy-unit',
      'defeat-friendly-upgrade',
    ].includes(c.kind),
  );
  if (costs.length > 1)
    throw new Error('Multiple chosen card costs require an explicit payment plan');
  return costs[0];
}
export function costCards(state: GameState, source: CardInstance, cost: ChosenCardCost) {
  const player = state.players[source.controller]!;
  if (cost.kind === 'defeat-friendly-credit') return credits(state, source.controller);
  if (cost.kind === 'ready-enemy-unit')
    return matchingUnits(state, source.controller, { controller: 'enemy', exhausted: true }).filter(
      c => !cannotReady(state, c),
    );
  if (cost.kind === 'defeat-friendly-upgrade')
    return matchingUpgrades(state, source.controller, { controller: 'friendly' }, { source });
  if (cost.kind === 'exhaust-friendly-unit')
    return matchingUnits(state, source.controller, { controller: 'friendly', exhausted: false });
  if (cost.kind === 'discard-hand')
    return player.hand
      .map(id => instance(state, id))
      .filter(c => matchesCard(state, c, cost.filter ?? {}, { source }));
  if (cost.kind === 'defeat-resource') return player.resources.map(id => instance(state, id));
  if (cost.kind === 'return-friendly-unit')
    return matchingUnits(state, source.controller, cost.filter, { source }).filter(
      c => c.controller === source.controller,
    );
  return Object.values(state.cards).filter(
    c =>
      c.controller === source.controller &&
      isToken(cardDefinition(state, c.cardId)) &&
      ['ground', 'space', 'base', 'resources'].includes(c.zone),
  );
}
export function costCardCount(cost: ChosenCardCost) {
  return cost.kind === 'discard-hand' ? cost.count : 1;
}
export function paymentAbility(state: GameState, frame: Frame, intent: Intent) {
  if (frame.kind === 'action' && intent.kind === 'use-ability') {
    const source = instance(state, intent.card);
    const ability = effectiveAbilities(state, source).actions?.find(a => a.id === intent.abilityId);
    return ability
      ? { source: abilityCostSource(source, ability, state.activePlayer), ability }
      : undefined;
  }
  if (frame.kind === 'effect' && frame.effect.kind === 'pay' && intent.kind === 'accept-effect') {
    const source = effectCostSource(
      state,
      frame.source,
      frame.effect.costs,
      frame.effect.player === 'enemy' ? opponent(state, frame.playerId) : frame.playerId,
    );
    return source
      ? {
          source,
          ability: {
            id: 'effect-payment',
            costs: frame.effect.costs,
            limit: null,
            effects: [],
          } satisfies ActionDefinition,
        }
      : undefined;
  }
  return undefined;
}
export function abilityPaymentSelection(
  state: GameState,
  frame: Extract<Frame, { kind: 'ability-payment' }>,
) {
  const payment = paymentAbility(state, frame.continuation, frame.intent);
  if (!payment) throw new Error('Missing payment ability');
  const cost = chosenCardCost(payment.ability);
  if (!cost) throw new Error('Missing chosen card cost');
  const count = costCardCount(cost);
  const resources = abilityResourcePayment(state, payment.source.controller, payment.ability.costs);
  return {
    cards: costCards(state, payment.source, cost)
      .filter(
        c =>
          !(
            cost.kind === 'exhaust-friendly-unit' &&
            payment.ability.costs.some(c => c.kind === 'exhaust-self') &&
            c.instanceId === payment.source.instanceId
          ) &&
          !(
            c.cardId === 'the-force' && payment.ability.costs.some(cost => cost.kind === 'force')
          ) &&
          abilitySpendingPower(state, payment.source, payment.ability, c) >= resources,
      )
      .map(c => c.instanceId),
    min: count,
    max: count,
  };
}
export function assertAbilityPayment(
  state: GameState,
  frame: Extract<Frame, { kind: 'ability-payment' }>,
) {
  const payment = paymentAbility(state, frame.continuation, frame.intent);
  if (
    !payment ||
    frame.playerId !== payment.source.controller ||
    JSON.stringify(frame.source) !== JSON.stringify(payment.source) ||
    !canPayAbilityCosts(state, payment.source, payment.ability)
  )
    throw new Error('Invalid ability payment');
  if (
    frame.continuation.kind === 'action' &&
    (frame.intent.kind !== 'use-ability' ||
      frame.intent.costTarget !== undefined ||
      frame.playerId !== state.activePlayer ||
      !canUseAbility(state, payment.source, payment.ability))
  )
    throw new Error('Unavailable ability activation');
  const selection = abilityPaymentSelection(state, frame);
  if (selection.cards.length < selection.min) throw new Error('Unavailable card payment');
}

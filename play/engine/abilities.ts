import type { CatalogContext } from '../cards/catalog.ts';
import { abilityResourcePayment } from './resource-payment.ts';
import { conditionMatches } from './conditions.ts';
import { abilityOrigins } from './effective-abilities.ts';
import { reference } from './state.ts';
import { chosenCardCost, costCardCount, costCards } from './ability-payment.ts';
import { nestedPlayIntents } from './play-options.ts';
import { numericValue } from './values.ts';
import { abilitySpendingPower, readyResourceCount } from './credits.ts';
import { forceToken, useForce } from './force.ts';

import type {
  Abilities,
  ActionDefinition,
  AbilityCost,
  CardDefinition,
  CardEffect,
} from '../cards/definition.ts';
import { cardDefinition } from '../cards/catalog.ts';

import type { CardInstance, GameState } from './model.ts';
import { isUnit } from './attachments.ts';
import { instance } from './state.ts';
import { upgradeProfile } from './roles.ts';

export function unitProfile(card: CardDefinition) {
  if (card.kind !== 'unit' && card.kind !== 'leader') throw new Error('Card has no unit profile');
  if (card.kind === 'leader' && !card.faces.unit) throw new Error('Leader has no unit face');
  return card.kind === 'leader' ? card.faces.unit! : card;
}
export function hitPoints(card: CardDefinition): number {
  return card.kind === 'upgrade'
    ? card.modifiers.hp
    : card.kind === 'base'
      ? card.hp
      : unitProfile(card).hp;
}
export function activeAbilities(state: CatalogContext, card: CardInstance): Abilities {
  const definition = cardDefinition(state, card.cardId);
  if (card.attachedTo) return upgradeProfile(definition) ?? {};
  if (definition.kind === 'leader' && card.leaderSide === 'back')
    return definition.faces.alternate ?? {};
  return definition.kind === 'leader'
    ? (definition.faces[card.zone === 'base' ? 'leader' : (card.deployedAs ?? 'leader')] ?? {})
    : definition;
}
export function deployCondition(
  state: GameState,
  actor: string,
  effect: Extract<CardEffect, { kind: 'deploy' }>,
): boolean {
  if (!effect.condition) return true;
  const reduction = effect.condition.reducedBy
    ? numericValue(
        state,
        { source: instance(state, state.players[actor]!.leader) },
        effect.condition.reducedBy,
      )
    : 0;
  return state.players[actor]!.resources.length >= Math.max(0, effect.condition.amount - reduction);
}

function totalCosts(ability: ActionDefinition) {
  let resources = 0,
    exhaustion = 0,
    force = 0,
    defeats = 0,
    discardDeck = 0,
    chosen = 0,
    baseDamage = 0;
  for (const cost of ability.costs) {
    switch (cost.kind) {
      case 'damage-own-base':
        if (!Number.isSafeInteger(cost.amount) || cost.amount <= 0)
          throw new Error('Invalid base damage cost');
        baseDamage += cost.amount;
        break;
      case 'discard-deck':
        discardDeck += cost.count;
        break;
      case 'discard-hand':
      case 'exhaust-friendly-unit':
      case 'ready-enemy-unit':
      case 'defeat-friendly-upgrade':
      case 'defeat-resource':
      case 'return-friendly-unit':
      case 'defeat-friendly-credit':
      case 'defeat-friendly-token':
        chosen++;
        break;
      case 'defeat-friendly-unit':
        defeats++;
        break;
      case 'force':
        force++;
        break;
      case 'resources':
        if (!Number.isSafeInteger(cost.amount) || cost.amount < 0)
          throw new Error('Invalid resource cost');
        resources += cost.amount;
        break;
      case 'exhaust-self':
        exhaustion++;
        break;
      default: {
        const unsupported: never = cost;
        throw new Error(`Unsupported ability cost: ${String(unsupported)}`);
      }
    }
  }
  return { resources, exhaustion, force, defeats, discardDeck, chosen, baseDamage };
}

export function sacrificeCandidates(state: GameState, source: CardInstance): CardInstance[] {
  return [...state.ground, ...state.space]
    .map(id => instance(state, id))
    .filter(c => isUnit(state, c) && c.controller === source.controller);
}
export function hasSacrificeCost(ability: ActionDefinition) {
  return ability.costs.some(c => c.kind === 'defeat-friendly-unit');
}

// Costs are checked in full before anything is paid. Resources used as payment
// stay in play; exhausting the source is a separate cost (v8 §6.4.3–4).
export function canPayAbilityCosts(
  state: GameState,
  card: CardInstance,
  ability: ActionDefinition,
  credit = 0,
): boolean {
  const { exhaustion, force, defeats, discardDeck, chosen } = totalCosts(ability);
  const resources = abilityResourcePayment(state, card.controller, ability.costs);
  const cost = chosenCardCost(ability);
  const cards = cost
    ? costCards(state, card, cost).filter(c => !(force && c.cardId === 'the-force'))
    : [];
  const payableCards = cards.filter(
    c =>
      !(exhaustion && cost?.kind === 'exhaust-friendly-unit' && c.instanceId === card.instanceId) &&
      abilitySpendingPower(state, card, ability, c) >= Math.max(0, resources - credit),
  );
  return (
    chosen <= 1 &&
    !(chosen && defeats) &&
    (!cost || payableCards.length >= costCardCount(cost)) &&
    state.players[card.controller]!.deck.length >= discardDeck &&
    defeats <= 1 &&
    (!defeats || sacrificeCandidates(state, card).length > 0) &&
    force <= 1 &&
    (!force || !!forceToken(state, card.controller)) &&
    exhaustion <= 1 &&
    (!exhaustion || !card.exhausted) &&
    abilitySpendingPower(state, card, ability) >= Math.max(0, resources - credit)
  );
}
export function actionUsage(state: GameState, card: CardInstance, ability: ActionDefinition) {
  const origin = abilityOrigins(state, card).find(
    o => o.id !== 'self' && ability.id.startsWith(`${o.id}-`),
  );
  return {
    source: reference(card),
    origin: reference(origin?.card ?? card),
    abilityId: ability.id,
  };
}
export function sameActionUsage(
  a: ReturnType<typeof actionUsage>,
  b: ReturnType<typeof actionUsage>,
) {
  return (
    a.source.instanceId === b.source.instanceId &&
    a.source.incarnation === b.source.incarnation &&
    a.origin.instanceId === b.origin.instanceId &&
    a.origin.incarnation === b.origin.incarnation &&
    a.abilityId === b.abilityId
  );
}
export function abilityCostSource(card: CardInstance, ability: ActionDefinition, actor: string) {
  return ability.anyPlayer && card.controller !== actor ? { ...card, controller: actor } : card;
}
export function canUseAbility(
  state: GameState,
  card: CardInstance,
  ability: ActionDefinition,
): boolean {
  if (
    ability.condition &&
    !conditionMatches(state, card.controller, ability.condition, { source: card })
  )
    return false;
  if (ability.limit === 'once-per-game' && (card.abilityUses[ability.id] ?? 0) > 0) return false;
  if (
    ability.limit &&
    typeof ability.limit === 'object' &&
    (card.abilityUses[ability.id] ?? 0) >= ability.limit.max
  )
    return false;
  if (
    ability.limit === 'once-per-round' &&
    state.roundHistory.actionUses.some(use =>
      sameActionUsage(use, actionUsage(state, card, ability)),
    )
  )
    return false;
  if (!canPayAbilityCosts(state, card, ability)) return false;
  if (
    ability.requiresPlayable &&
    !ability.effects.some(
      effect =>
        effect.kind === 'play-card' &&
        nestedPlayIntents(state, card.controller, effect, { source: card }).some(
          i => i.kind === 'play',
        ),
    )
  )
    return false;
  // Costs or consuming a usage limit can change state even if a conditional
  // effect does nothing (v8 §§6.4.0f, 7.2.4). Usage is recorded on activation.
  const cost = totalCosts(ability);
  if (
    ability.limit ||
    cost.exhaustion ||
    cost.resources ||
    cost.force ||
    cost.defeats ||
    cost.chosen ||
    cost.discardDeck ||
    cost.baseDamage
  )
    return true;
  return ability.effects.some(effect =>
    effect.kind === 'deploy'
      ? cardDefinition(state, card.cardId).kind === 'leader' &&
        card.deployedAs === null &&
        deployCondition(state, card.controller, effect)
      : effect.kind === 'play-card'
        ? nestedPlayIntents(state, card.controller, effect, { source: card }).some(
            i => i.kind === 'play',
          )
        : effect.kind === 'damage-bases' && effect.amount > 0,
  );
}
export function payAbilityCosts(
  state: GameState,
  card: CardInstance,
  ability: ActionDefinition,
  credit = 0,
  costTarget?: string,
  costSelections: string[] = [],
) {
  const chosen = chosenCardCost(ability);
  const candidates = chosen ? costCards(state, card, chosen) : [];
  if (
    (chosen?.kind === 'exhaust-friendly-unit' &&
      ability.costs.some(c => c.kind === 'exhaust-self') &&
      costSelections.includes(card.instanceId)) ||
    new Set(costSelections).size !== costSelections.length ||
    costSelections.length !== (chosen ? costCardCount(chosen) : 0) ||
    costSelections.some(id => !candidates.some(c => c.instanceId === id)) ||
    (ability.costs.some(c => c.kind === 'force') &&
      costSelections.some(id => instance(state, id).cardId === 'the-force'))
  )
    throw new Error('Invalid chosen card payment');
  const sacrifices = hasSacrificeCost(ability);
  const selected = costTarget
    ? sacrificeCandidates(state, card).find(c => c.instanceId === costTarget)
    : undefined;
  if (sacrifices ? !selected : costTarget !== undefined)
    throw new Error('Invalid sacrifice payment');
  if (!canPayAbilityCosts(state, card, ability, credit))
    throw new Error('Cannot pay ability costs');
  const { exhaustion, force } = totalCosts(ability);
  const amount = Math.max(
    0,
    abilityResourcePayment(state, card.controller, ability.costs) - credit,
  );
  if (readyResourceCount(state, card.controller) < amount) throw new Error('Unpaid resource cost');
  const resources = state.players[card.controller]!.resources.map(id => instance(state, id))
    .filter(card => !card.exhausted)
    .slice(0, amount);
  for (const resource of resources) resource.exhausted = true;
  if (exhaustion) card.exhausted = true;
  if (force) useForce(state, card.controller, card);
  return selected;
}

// Resource payments belong to the ability's controller even after its source
// leaves play. An exhaust-self payment still needs that exact source in play.
export function effectCostSource(
  state: GameState,
  source: CardInstance,
  costs: readonly AbilityCost[],
  payer = source.controller,
): CardInstance | undefined {
  if (!costs.some(c => c.kind === 'exhaust-self')) return { ...source, controller: payer };
  const current = state.cards[source.instanceId];
  return current &&
    current.incarnation === source.incarnation &&
    current.controller === payer &&
    (current.zone === 'base' || isUnit(state, current))
    ? current
    : undefined;
}

import { cardTraits } from './attributes.ts';
import { printedCost } from './inspection.ts';
import type { UpgradeFilter } from '../cards/definition.ts';
import { cardDefinition } from '../cards/catalog.ts';
import { isUpgrade, isToken } from './roles.ts';
import { boundReference, boundUnit, type EffectContext } from './bindings.ts';
import type { GameState } from './model.ts';
export function matchingUpgrades(
  state: GameState,
  playerId: string,
  filter: UpgradeFilter,
  context: EffectContext,
) {
  const same = filter.sameAs ? boundReference(context, filter.sameAs, state) : undefined;
  const host = filter.attachedTo ? boundUnit(state, context, filter.attachedTo) : undefined;
  const other = filter.otherThan ? boundReference(context, filter.otherThan, state) : undefined;
  return Object.values(state.cards).filter(
    card =>
      isUpgrade(state, card) &&
      (!filter.sameAs ||
        (same && card.instanceId === same.instanceId && card.incarnation === same.incarnation)) &&
      (!filter.withoutTrait || !cardTraits(state, card).includes(filter.withoutTrait)) &&
      (!filter.cardId || card.cardId === filter.cardId) &&
      (filter.maxCost === undefined || printedCost(state, card) <= filter.maxCost) &&
      (filter.token === undefined ||
        isToken(cardDefinition(state, card.cardId)) === filter.token) &&
      (!filter.controller ||
        (card.controller === playerId) === (filter.controller === 'friendly')) &&
      (!filter.nonLeader || cardDefinition(state, card.cardId).kind !== 'leader') &&
      (filter.unique === undefined ||
        !!cardDefinition(state, card.cardId).unique === filter.unique) &&
      (!filter.otherThan ||
        (other &&
          (card.instanceId !== other.instanceId || card.incarnation !== other.incarnation))) &&
      (!filter.attachedTo ||
        (host &&
          card.attachedTo?.instanceId === host.instanceId &&
          card.attachedTo.incarnation === host.incarnation)),
  );
}

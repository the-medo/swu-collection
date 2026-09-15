import { hasPrintedCost, printedCost } from './inspection.ts';
import type { InPlayFilter } from '../cards/definition.ts';
import { cardDefinition } from '../cards/catalog.ts';
import { cardTraits } from './attributes.ts';
import { isUnit } from './attachments.ts';
import { boundReference, type EffectContext } from './bindings.ts';
import type { Evaluation } from './evaluation.ts';
import type { GameState } from './model.ts';
import { isUpgrade } from './roles.ts';

// Count physical cards once across printed and current roles, never hidden zones.
export function matchingInPlayCards(
  state: GameState,
  playerId: string,
  filter: InPlayFilter,
  context: EffectContext,
  evaluation?: Evaluation,
) {
  const other = filter.otherThan && boundReference(context, filter.otherThan, state);
  return Object.values(state.cards).filter(
    card =>
      ['base', 'ground', 'space'].includes(card.zone) &&
      (card.controller === playerId) === (filter.controller === 'friendly') &&
      !(other && card.instanceId === other.instanceId && card.incarnation === other.incarnation) &&
      (!filter.costParity ||
        (hasPrintedCost(state, card) &&
          printedCost(state, card) % 2 === (filter.costParity === 'odd' ? 1 : 0))) &&
      (filter.unique === undefined ||
        !!cardDefinition(state, card.cardId).unique === filter.unique) &&
      (!filter.trait || cardTraits(state, card, evaluation).includes(filter.trait)) &&
      filter.roles.some(role =>
        role === 'unit'
          ? isUnit(state, card)
          : role === 'upgrade'
            ? isUpgrade(state, card)
            : cardDefinition(state, card.cardId).kind === 'leader',
      ),
  );
}

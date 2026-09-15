import { abilityOrigins, originAbilities, potentialAbilitySources } from './effective-abilities.ts';
import { cardDefinition } from '../cards/catalog.ts';
import { isUnit } from './attachments.ts';
import { evaluate, type Evaluation } from './evaluation.ts';
import { cardTraits, unitIsLeader } from './attributes.ts';
import type { CardInstance, GameState } from './model.ts';
export function grantedTraits(
  state: GameState,
  card: CardInstance,
  evaluation?: Evaluation,
): string[] {
  const inPlay = ['ground', 'space', 'base'].includes(card.zone);
  return potentialAbilitySources(state, 'traitGrants').flatMap(source => {
    const key = `trait-grants-${source.instanceId}-${source.incarnation}`;
    return (
      evaluate(evaluation, key, next =>
        abilityOrigins(state, source, next).flatMap(origin =>
          origin.suppressed
            ? []
            : (originAbilities(state, origin)?.traitGrants ?? []).flatMap(grant => {
                if ('leader' in grant)
                  return inPlay &&
                    card.controller === source.controller &&
                    (cardDefinition(state, card.cardId).kind === 'leader' ||
                      (isUnit(state, card) && unitIsLeader(state, card, next)))
                    ? [grant.trait]
                    : [];
                return (inPlay
                  ? isUnit(state, card) && card.controller === source.controller
                  : cardDefinition(state, card.cardId).kind === 'unit' &&
                    grant.outsidePlay &&
                    card.owner === source.controller) &&
                  cardTraits(state, card, next).includes(grant.fromTrait)
                  ? [grant.trait]
                  : [];
              }),
        ),
      ) ?? []
    );
  });
}

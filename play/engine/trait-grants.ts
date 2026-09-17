import { abilityOrigins, originAbilities, potentialAbilitySources } from './effective-abilities.ts';
import { activeAbilities } from './abilities.ts';
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
  const sources = potentialAbilitySources(state, 'traitGrants');
  // This explicit self ability also functions in hidden/out-of-play zones.
  if (
    !inPlay &&
    activeAbilities(state, card).traitGrants?.some(g => 'selfFromLeaders' in g && g.outsidePlay)
  )
    sources.push(card);
  return sources.flatMap(source => {
    const key = `trait-grants-${source.instanceId}-${source.incarnation}`;
    return (
      evaluate(evaluation, key, next =>
        abilityOrigins(state, source, next).flatMap(origin =>
          origin.suppressed
            ? []
            : (originAbilities(state, origin)?.traitGrants ?? []).flatMap(grant => {
                if ('selfFromLeaders' in grant) {
                  if (source.instanceId !== card.instanceId || (!inPlay && !grant.outsidePlay))
                    return [];
                  const controller = inPlay ? card.controller : card.owner;
                  return Object.values(state.cards).flatMap(leader =>
                    leader.controller === controller &&
                    ['base', 'ground', 'space'].includes(leader.zone) &&
                    (cardDefinition(state, leader.cardId).kind === 'leader' ||
                      (isUnit(state, leader) && unitIsLeader(state, leader, next)))
                      ? cardTraits(state, leader, next).filter(
                          trait => !grant.except.includes(trait),
                        )
                      : [],
                  );
                }
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

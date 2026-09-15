import { activeLasting } from './lasting.ts';
import { conditionMatches } from './conditions.ts';
import { evaluate } from './evaluation.ts';
import { grantedTraits } from './trait-grants.ts';
import { cardPrintedTraits } from './identity.ts';
import { cardDefinition } from '../cards/catalog.ts';
import { attachedUpgrades, isUnit } from './attachments.ts';
import { abilityOrigins } from './effective-abilities.ts';
import type { Evaluation } from './evaluation.ts';
import type { CardInstance, CardReference, GameState } from './model.ts';
import { upgradeProfile } from './roles.ts';
function activeUpgrade(state: GameState, card: CardInstance, evaluation?: Evaluation) {
  return abilityOrigins(state, card, evaluation).some(o => o.id === 'self' && !o.suppressed);
}
// These attributes are imposed by the upgrade itself. Losing the host's
// abilities does not remove its leader status or a granted trait.
export function unitIsLeader(
  state: GameState,
  ref: CardReference,
  evaluation?: Evaluation,
): boolean {
  const card = state.cards[ref.instanceId];
  if (card && card.incarnation === ref.incarnation && isUnit(state, card))
    return (
      cardDefinition(state, card.cardId).kind === 'leader' ||
      attachedUpgrades(state, card).some(
        u =>
          upgradeProfile(cardDefinition(state, u.cardId))?.hostIsLeader &&
          activeUpgrade(state, u, evaluation),
      )
    );
  return (
    state.departedUnits.find(
      e => e.reference.instanceId === ref.instanceId && e.reference.incarnation === ref.incarnation,
    )?.leaderUnit ?? false
  );
}
export function cardTraits(
  state: GameState,
  ref: CardReference,
  evaluation?: Evaluation,
  lastKnown = false,
): readonly string[] {
  const card = state.cards[ref.instanceId];
  if (card && card.incarnation === ref.incarnation && isUnit(state, card))
    return [
      ...new Set([
        ...cardPrintedTraits(state, card),
        ...grantedTraits(state, card, evaluation),
        ...attachedUpgrades(state, card).flatMap(u => {
          if (!activeUpgrade(state, u, evaluation)) return [];
          const profile = upgradeProfile(cardDefinition(state, u.cardId));
          return [
            ...(profile?.hostTraits ?? []),
            ...(profile?.conditionalHostTraits ?? []).flatMap((grant, index) =>
              evaluate(evaluation, `host-traits:${u.instanceId}:${u.incarnation}:${index}`, next =>
                conditionMatches(state, card.controller, grant.condition, { source: card }, next),
              )
                ? [...grant.traits]
                : [],
            ),
          ];
        }),
      ]),
    ].filter(
      trait =>
        !activeLasting(state, card).some(e => e.loseTraits?.includes(trait)) &&
        !attachedUpgrades(state, card).some(
          u =>
            upgradeProfile(cardDefinition(state, u.cardId))?.hostLosesTraits?.includes(trait) &&
            activeUpgrade(state, u, evaluation),
        ),
    );
  if (!lastKnown && card && card.incarnation === ref.incarnation)
    return [
      ...new Set([...cardPrintedTraits(state, ref), ...grantedTraits(state, card, evaluation)]),
    ];
  return (
    (lastKnown
      ? state.departedUnits.find(
          e =>
            e.reference.instanceId === ref.instanceId &&
            e.reference.incarnation === ref.incarnation,
        )?.traits
      : undefined) ?? cardPrintedTraits(state, ref)
  );
}

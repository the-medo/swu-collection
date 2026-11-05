import { cardDefinition } from '../cards/catalog.ts';
import { effectiveAbilities, potentialAbilitySources } from './effective-abilities.ts';
import { matchesCard } from './inspection.ts';
import { namedAbilityLoss } from './naming.ts';
import { smuggleOptions } from './smuggle.ts';
import { matchingUnits } from './targets.ts';
import type { CardInstance, GameState, Intent } from './model.ts';

export function replacementCostCards(
  state: GameState,
  card: CardInstance,
  actor: string,
  using?: 'plot' | 'smuggle',
) {
  const definition = cardDefinition(state, card.cardId);
  if (
    using ||
    definition.kind !== 'event' ||
    !definition.alternateDiscardCost ||
    namedAbilityLoss(state, card)
  )
    return [];
  return state.players[actor]!.hand.map(id => state.cards[id]!).filter(
    candidate =>
      candidate.instanceId !== card.instanceId &&
      matchesCard(state, candidate, definition.alternateDiscardCost!, {
        playerId: actor,
        source: card,
      }),
  );
}
export function additionalPlayCosts(
  state: GameState,
  card: CardInstance,
  intent: Extract<Intent, { kind: 'play' }>,
) {
  const unitDamage = intent.smuggle
    ? (smuggleOptions(state, card).find(option => option.id === intent.smuggle)
        ?.damageFriendlyUnit ?? 0)
    : 0;
  const baseCosts =
    cardDefinition(state, card.cardId).kind === 'event'
      ? potentialAbilitySources(state, 'enemyEventPlayDamage')
          .filter(source => source.controller !== card.controller)
          .flatMap(source => {
            const amount = effectiveAbilities(state, source).enemyEventPlayDamage ?? 0;
            return amount ? [{ source: structuredClone(source), amount }] : [];
          })
      : [];
  return unitDamage || baseCosts.length ? { unitDamage, baseCosts } : undefined;
}
export function additionalCostUnits(state: GameState, actor: string) {
  return matchingUnits(state, actor, { controller: 'friendly' });
}

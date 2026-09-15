import type { Evaluation } from './evaluation.ts';
import { cardDefinition } from '../cards/catalog.ts';
import type { Aspect } from '../cards/definition.ts';
import {
  effectiveAbilities,
  mayHaveAbility,
  potentialAbilitySources,
} from './effective-abilities.ts';
import { cannotGainKeywords } from './lasting.ts';
import type { CardInstance, GameState } from './model.ts';
import { isToken } from './roles.ts';

export type SmuggleOption = {
  id: string;
  cost: number;
  aspects: readonly Aspect[];
  source?: CardInstance;
};

// A resource can have several independent Smuggle costs. Printed costs survive
// entering play; a grant to resources ceases when the card leaves that zone.
export function smuggleOptions(
  state: GameState,
  card: CardInstance,
  evaluation?: Evaluation,
): SmuggleOption[] {
  const definition = cardDefinition(state, card.cardId);
  if (isToken(definition) || !('cost' in definition) || cannotGainKeywords(state, card)) return [];
  const options: SmuggleOption[] = mayHaveAbility(state, card, 'smuggle')
    ? [...(effectiveAbilities(state, card, evaluation).smuggle ?? [])]
    : [];
  if (card.zone === 'resources')
    for (const source of potentialAbilitySources(state, 'resourceSmuggle')) {
      if (source.controller !== card.controller) continue;
      for (const [index, increase] of (
        effectiveAbilities(state, source, evaluation).resourceSmuggle ?? []
      ).entries())
        options.push({
          id: `resource-${source.instanceId}-${source.incarnation}-${index}`,
          cost: definition.cost + increase,
          aspects: definition.aspects,
          source,
        });
    }
  return options;
}

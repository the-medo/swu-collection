import { cardDefinition } from '../cards/catalog.ts';
import { boundUnit } from './bindings.ts';
import type { AbilityOrigin, Frame, GameState } from './model.ts';
import { simpleAbilitiesSchema } from './model.ts';

// Pure templates are also used while checking declaration restrictions. IDs are
// allocated only after an attack is accepted, never while generating choices.
export function attackEffectOrigins(
  state: GameState,
  frame: Extract<Frame, { kind: 'effect' }>,
): AbilityOrigin[] {
  const effect = frame.effect;
  if (effect.kind !== 'attack-bound') return [];
  const copied = effect.gainsAbilitiesOf
    ? boundUnit(state, frame, effect.gainsAbilitiesOf)
    : undefined;
  const origins: AbilityOrigin[] =
    copied && copied.zone === 'discard' && cardDefinition(state, copied.cardId).kind === 'unit'
      ? [
          {
            id: 'discarded-unit',
            card: structuredClone(copied),
            profile: 'discarded-unit',
            withoutSupport: false,
          },
        ]
      : [];
  if (effect.abilities)
    origins.push({
      id: 'effect-abilities',
      card: structuredClone(frame.source),
      profile: 'lasting',
      withoutSupport: false,
      abilities: simpleAbilitiesSchema.parse(effect.abilities),
    });
  return origins;
}

import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-effects.json.
export const jTypeNubianStarship = {
  cardId: 'j-type-nubian-starship',
  name: 'J-Type Nubian Starship',
  kind: 'unit',
  aspects: ['Cunning', 'Heroism'],
  traits: ['Naboo', 'Vehicle', 'Transport'],
  cost: 3,
  power: 2,
  hp: 4,
  arena: 'space',
  triggers: [
    {
      id: 'when-played',
      timing: 'played',
      effects: [
        {
          kind: 'draw-cards',
          amount: 1,
        },
      ],
    },
    {
      id: 'when-defeated',
      timing: 'defeated',
      effects: [
        {
          kind: 'inspect-zone',
          zone: 'hand',
          player: 'self',
          chooser: 'owner',
          filter: {},
          min: 1,
          max: 1,
          bind: 'discarded',
          effects: [
            {
              kind: 'move-card',
              target: 'discarded',
              from: 'hand',
              to: 'discard',
              discardBy: 'owner',
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;

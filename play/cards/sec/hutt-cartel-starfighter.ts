import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-effects.json.
export const huttCartelStarfighter = {
  cardId: 'hutt-cartel-starfighter',
  name: 'Hutt Cartel Starfighter',
  kind: 'unit',
  aspects: ['Villainy'],
  traits: ['Underworld', 'Vehicle', 'Fighter'],
  cost: 3,
  power: 3,
  hp: 5,
  arena: 'space',
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'on-unit',
          target: 'source',
          operation: {
            kind: 'damage',
            amount: 2,
          },
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;

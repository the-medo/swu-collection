import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in ash-effects.json.
export const helixStarfighter = {
  cardId: 'helix-starfighter',
  name: 'Helix Starfighter',
  kind: 'unit',
  aspects: ['Cunning'],
  traits: ['Underworld', 'Vehicle', 'Fighter'],
  cost: 4,
  power: 3,
  hp: 3,
  arena: 'space',
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'if',
          condition: {
            kind: 'units-at-least',
            filter: {
              controller: 'enemy',
              arena: 'space',
            },
            amount: 1,
          },
          effects: [
            {
              kind: 'on-unit',
              target: 'source',
              operation: {
                kind: 'give-token',
                token: 'shield',
                count: 1,
              },
            },
          ],
          otherwise: [
            {
              kind: 'on-unit',
              target: 'source',
              operation: {
                kind: 'give-token',
                token: 'advantage',
                count: 2,
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;

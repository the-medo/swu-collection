import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 phase history and tokens fixture.
export const guerillaSoldier = {
  cardId: 'guerilla-soldier',
  name: 'Guerilla Soldier',
  kind: 'unit',
  aspects: ['Cunning'],
  traits: ['Fringe', "Twi'lek", 'Trooper'],
  cost: 3,
  power: 2,
  hp: 3,
  arena: 'ground',
  triggers: [
    {
      id: 'indirect-ready',
      timing: 'played',
      effects: [
        {
          kind: 'indirect-damage',
          amount: 3,
          recipient: 'chosen',
          after: [
            {
              kind: 'if',
              condition: {
                kind: 'value-at-least',
                name: 'base-damage',
                amount: 1,
              },
              effects: [
                {
                  kind: 'on-unit',
                  target: 'source',
                  operation: {
                    kind: 'ready',
                  },
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
